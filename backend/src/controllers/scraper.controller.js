import Job from '../models/job.model.js';
import { searchLocation } from '../services/google.service.js';
import { extractEmailsFromUrls } from '../services/emailExtractor.service.js';
import { filterLinks } from '../utils/filterLinks.js';
import { LOCATIONS } from '../config/locations.js';
import { createObjectCsvStringifier } from 'csv-writer';

// POST /api/scrape  { keyword }

export async function startScrape(req, res) {
  const { keyword } = req.body;
  if (!keyword) return res.status(400).json({ error: 'keyword is required' });

  // Check for an existing incomplete job for this keyword (resume support)

  let job = await Job.findOne({ keyword, status: { $in: ['pending', 'running', 'failed'] } });

  if (!job) {
    job = await Job.create({
      keyword,
      status: 'pending',
      progress: { completed: 0, total: LOCATIONS.length, currentLocation: '' },
      locations: LOCATIONS.map(name => ({ name, status: 'pending', emailsFound: 0 })),
      emails: [],
      startedAt: new Date(),
    });
  }

  // Respond immediately with jobId — scraping runs in background
  res.json({ jobId: job._id, message: 'Scrape started' });

  // Run async — don't await
  runScrapeJob(job._id, keyword).catch(err => {
    console.error('Scrape job crashed:', err);
    Job.findByIdAndUpdate(job._id, { status: 'failed' }).exec();
  });
}

async function runScrapeJob(jobId, keyword) {
  await Job.findByIdAndUpdate(jobId, { status: 'running' });

  const job = await Job.findById(jobId);
  const pending = job.locations.filter(l => l.status === 'pending');

  for (const locEntry of pending) {
    const location = locEntry.name;

    // Mark location running
    await Job.updateOne(
      { _id: jobId, 'locations.name': location },
      { $set: { 'locations.$.status': 'running', 'progress.currentLocation': location } }
    );

    try {
      const rawUrls = await searchLocation(keyword, location);
      const filteredUrls = filterLinks(rawUrls);
      const emails = await extractEmailsFromUrls(filteredUrls, keyword, location);

      await Job.updateOne(
        { _id: jobId, 'locations.name': location },
        {
          $set: {
            'locations.$.status': 'done',
            'locations.$.emailsFound': emails.length,
          },
          $push: { emails: { $each: emails } },
          $inc: { 'progress.completed': 1 },
        }
      );
    } catch (err) {
      console.error(`Failed location ${location}:`, err.message);
      await Job.updateOne(
        { _id: jobId, 'locations.name': location },
        { $set: { 'locations.$.status': 'failed' } }
      );
    }
  }

  await Job.findByIdAndUpdate(jobId, {
    status: 'completed',
    completedAt: new Date(),
  });
}

// GET /api/scrape/:jobId/status - returns the current progress of a job (how many locations done, which one running now)

export async function getStatus(req, res) {
  const job = await Job.findById(req.params.jobId, 'status progress locations keyword');
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
}

// GET /api/scrape/:jobId/export

export async function exportCsv(req, res) {
  const job = await Job.findById(req.params.jobId, 'emails keyword status');
  if (!job) return res.status(404).json({ error: 'Job not found' });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${job.keyword}-emails.csv"`);

  const csvWriter = createObjectCsvStringifier({
    header: [
      { id: 'email', title: 'email' },
      { id: 'website', title: 'website' },
      { id: 'location', title: 'location' },
      { id: 'keyword', title: 'keyword' },
    ],
  });

  res.write(csvWriter.getHeaderString());
  res.write(csvWriter.stringifyRecords(job.emails));
  res.end();
}