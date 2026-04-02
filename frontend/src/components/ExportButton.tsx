import { getExportUrl } from '../api/scraper.api';

export function ExportButton({ jobId }: { jobId: string }) {
  return (
    <a
      href={getExportUrl(jobId)}
      download
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '11px 22px', background: 'transparent',
        border: '1px solid var(--lh-green)', borderRadius: 'var(--r-md)',
        color: 'var(--lh-green)', fontSize: 13, fontWeight: 700,
        fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
        textDecoration: 'none', transition: 'background 0.2s',
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--lh-green-dim)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
    >
      ↓ DOWNLOAD CSV
    </a>
  );
}