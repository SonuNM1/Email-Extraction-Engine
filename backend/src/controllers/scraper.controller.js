import Job from "../models/job.model.js";
import { searchLocation } from "../services/google.service.js";
import { extractEmailsFromUrls } from "../services/emailExtractor.service.js";
import { LOCATIONS } from "../config/locations.js";
import { createObjectCsvStringifier } from "csv-writer";
import { sendJobCompleteEmail } from "../services/mailer.service.js";
import webpush from "web-push";
import { filterLinks } from "../utils/filterLinks.js";
import { createWorkbook, finalizeWorkbook } from "../services/excel.service.js";
import { getBus, destroyBus, logToJob } from "../services/logBus.js";
import { chromium } from "playwright";

const LOCATION_CONCURRENCY = 4;

export async function startScrape(req, res) {
  const { keyword, email, pushSubscription } = req.body;
  if (!keyword) return res.status(400).json({ error: "keyword is required" });

  const job = await Job.create({
    keyword,
    notifyEmail: email || null,
    pushSubscription: pushSubscription || null,
    status: "pending",
    progress: { completed: 0, total: LOCATIONS.length, currentLocation: "" },
    locations: LOCATIONS.map((name) => ({
      name,
      status: "pending",
      emailsFound: 0,
    })),
    emails: [],
    startedAt: new Date(),
  });

  res.json({ jobId: job._id, message: "Scrape started" });

  runScrapeJob(job._id, keyword).catch((err) => {
    console.error("Scrape job crashed:", err);
    Job.findByIdAndUpdate(job._id, { status: "failed" }).exec();
  });
}

async function runScrapeJob(jobId, keyword) {
  const browser = await chromium.launch({ headless: true });

  await Job.findByIdAndUpdate(jobId, { status: "running" });
  logToJob(jobId, `🚀 Job started for keyword: "${keyword}"`);

  // ✅ Create ONE workbook for the entire job up front

  const { workbook, sheet, filePath } = createWorkbook(keyword);
  logToJob(jobId, `📁 Excel file created: ${filePath}`);

  const job = await Job.findById(jobId);
  const locations = job.locations.filter((l) => l.status === "pending");

  const globalSeenEmails = new Set();

  for (let i = 0; i < locations.length; i += LOCATION_CONCURRENCY) {
    const batch = locations.slice(i, i + LOCATION_CONCURRENCY);
    await Promise.all(
      batch.map((locEntry) =>
        processLocation(
          jobId,
          keyword,
          locEntry.name,
          sheet,
          globalSeenEmails,
          browser,
        ),
      ),
    );
  }

  // ✅ Finalize (close) the workbook only after all locations are done

  await finalizeWorkbook(workbook);

  await browser.close();

  logToJob(jobId, `✅ Excel finalized at: ${filePath}`);

  const finalJob = await Job.findByIdAndUpdate(
    jobId,
    { status: "completed", completedAt: new Date() },
    { new: true },
  );

  logToJob(
    jobId,
    `🎉 Job complete — ${finalJob.emails.length} total emails found`,
  );
  destroyBus(jobId);

  console.log("Reached email section");

  if (finalJob.notifyEmail) {
    console.log("📧 Sending email to:", finalJob.notifyEmail);

    await sendJobCompleteEmail(
      finalJob.notifyEmail,
      jobId,
      keyword,
      finalJob.emails.length,
    ).catch((err) => console.error("Email failed:", err.message));
  }

  if (finalJob.pushSubscription) {
    await webpush
      .sendNotification(
        finalJob.pushSubscription,
        JSON.stringify({
          title: "Scrape Complete!",
          body: `Found ${finalJob.emails.length} emails for "${keyword}".`,
          url: `${process.env.FRONTEND_URL}?jobId=${jobId}`,
        }),
      )
      .catch((err) => console.error("Push failed:", err.message));
  }
}

async function processLocation(
  jobId,
  keyword,
  location,
  sheet,
  globalSeenEmails,
  browser,
) {
  await Job.updateOne(
    { _id: jobId, "locations.name": location },
    {
      $set: {
        "locations.$.status": "running",
        "progress.currentLocation": location,
      },
    },
  );

  logToJob(jobId, `\n🔍 Processing: ${location}`);

  try {
    const rawUrls = await searchLocation(keyword, location);
    const filteredUrls = filterLinks(rawUrls);

    logToJob(
      jobId,
      `[${location}] ${rawUrls.length} raw → ${filteredUrls.length} filtered`,
    );

    // ✅ pass sheet down so emails write immediately to the shared workbook

    const results = await extractEmailsFromUrls(
      filteredUrls,
      keyword,
      location,
      jobId,
      sheet,
      globalSeenEmails,
      browser,
    );

    // ✅ results is now [{email, website}] objects — matches emailSchema exactly

    const emailDocs = results.map(({ email, website }) => ({
      email,
      website,
      location,
      keyword,
    }));

    await Job.updateOne(
      { _id: jobId, "locations.name": location },
      {
        $set: {
          "locations.$.status": "done",
          "locations.$.emailsFound": results.length,
        },
        $push: { emails: { $each: emailDocs } },
        $inc: { "progress.completed": 1 },
      },
    );

    logToJob(jobId, `✅ [${location}] done — ${results.length} emails saved`);
  } catch (err) {
    console.error(`Failed ${location}:`, err.message);
    logToJob(jobId, `❌ [${location}] failed: ${err.message}`);

    await Job.updateOne(
      { _id: jobId, "locations.name": location },
      {
        $set: { "locations.$.status": "failed" },
        $inc: { "progress.completed": 1 },
      },
    );
  }
}

export async function getStatus(req, res) {
  const job = await Job.findById(
    req.params.jobId,
    "status progress locations keyword emails",
  );
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json({ ...job.toObject(), totalEmailsFound: job.emails.length });
}

export async function exportCsv(req, res) {
  const job = await Job.findById(req.params.jobId, "emails keyword");
  if (!job) return res.status(404).json({ error: "Job not found" });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${job.keyword}-emails.csv"`,
  );

  const csvWriter = createObjectCsvStringifier({
    header: [
      { id: "email", title: "email" },
      { id: "website", title: "website" },
      { id: "location", title: "location" },
      { id: "keyword", title: "keyword" },
    ],
  });

  res.write(csvWriter.getHeaderString());
  res.write(csvWriter.stringifyRecords(job.emails));
  res.end();
}

// ✅ SSE endpoint — streams live logs to frontend

export function streamLogs(req, res) {
  const { jobId } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Send a heartbeat immediately so the browser knows it's connected
  res.write(`data: ${JSON.stringify("🔌 Connected to log stream")}\n\n`);

  const bus = getBus(jobId);
  const onLog = (msg) => res.write(`data: ${JSON.stringify(msg)}\n\n`);
  bus.on("log", onLog);

  req.on("close", () => {
    bus.off("log", onLog);
  });
}
