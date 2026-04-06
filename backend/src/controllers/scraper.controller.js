import Job from "../models/job.model.js";
import { searchLocation } from "../services/google/search.service.js";
import { searchMapsLocation } from "../services/google/maps.service.js";
import { extractEmailsFromUrls } from "../services/extractor/emailExtractor.js";
import { extractEmailsFromMapsResults } from "../services/extractor/mapsEmailExtractor.js";
import { getBrowser, closeBrowser } from "../services/extractor/fetch.service.js";
import { LOCATIONS } from "../config/locations.js";
import { createObjectCsvStringifier } from "csv-writer";
import { sendJobCompleteEmail } from "../services/mailer.service.js";
import webpush from "web-push";
import { createWorkbook, finalizeWorkbook } from "../services/excel.service.js";
import { getBus, destroyBus, logToJob } from "../services/logBus.js";

const LOCATION_CONCURRENCY = 3; // reduced slightly — maps adds more load per location

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
      mapsEmailsFound: 0, // track maps separately
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
  await Job.findByIdAndUpdate(jobId, { status: "running" });
  logToJob(jobId, `🚀 Job started for keyword: "${keyword}"`);

  const { workbook, sheet, filePath } = createWorkbook(keyword);
  logToJob(jobId, `📁 Excel file created: ${filePath}`);

  const browser = await getBrowser();
  logToJob(jobId, `🌐 Browser initialized`);

  const job = await Job.findById(jobId);
  const locations = job.locations.filter((l) => l.status === "pending");
  const globalSeenEmails = new Set();

  for (let i = 0; i < locations.length; i += LOCATION_CONCURRENCY) {
    const batch = locations.slice(i, i + LOCATION_CONCURRENCY);
    logToJob(jobId, `\n📦 Processing batch ${Math.floor(i/LOCATION_CONCURRENCY)+1}: ${batch.map(l=>l.name).join(", ")}`);

    await Promise.all(
      batch.map((locEntry) =>
        processLocation(jobId, keyword, locEntry.name, sheet, globalSeenEmails, browser)
      )
    );
  }

  await finalizeWorkbook(workbook);
  await closeBrowser();
  logToJob(jobId, `✅ Excel finalized at: ${filePath}`);

  const finalJob = await Job.findByIdAndUpdate(
    jobId,
    { status: "completed", completedAt: new Date() },
    { returnDocument: "after" }
  );

  // Count maps vs search emails
  const mapsEmails = finalJob.emails.filter(e => e.source === "google_maps").length;
  const searchEmails = finalJob.emails.length - mapsEmails;

  logToJob(jobId, `\n🎉 Job complete!`);
  logToJob(jobId, `📊 Total emails: ${finalJob.emails.length}`);
  logToJob(jobId, `   🗺️  From Google Maps: ${mapsEmails}`);
  logToJob(jobId, `   🔍 From Google Search: ${searchEmails}`);

  destroyBus(jobId);

  if (finalJob.notifyEmail) {
    await sendJobCompleteEmail(finalJob.notifyEmail, jobId, keyword, finalJob.emails.length)
      .catch((err) => console.error("Email failed:", err.message));
  }

  if (finalJob.pushSubscription) {
    await webpush
      .sendNotification(
        finalJob.pushSubscription,
        JSON.stringify({
          title: "Scrape Complete!",
          body: `Found ${finalJob.emails.length} emails (${mapsEmails} from Maps) for "${keyword}".`,
          url: `${process.env.FRONTEND_URL}?jobId=${jobId}`,
        })
      )
      .catch((err) => console.error("Push failed:", err.message));
  }
}

