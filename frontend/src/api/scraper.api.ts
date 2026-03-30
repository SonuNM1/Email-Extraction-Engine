import type { Job } from "../types/job.types";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000" ; 

export async function startScrape(keyword: string): Promise<{ jobId: string }> {
  const res = await fetch(`${BASE}/api/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword }),
  });
  if (!res.ok) throw new Error('Failed to start scrape');
  return res.json();
}

export async function fetchJobStatus(jobId: string): Promise<Job> {
  const res = await fetch(`${BASE}/api/scrape/${jobId}/status`);
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
}

export function getExportUrl(jobId: string): string {
  return `${BASE}/api/scrape/${jobId}/export`;
}