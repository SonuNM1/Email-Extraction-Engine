import Job from "../models/job.model.js";
import {
  searchLocation,
  serperCredits,
} from "../services/google/search.service.js";
import { searchMapsLocation } from "../services/google/maps.service.js";
import { extractEmailsFromUrls } from "../services/extractor/emailExtractor.js";
import { extractEmailsFromMapsResults } from "../services/extractor/mapsEmailExtractor.js";
import { createObjectCsvStringifier } from "csv-writer";
import { createWorkbook, finalizeWorkbook } from "../services/excel.service.js";
import { getBus, destroyBus, logToJob } from "../services/logBus.js";
import fs from "fs";
import path from "path";

const stopRequested = new Set();

export async function startScrape(req, res) {
  const { keyword, location, serperKey } = req.body;
  if (!keyword) return res.status(400).json({ error: "keyword is required" });
  if (!location) return res.status(400).json({ error: "location is required" });

  const apiKey = serperKey?.trim() || process.env.SERPER_API_KEY;
  if (!apiKey)
    return res.status(400).json({ error: "No Serper API key provided" });

  const job = await Job.create({
    keyword,
    location,
    status: "pending",
    emails: [],
    emailsFound: 0,
    serperCreditsUsed: 0,
    startedAt: new Date(),
  });

  res.json({ jobId: job._id, message: "Scrape started" });

  runScrapeJob(job._id, keyword, location, apiKey).catch((err) => {
    console.error("Scrape job crashed:", err);
    Job.findByIdAndUpdate(job._id, { status: "failed" }).exec();
  });
}

export async function stopScrape(req, res) {
  const { jobId } = req.params;
  const job = await Job.findById(jobId, "status");
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (job.status !== "running")
    return res.status(400).json({ error: "Job is not running" });
  stopRequested.add(jobId.toString());
  logToJob(jobId, `⏹️  Stop requested...`);
  res.json({ message: "Stop signal sent" });
}

async function runScrapeJob(jobId, keyword, location, apiKey) {
  serperCredits.used = 0;
  serperCredits.exhausted = false;
  stopRequested.delete(jobId.toString());

  await Job.findByIdAndUpdate(jobId, { status: "running" });
  logToJob(jobId, `🚀 Job started — "${keyword}" in ${location}`);

  const { workbook, sheet, filePath } = createWorkbook(keyword, location);
  await Job.findByIdAndUpdate(jobId, { filePath });
  logToJob(jobId, `📁 File: ${filePath}`);

  const globalSeenEmails = new Set();
  let wasStopped = false;

  try {
    if (stopRequested.has(jobId.toString())) {
      wasStopped = true;
    } else {
      const [searchUrls, mapsListings] = await Promise.all([
        searchLocation(keyword, location, apiKey),
        searchMapsLocation(keyword, location, apiKey),
      ]);

      logToJob(
        jobId,
        `🔍 ${searchUrls.length} domains | 🗺️ ${mapsListings.length} maps listings`,
      );

      if (!stopRequested.has(jobId.toString())) {
        const mapsSeenEmails = new Set(); // ← separate set, Maps runs independently
        await Promise.all([
          extractEmailsFromUrls(
            searchUrls,
            keyword,
            location,
            jobId,
            sheet,
            globalSeenEmails,
          ),
          extractEmailsFromMapsResults(
            mapsListings,
            keyword,
            location,
            jobId,
            sheet,
            mapsSeenEmails,
          ),
        ]);
      } else {
        wasStopped = true;
      }
    }
  } catch (err) {
    logToJob(jobId, `❌ Error: ${err.message}`);
  }

  // Always finalize Excel — this is what makes the file valid
  try {
    await finalizeWorkbook(workbook);
    logToJob(jobId, `✅ Excel saved: ${filePath}`);
  } catch (err) {
    logToJob(jobId, `⚠️ Excel finalize error: ${err.message}`);
  }

  const finalStatus = wasStopped ? "stopped" : "completed";
  const finalJob = await Job.findByIdAndUpdate(
    jobId,
    {
      status: finalStatus,
      completedAt: new Date(),
      stoppedAt: wasStopped ? new Date() : null,
      serperCreditsUsed: serperCredits.used,
      creditsExhausted: serperCredits.exhausted,
    },
    { returnDocument: "after" },
  );

  stopRequested.delete(jobId.toString());

  logToJob(
    jobId,
    `\n🎉 ${finalStatus}! Emails: ${finalJob.emails.length} | Credits: ${serperCredits.used}`,
  );
  destroyBus(jobId);
}

export async function getStatus(req, res) {
  const job = await Job.findById(
    req.params.jobId,
    "status keyword location emails emailsFound serperCreditsUsed filePath creditsExhausted stoppedAt startedAt completedAt",
  );
  if (!job) return res.status(404).json({ error: "Job not found" });

  const isTerminal = ["completed", "stopped", "failed"].includes(job.status);
  res.json({
    ...job.toObject(),
    totalEmailsFound: isTerminal ? job.emails.length : job.emailsFound,
    serperCreditsUsed: job.serperCreditsUsed ?? 0,
  });
}

export async function downloadExcel(req, res) {
  const job = await Job.findById(
    req.params.jobId,
    "filePath keyword location status emails",
  );
  if (!job) return res.status(404).json({ error: "Job not found" });

  // If file missing or job was interrupted, rebuild from MongoDB
  let filePath = job.filePath;
  if (!filePath || !fs.existsSync(filePath)) {
    if (!job.emails?.length)
      return res.status(404).json({ error: "No data found" });
    const ExcelJS = (await import("exceljs")).default;
    const EXCEL_DIR = path.join(process.cwd(), "excel");
    const safeKw = job.keyword.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const safeLoc = (job.location || "unknown")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_");
    filePath = path.join(EXCEL_DIR, `${safeKw}_${safeLoc}_recovered.xlsx`);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Leads");
    ws.columns = [
      { header: "Email", key: "email", width: 35 },
      { header: "Website", key: "website", width: 30 },
      { header: "Business Name", key: "businessName", width: 30 },
      { header: "Phone", key: "phone", width: 18 },
      { header: "Source", key: "source", width: 16 },
    ];
    ws.getRow(1).font = { bold: true };
    for (const e of job.emails) ws.addRow(e);
    await wb.xlsx.writeFile(filePath);
    await Job.findByIdAndUpdate(job._id, { filePath });
  }

  const filename = path.basename(filePath);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  fs.createReadStream(filePath).pipe(res);
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
      { id: "email", title: "Email" },
      { id: "website", title: "Website" },
      { id: "businessName", title: "Business Name" },
      { id: "phone", title: "Phone" },
      { id: "location", title: "Location" },
      { id: "source", title: "Source" },
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
  res.write(`data: ${JSON.stringify("🔌 Connected")}\n\n`);
  const bus = getBus(jobId);
  const onLog = (msg) => res.write(`data: ${JSON.stringify(msg)}\n\n`);
  bus.on("log", onLog);
  req.on("close", () => bus.off("log", onLog));
}
