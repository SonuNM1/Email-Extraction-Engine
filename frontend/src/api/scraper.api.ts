const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

export async function startScrape(
  keyword: string,
  email?: string | null,
  serperKey?: string | null
) {
  const res = await fetch(`${API}/api/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword, email, serperKey  }),
  });
  return res.json();
}

export async function fetchJobStatus(jobId: string) {
  const res = await fetch(`${API}/api/scrape/${jobId}/status`);
  return res.json();
}

// Returns the CSV download URL for a completed job

export function getExportUrl(jobId: string): string {
  return `${API}/api/scrape/${jobId}/export`;
}