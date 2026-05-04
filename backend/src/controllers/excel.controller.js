import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import Job from '../models/job.model.js';

const EXCEL_DIR = path.join(process.cwd(), 'excel');

// ─── Helpers ────────────────────────────────────────────────────────────────

function ensureExcelDir() {
  if (!fs.existsSync(EXCEL_DIR)) fs.mkdirSync(EXCEL_DIR, { recursive: true });
}

async function buildExcelFromJob(job) {
  ensureExcelDir();
  const safeKeyword = job.keyword.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const timestamp   = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filePath    = path.join(EXCEL_DIR, `${safeKeyword}-${timestamp}.xlsx`);

  const workbook = new ExcelJS.Workbook();
  const sheet    = workbook.addWorksheet('Leads');

  sheet.columns = [
    { header: 'Email',   key: 'email',   width: 35 },
    { header: 'Website', key: 'website', width: 30 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const e of job.emails) {
    sheet.addRow({
      email:   e.email   || '',
      website: e.website || '',
    });
  }

  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

export const getExcelFiles = async (req, res) => {
  try {
    const jobs = await Job.find(
      {},
      'keyword status filePath serperCreditsUsed creditsExhausted emailsFound emails startedAt completedAt stoppedAt createdAt'
    ).sort({ createdAt: -1 }).limit(100);

    const files = jobs.map(job => ({
      jobId:            job._id,
      keyword:          job.keyword,
      status:           job.status,
      // Always use emails.length — the ground truth from MongoDB
      emailCount:       job.emails?.length ?? 0,
      creditsUsed:      job.serperCreditsUsed ?? 0,
      creditsExhausted: job.creditsExhausted ?? false,
      // Downloadable if any emails exist — status doesn't matter
      downloadable:     (job.emails?.length ?? 0) > 0,
      createdAt:        job.startedAt || job.createdAt,
      completedAt:      job.completedAt || job.stoppedAt || null,
    }));

    res.json(files);
  } catch (err) {
    console.error('getExcelFiles error:', err);
    res.status(500).json({ error: 'Failed to load jobs' });
  }
};

export const downloadExcelFile = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job)              return res.status(404).json({ error: 'Job not found' });
    if (!job.emails?.length) return res.status(404).json({ error: 'No emails found for this job' });

    // Always rebuild from MongoDB — never trust the file on disk
    const filePath = await buildExcelFromJob(job);

    // Save latest path back to job
    await Job.findByIdAndUpdate(job._id, { filePath });

    const filename = path.basename(filePath);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('downloadExcelFile error:', err);
    res.status(500).json({ error: 'Download failed' });
  }
};