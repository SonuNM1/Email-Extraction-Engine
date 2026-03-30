import { useState } from 'react';
import { useScrapeJob } from '../hooks/useScrapeJob';
import { ProgressBar } from '../components/ProgressBar';
import { LocationList } from '../components/LocationList';
import { ExportButton } from '../components/ExportButton';

export function HomePage() {
  const [keyword, setKeyword] = useState('');
  const { job, loading, error, start, jobId } = useScrapeJob();

  const handleStart = () => {
    if (keyword.trim()) start(keyword.trim());
  };

  return (
    <div style={{ maxWidth: 900, margin: '60px auto', padding: '0 24px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>Email Scraper</h1>
      <p style={{ color: '#6b7280', marginBottom: 32 }}>Enter a service keyword — we scan all 55 US states automatically.</p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 40 }}>
        <input
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleStart()}
          placeholder="e.g. roofing, plumbing, landscaping"
          disabled={loading || job?.status === 'running'}
          style={{
            flex: 1, padding: '10px 14px', fontSize: 15,
            border: '1px solid #d1d5db', borderRadius: 8, outline: 'none',
          }}
        />
        <button
          onClick={handleStart}
          disabled={loading || !keyword.trim() || job?.status === 'running'}
          style={{
            padding: '10px 28px', background: '#6366f1', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 15,
            fontWeight: 500, cursor: 'pointer',
          }}
        >
          {loading ? 'Starting...' : 'Start'}
        </button>
      </div>

      {error && <p style={{ color: '#ef4444', marginBottom: 16 }}>{error}</p>}

      {job && (
        <>
          <ProgressBar
            completed={job.progress.completed}
            total={job.progress.total}
            currentLocation={job.progress.currentLocation}
          />

          {job.status === 'completed' && jobId && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ color: '#059669', marginBottom: 12, fontWeight: 500 }}>
                Done! Found {job.locations.reduce((s, l) => s + l.emailsFound, 0)} emails across 55 locations.
              </p>
              <ExportButton jobId={jobId} />
            </div>
          )}

          <LocationList locations={job.locations} />
        </>
      )}
    </div>
  );
}