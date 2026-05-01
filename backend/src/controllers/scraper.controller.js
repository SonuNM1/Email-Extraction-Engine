import Job from "../models/job.model.js";
import { searchLocation } from "../services/google/search.service.js";
import { searchMapsLocation } from "../services/google/maps.service.js";
import { extractEmailsFromUrls } from "../services/extractor/emailExtractor.js";
import { extractEmailsFromMapsResults } from "../services/extractor/mapsEmailExtractor.js";
import { createObjectCsvStringifier } from "csv-writer";
import { createWorkbook, finalizeWorkbook } from "../services/excel.service.js";
import { getBus, destroyBus, logToJob } from "../services/logBus.js";
import { LOCATIONS } from "../config/locations.js";
import pLimit from "p-limit";
import fs from "fs";
import path from "path";

const stopRequested = new Set();
const LOCATION_CONCURRENCY = 6; // run 10 locations in parallel

export async function startScrape(req, res) {
  const { keyword, serperKey } = req.body;
  if (!keyword) return res.status(400).json({ error: "keyword is required" });

  const apiKey = serperKey?.trim() || process.env.SERPER_API_KEY;
  if (!apiKey)
    return res.status(400).json({ error: "No Serper API key provided" });

  // Create workbook path immediately so file is always available
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  const safeKw = keyword.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const EXCEL_DIR = path.join(process.cwd(), 'excel');
  if (!fs.existsSync(EXCEL_DIR)) fs.mkdirSync(EXCEL_DIR);
  const filePath = path.join(EXCEL_DIR, `${safeKw}_all_locations_${date}_${time}.xlsx`);

  const job = await Job.create({
    keyword,
    location: "All US Locations",
    status: "pending",
    emails: [],
    emailsFound: 0,
    serperCreditsUsed: 0,
    filePath, // ← save path immediately, before scraping starts
    startedAt: new Date(),
    locationProgress: {},
  });

  res.json({ jobId: job._id, message: "Scrape started" });

  runScrapeJob(job._id, keyword, apiKey, filePath).catch((err) => {
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

async function runScrapeJob(jobId, keyword, apiKey, filePath) {
  // Per-job credits object — no more singleton
  const credits = { used: 0, exhausted: false, remaining: null };

  stopRequested.delete(jobId.toString());
  await Job.findByIdAndUpdate(jobId, { status: "running" });
  logToJob(jobId, `🚀 Job started — "${keyword}" across ${LOCATIONS.length} locations`);

  const { workbook, sheet } = createWorkbook(keyword, "all_locations", filePath);
  logToJob(jobId, `📁 File: ${filePath}`);

  const globalSeenEmails = new Set();
  let wasStopped = false;

  try {
    const locationLimit = pLimit(LOCATION_CONCURRENCY);

    await Promise.all(
      LOCATIONS.map(location =>
        locationLimit(async () => {
          if (stopRequested.has(jobId.toString()) || credits.exhausted) {
            if (stopRequested.has(jobId.toString())) wasStopped = true;
            return;
          }

          // Mark location as running
          const locKey = location.replace(/\s+/g, '_');
          await Job.findByIdAndUpdate(jobId, {
            $set: { [`locationProgress.${locKey}`]: { status: 'running', emailCount: 0 } }
          });
          logToJob(jobId, `📍 Starting: ${location}`);

          try {
            const [searchUrls, mapsListings] = await Promise.all([
              searchLocation(keyword, location, apiKey, credits),
              searchMapsLocation(keyword, location, apiKey, credits),
            ]);

            if (stopRequested.has(jobId.toString())) {
              wasStopped = true;
              return;
            }

            const mapsSeenEmails = new Set();
            const beforeCount = globalSeenEmails.size;

            await Promise.all([
              extractEmailsFromUrls(
                searchUrls, keyword, location, jobId, sheet, globalSeenEmails
              ),
              extractEmailsFromMapsResults(
                mapsListings, keyword, location, jobId, sheet, mapsSeenEmails
              ),
            ]);

            // Count how many new emails this location added
            const locationEmailCount = globalSeenEmails.size - beforeCount + mapsSeenEmails.size;

            // Mark location as done with its email count
            await Job.findByIdAndUpdate(jobId, {
              $set: {
                [`locationProgress.${locKey}`]: {
                  status: 'done',
                  emailCount: locationEmailCount
                }
              },
              $inc: { emailsFound: locationEmailCount },
              serperCreditsUsed: credits.used,
              creditsExhausted: credits.exhausted,
              'progress.creditsRemaining': credits.remaining,
            });

            logToJob(jobId, `✅ ${location}: ${locationEmailCount} emails | Credits left: ${credits.remaining ?? '?'}`);

          } catch (err) {
            logToJob(jobId, `❌ [${location}] Error: ${err.message}`);
            await Job.findByIdAndUpdate(jobId, {
              $set: { [`locationProgress.${locKey}`]: { status: 'done', emailCount: 0 } }
            });
          }
        })
      )
    );
  } catch (err) {
    logToJob(jobId, `❌ Job error: ${err.message}`);
  }

  // Always finalize Excel — makes file valid even if job was interrupted
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
      serperCreditsUsed: credits.used,
      creditsExhausted: credits.exhausted,
    },
    { returnDocument: "after" }
  );

  stopRequested.delete(jobId.toString());
  logToJob(
    jobId,
    `\n🎉 ${finalStatus}! Total emails: ${finalJob.emails.length} | Credits used: ${credits.used} | Remaining: ${credits.remaining ?? '?'}`
  );
  destroyBus(jobId);
}

export async function getStatus(req, res) {
  const job = await Job.findById(
    req.params.jobId,
    "status keyword location emails emailsFound serperCreditsUsed filePath creditsExhausted stoppedAt startedAt completedAt locationProgress progress"
  );
  if (!job) return res.status(404).json({ error: "Job not found" });

  const isTerminal = ["completed", "stopped", "failed"].includes(job.status);
  res.json({
    ...job.toObject(),
    totalEmailsFound: isTerminal ? job.emails.length : job.emailsFound,
    serperCreditsUsed: job.serperCreditsUsed ?? 0,
    creditsRemaining: job.progress?.creditsRemaining ?? null,
  });
}

export async function downloadExcel(req, res) {
  const job = await Job.findById(
    req.params.jobId,
    "filePath keyword location status emails"
  );
  if (!job) return res.status(404).json({ error: "Job not found" });

  let filePath = job.filePath;
  const fileValid = filePath && fs.existsSync(filePath);
  const isCompleted = job.status === 'completed';

  // Rebuild from MongoDB if:
  // 1. File is missing, OR
  // 2. Job was interrupted (not cleanly completed) — file may be corrupt
  if (!fileValid || !isCompleted) {
    if (!job.emails?.length)
      return res.status(404).json({ error: "No data found yet" });

    const ExcelJS = (await import("exceljs")).default;
    const EXCEL_DIR = path.join(process.cwd(), "excel");
    if (!fs.existsSync(EXCEL_DIR)) fs.mkdirSync(EXCEL_DIR);
    const safeKw = job.keyword.toLowerCase().replace(/[^a-z0-9]/g, "_");
    filePath = path.join(EXCEL_DIR, `${safeKw}_recovered_${Date.now()}.xlsx`);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Leads");
    ws.columns = [
      { header: "Email",         key: "email",        width: 35 },
      { header: "Website",       key: "website",       width: 30 },
      { header: "Business Name", key: "businessName",  width: 30 },
      { header: "Phone",         key: "phone",         width: 18 },
      { header: "Location",      key: "location",      width: 20 },
      { header: "Source",        key: "source",        width: 16 },
      { header: "Keyword",       key: "keyword",       width: 25 },
    ];
    ws.getRow(1).font = { bold: true };
    for (const e of job.emails) ws.addRow(e);
    await wb.xlsx.writeFile(filePath);
    await Job.findByIdAndUpdate(job._id, { filePath });
    logToJob(job._id.toString(), `📥 Rebuilt Excel from DB: ${job.emails.length} emails`);
  }

  const filename = path.basename(filePath);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  fs.createReadStream(filePath).pipe(res);
}

export async function exportCsv(req, res) {
  const job = await Job.findById(req.params.jobId, "emails keyword");
  if (!job) return res.status(404).json({ error: "Job not found" });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${job.keyword}-emails.csv"`);

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