async function processLocation(jobId, keyword, location, sheet, globalSeenEmails, browser) {
  await Job.updateOne(
    { _id: jobId, "locations.name": location },
    { $set: { "locations.$.status": "running", "progress.currentLocation": location } }
  );

  logToJob(jobId, `\n${"─".repeat(50)}`);
  logToJob(jobId, `📍 Starting: ${location}`);

  let searchResults = [];
  let mapsResults = [];

  try {
    // ── Step 1: Google Search ──────────────────────────────
    logToJob(jobId, `🔍 [${location}] Running Google Search...`);
    const searchUrls = await searchLocation(keyword, location);
    logToJob(jobId, `🔍 [${location}] Search found ${searchUrls.length} domains`);

    searchResults = await extractEmailsFromUrls(
      searchUrls, keyword, location, jobId, sheet, globalSeenEmails, browser
    );
    logToJob(jobId, `🔍 [${location}] Search extracted: ${searchResults.length} emails`);

    // ── Step 2: Google Maps ────────────────────────────────
    logToJob(jobId, `🗺️  [${location}] Running Google Maps search...`);
    const mapsListings = await searchMapsLocation(keyword, location);
    logToJob(jobId, `🗺️  [${location}] Maps found ${mapsListings.length} business listings`);

    mapsResults = await extractEmailsFromMapsResults(
      mapsListings, keyword, location, jobId, sheet, globalSeenEmails, browser
    );
    logToJob(jobId, `🗺️  [${location}] Maps extracted: ${mapsResults.length} emails`);

    // ── Step 3: Save everything to DB ─────────────────────
    const allResults = [...searchResults, ...mapsResults];
    const emailDocs = allResults.map(({ email, website, source, businessName, phone, address }) => ({
      email,
      website,
      location,
      keyword,
      source: source || "google_search",
      businessName: businessName || "",
      phone: phone || "",
      address: address || "",
    }));

    await Job.updateOne(
      { _id: jobId, "locations.name": location },
      {
        $set: {
          "locations.$.status": "done",
          "locations.$.emailsFound": searchResults.length,
          "locations.$.mapsEmailsFound": mapsResults.length,
        },
        $push: { emails: { $each: emailDocs } },
        $inc: { "progress.completed": 1 },
      }
    );

    logToJob(jobId, `✅ [${location}] DONE — Search: ${searchResults.length} | Maps: ${mapsResults.length} | Total: ${allResults.length}`);

  } catch (err) {
    console.error(`Failed ${location}:`, err.message);
    logToJob(jobId, `❌ [${location}] failed: ${err.message}`);
    await Job.updateOne(
      { _id: jobId, "locations.name": location },
      { $set: { "locations.$.status": "failed" }, $inc: { "progress.completed": 1 } }
    );
  }
}

export async function getStatus(req, res) {
  const job = await Job.findById(req.params.jobId, "status progress locations keyword emails");
  if (!job) return res.status(404).json({ error: "Job not found" });

  const mapsCount = job.emails.filter(e => e.source === "google_maps").length;
  const searchCount = job.emails.length - mapsCount;

  res.json({
    ...job.toObject(),
    totalEmailsFound: job.emails.length,
    mapsEmailsFound: mapsCount,
    searchEmailsFound: searchCount,
  });
}

export async function exportCsv(req, res) {
  const job = await Job.findById(req.params.jobId, "emails keyword");
  if (!job) return res.status(404).json({ error: "Job not found" });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${job.keyword}-emails.csv"`);

  const csvWriter = createObjectCsvStringifier({
    header: [
      { id: "email",        title: "email" },
      { id: "website",      title: "website" },
      { id: "businessName", title: "business_name" },
      { id: "phone",        title: "phone" },
      { id: "address",      title: "address" },
      { id: "location",     title: "location" },
      { id: "keyword",      title: "keyword" },
      { id: "source",       title: "source" },
    ],
  });

  res.write(csvWriter.getHeaderString());
  res.write(csvWriter.stringifyRecords(job.emails));
  res.end();
}

export function streamLogs(req, res) {
  const { jobId } = req.params;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  res.write(`data: ${JSON.stringify("🔌 Connected to log stream")}\n\n`);

  const bus = getBus(jobId);
  const onLog = (msg) => res.write(`data: ${JSON.stringify(msg)}\n\n`);
  bus.on("log", onLog);
  req.on("close", () => bus.off("log", onLog));
}