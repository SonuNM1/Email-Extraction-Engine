import { useState, useEffect, useRef } from 'react';
import { useScrapeJob } from '../hooks/useScrapeJob';
import { getPushSubscription } from '../utils/pushNotification';
import { KeywordForm } from '../components/KeywordForm';
import { NotifyEmailInput } from '../components/NotifyEmailInput';
import { EmailCounter } from '../components/EmailCounter';
import { RunningBanner } from '../components/RunningBanner';
import { DoneToast } from '../components/DoneToast';
import { ProgressBar } from '../components/ProgressBar';
import { LocationList } from '../components/LocationList';
import { ExportButton } from '../components/ExportButton';

type Tab = 'status' | 'logs';

export function HomePage() {
  const [keyword, setKeyword]         = useState('');
  const [notifyEmail, setNotifyEmail] = useState('');
  const [showToast, setShowToast]     = useState(false);
  const [activeTab, setActiveTab]     = useState<Tab>('status');

  const { job, loading, error, start, jobId, logs } = useScrapeJob();
  const logsEndRef = useRef<HTMLDivElement>(null);

  const totalEmailsFound: number = (job as any)?.totalEmailsFound ?? 0;
  const isRunning = job?.status === 'running';
  const isDone    = job?.status === 'completed';

  useEffect(() => {
    if (!isDone) return;
    setShowToast(true);
    const t = setTimeout(() => setShowToast(false), 8000);
    return () => clearTimeout(t);
  }, [isDone]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Switch to logs tab automatically when scrape starts
  useEffect(() => {
    if (isRunning) setActiveTab('logs');
  }, [isRunning]);

  const handleStart = async () => {
    if (!keyword.trim()) return;
    const pushSubscription = await getPushSubscription();
    start(keyword.trim(), notifyEmail.trim() || null, pushSubscription);
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px 80px', fontFamily: 'var(--font-sans)' }}>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 52 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, border: '1.5px solid var(--lh-green)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--lh-green)' }}>@</span>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>EmailScrape</div>
            <div style={{ fontSize: 11, color: 'var(--lh-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Relevant Search Media</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 14px', border: '1px solid var(--lh-border)', borderRadius: 20, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--lh-muted)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--lh-green)', animation: 'blink-dot 1.5s infinite' }} />
          SERPER CONNECTED
        </div>
      </header>

      {/* Hero */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 38, fontWeight: 300, lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 10 }}>
          Find every{' '}
          <span style={{ color: 'var(--lh-green)', fontWeight: 600 }}>business email</span>
          <br />across all 55 states
        </h1>
        <p style={{ color: 'var(--lh-muted)', fontSize: 15, lineHeight: 1.7, maxWidth: 560 }}>
          Enter any service keyword. The tool scans Google across every US state &amp; territory and extracts verified contact emails automatically.
        </p>
      </div>

      {/* Search panel */}
      <div style={{ background: 'var(--lh-surface)', border: '1px solid var(--lh-border)', borderRadius: 'var(--r-lg)', padding: 28, marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--lh-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
          // target keyword
        </div>
        <KeywordForm keyword={keyword} onKeywordChange={setKeyword} onStart={handleStart} disabled={isRunning} loading={loading} />
        <NotifyEmailInput value={notifyEmail} onChange={setNotifyEmail} disabled={isRunning} />
      </div>

      {error && (
        <p style={{ color: 'var(--lh-danger)', fontSize: 13, marginBottom: 20, fontFamily: 'var(--font-mono)' }}>
          ✗ {error}
        </p>
      )}

      {isRunning && <RunningBanner />}

      {job && (
        <>
          <EmailCounter total={totalEmailsFound} isRunning={isRunning} />

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 0, borderBottom: '1px solid var(--lh-border)' }}>
            {(['status', 'logs'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 20px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid var(--lh-green)' : '2px solid transparent',
                  color: activeTab === tab ? 'var(--lh-green)' : 'var(--lh-muted)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  marginBottom: -1,
                }}
              >
                {tab === 'logs' && logs.length > 0 ? `LOGS (${logs.length})` : tab.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Status tab */}
          {activeTab === 'status' && (
            <div style={{ marginTop: 16 }}>
              <div style={{ background: 'var(--lh-surface)', border: '1px solid var(--lh-border)', borderRadius: 'var(--r-lg)', padding: 24, marginBottom: 16 }}>
                <ProgressBar completed={job.progress.completed} total={job.progress.total} currentLocation={job.progress.currentLocation} />
              </div>
              {isDone && jobId && (
                <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <p style={{ color: 'var(--lh-green)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                    ✓ Complete — {totalEmailsFound.toLocaleString()} emails across {job.locations.length} locations
                  </p>
                  <ExportButton jobId={jobId} />
                </div>
              )}
              <div style={{ background: 'var(--lh-surface)', border: '1px solid var(--lh-border)', borderRadius: 'var(--r-lg)', padding: 24 }}>
                <LocationList locations={job.locations} />
              </div>
            </div>
          )}

          {/* Logs tab */}
          {activeTab === 'logs' && (
            <div style={{
              marginTop: 16,
              background: '#0a0a0f',
              border: '1px solid var(--lh-border)',
              borderRadius: 'var(--r-lg)',
              padding: '16px 20px',
              height: 420,
              overflowY: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              lineHeight: 1.7,
            }}>
              {logs.length === 0 ? (
                <span style={{ color: 'var(--lh-muted)' }}>Waiting for logs...</span>
              ) : (
                logs.map((line, i) => (
                  <div key={i} style={{
                    color: line.startsWith('✅') ? 'var(--lh-green)'
                         : line.startsWith('❌') ? 'var(--lh-danger)'
                         : line.startsWith('🔍') ? 'var(--lh-cyan)'
                         : line.startsWith('📧') ? '#a78bfa'
                         : 'var(--lh-muted)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}>
                    {line}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          )}
        </>
      )}

      <DoneToast totalEmails={totalEmailsFound} visible={showToast} />
    </div>
  );
}