import { getExportUrl } from '../api/scraper.api';

export function ExportButton({ jobId }: { jobId: string }) {
  return (
      <a
      href={getExportUrl(jobId)}
      download
      style={{
        display: 'inline-block',
        padding: '10px 24px',
        background: '#6366f1',
        color: '#fff',
        borderRadius: 8,
        textDecoration: 'none',
        fontWeight: 500,
        fontSize: 15,
      }}
    >
      Download CSV
    </a>
  );
}