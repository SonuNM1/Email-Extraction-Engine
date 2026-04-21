import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import Job from '../models/job.model.js';

const EXCEL_DIR = path.join(process.cwd(), 'excel');

export const getExcelFiles = async (req, res) => {
  try {
    // Get all jobs from MongoDB sorted by newest first
    const jobs = await Job.find(
      {},
      'keyword status filePath serperCreditsUsed creditsExhausted progress startedAt completedAt stoppedAt emails'
    ).sort({ createdAt: -1 }).limit(50);

    const files = jobs
      .filter(job => job.filePath) // only jobs that created a file
      .map(job => {
        const fileExists = job.filePath && fs.existsSync(job.filePath);
        const isTerminal = ['completed', 'stopped', 'failed'].includes(job.status);
        const emailCount = isTerminal
          ? job.emails.length
          : job.progress.emailsFound;

        return {
          jobId:        job._id,
          name:         path.basename(job.filePath || ''),
          keyword:      job.keyword,
          status:       job.status,
          emailCount,
          creditsUsed:  job.serperCreditsUsed ?? 0,
          creditsExhausted: job.creditsExhausted ?? false,
          fileExists,
          // File is safe to download only when job is terminal AND file exists
          downloadable: isTerminal && fileExists,
          createdAt:    job.startedAt || job.createdAt,
          completedAt:  job.completedAt || job.stoppedAt,
        };
      });

    res.json(files);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load jobs' });
  }
};

// Rebuild Excel from MongoDB — used when file is missing/corrupt
async function rebuildExcel(job, filePath) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Leads');

  sheet.columns = [
    { header: 'Email',         key: 'email',        width: 35 },
    { header: 'Website',       key: 'website',       width: 30 },
    { header: 'Business Name', key: 'businessName',  width: 30 },
    { header: 'Phone',         key: 'phone',         width: 18 },
    { header: 'Location',      key: 'location',      width: 20 },
    { header: 'Source',        key: 'source',        width: 16 },
    { header: 'Keyword',       key: 'keyword',       width: 25 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const e of job.emails) {
    sheet.addRow({
      email:        e.email        || '',
      website:      e.website      || '',
      businessName: e.businessName || '',
      phone:        e.phone        || '',
      location:     e.location     || '',
      source:       e.source       || '',
      keyword:      e.keyword      || '',
    });
  }

  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

export const downloadExcelFile = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (!job.emails?.length) return res.status(404).json({ error: 'No emails found for this job' });

    let filePath = job.filePath;
    const fileValid = filePath && fs.existsSync(filePath);
    const isTerminal = ['completed', 'stopped'].includes(job.status);

    // Rebuild from MongoDB if file missing or job was interrupted
    if (!fileValid || !isTerminal) {
      const safeKeyword = job.keyword.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const now = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      filePath = path.join(EXCEL_DIR, `${safeKeyword}-recovered-${now}.xlsx`);
      await rebuildExcel(job, filePath);
      // Save the new path back
      await Job.findByIdAndUpdate(job._id, { filePath });
    }

    const filename = path.basename(filePath);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Download failed' });
  }
};