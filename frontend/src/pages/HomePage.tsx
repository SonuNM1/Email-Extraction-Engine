import { useState } from "react";
import { ExportButton } from "../components/ExportButton";
import { useScrapeJobs } from "../hooks/useScrapeJob";
import type { JobEntry } from "../hooks/useScrapeJob";


function JobCard({ entry, onStop, onRemove }: {
  entry: JobEntry;
  onStop: () => void;
  onRemove: () => void;
}) {
  const { jobId, keyword, job, loading, error } = entry;
  const totalEmails: number   = (job as any)?.totalEmailsFound ?? 0;
  const creditsUsed: number   = (job as any)?.serperCreditsUsed ?? 0;
  const creditsExhausted      = (job as any)?.creditsExhausted ?? false;
  const location: string      = (job as any)?.location ?? "";

  const isRunning  = job?.status === "running";
  const isDone     = job?.status === "completed";
  const isStopped  = job?.status === "stopped";
  const isFailed   = job?.status === "failed";
  const isTerminal = isDone || isStopped || isFailed;

  const cardBorder = isFailed         ? "var(--lh-danger)"
    : creditsExhausted || isStopped   ? "#f59e0b"
    : isDone                          ? "var(--lh-green)"
    : isRunning                       ? "var(--lh-cyan)"
    : "var(--lh-border)";

  return (
    <div style={{ background: "var(--lh-surface)", border: `1px solid ${cardBorder}`, borderRadius: "var(--r-lg)", padding: 24, marginBottom: 20, transition: "border-color 0.3s" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isRunning  && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--lh-cyan)", animation: "blink-dot 1.5s infinite" }} />}
          {isDone && !creditsExhausted && <span>✅</span>}
          {(isStopped || creditsExhausted) && <span>⚠️</span>}
          {isFailed   && <span>❌</span>}
          {loading && !job && <span>⏳</span>}
          <div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "var(--lh-text)" }}>{keyword}</span>
            {location && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--lh-muted)", marginLeft: 8 }}>📍 {location}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {isRunning && (
            <button onClick={onStop} style={{ background: "rgba(255,80,80,0.08)", border: "1px solid var(--lh-danger)", borderRadius: "var(--r-sm)", color: "var(--lh-danger)", fontSize: 11, fontFamily: "var(--font-mono)", padding: "4px 12px", cursor: "pointer" }}>
              ⏹ stop
            </button>
          )}
          {isTerminal && jobId && <ExportButton jobId={jobId} />}
          {isTerminal && (
            <button onClick={onRemove} style={{ background: "none", border: "1px solid var(--lh-border)", borderRadius: "var(--r-sm)", color: "var(--lh-muted)", fontSize: 11, fontFamily: "var(--font-mono)", padding: "4px 10px", cursor: "pointer" }}>
              dismiss
            </button>
          )}
        </div>
      </div>

      {error && <p style={{ color: "var(--lh-danger)", fontSize: 12, fontFamily: "var(--font-mono)", marginBottom: 12 }}>✗ {error}</p>}

      {/* Banners */}
      {creditsExhausted && (
        <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: "var(--r-md)", padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#f59e0b", fontFamily: "var(--font-mono)" }}>
          🚫 <strong>Credits exhausted</strong> — {creditsUsed} credits used. <a href="https://serper.dev" target="_blank" rel="noreferrer" style={{ color: "#f59e0b" }}>Top up →</a>
        </div>
      )}
      {isStopped && !creditsExhausted && (
        <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: "var(--r-md)", padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#f59e0b", fontFamily: "var(--font-mono)" }}>
          ⏹️ <strong>Stopped manually</strong> — {totalEmails} emails saved
        </div>
      )}
      {isRunning && (
        <div style={{ background: "#00ff8810", border: "1px solid #00ff8825", borderRadius: "var(--r-md)", padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--lh-green)" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--lh-green)", animation: "blink-dot 1.2s infinite" }} />
          Scraping in progress...
        </div>
      )}

      {/* Stats */}
      {job && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 140, background: "rgba(0,255,136,0.05)", border: "1px solid var(--lh-green)", borderRadius: "var(--r-sm)", padding: "12px 16px" }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--lh-muted)", marginBottom: 4, textTransform: "uppercase" }}>Emails Found</div>
            <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--lh-green)" }}>{totalEmails.toLocaleString()}</div>
            {isRunning && <div style={{ fontSize: 10, color: "var(--lh-muted)", marginTop: 2 }}>updating live...</div>}
          </div>

          <div style={{ flex: 1, minWidth: 140, background: creditsExhausted ? "rgba(245,158,11,0.05)" : "rgba(167,139,250,0.05)", border: `1px solid ${creditsExhausted ? "rgba(245,158,11,0.5)" : "rgba(167,139,250,0.4)"}`, borderRadius: "var(--r-sm)", padding: "12px 16px" }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--lh-muted)", marginBottom: 4, textTransform: "uppercase" }}>
              Credits Used {creditsExhausted && <span style={{ color: "#f59e0b" }}>EXHAUSTED</span>}
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "var(--font-mono)", color: creditsExhausted ? "#f59e0b" : "#a78bfa" }}>
              {creditsUsed.toLocaleString()}
            </div>
            <div style={{ marginTop: 6, height: 3, background: "rgba(167,139,250,0.15)", borderRadius: 2 }}>
              <div style={{ height: "100%", width: `${Math.min((creditsUsed / 2500) * 100, 100)}%`, background: creditsExhausted ? "#f59e0b" : "#a78bfa", borderRadius: 2, transition: "width 0.5s" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function HomePage() {
  const { jobs, start, stop, remove } = useScrapeJobs();
  const [keyword,   setKeyword]   = useState("");
  const [location,  setLocation]  = useState("");
  const [serperKey, setSerperKey] = useState("");
  const [showKey,   setShowKey]   = useState(false);

  const inputStyle = {
    width: "100%", background: "#0d0d14",
    border: "1px solid var(--lh-border)", borderRadius: "var(--r-md)",
    padding: "13px 14px", color: "var(--lh-text)",
    fontSize: 14, fontFamily: "var(--font-sans)",
    outline: "none", boxSizing: "border-box" as const,
  };

  const handleStart = async () => {
    if (!keyword.trim() || !location.trim()) return;
    await start(keyword.trim(), location.trim(), serperKey.trim() || null);
    setKeyword("");
    setLocation("");
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px" }}>

      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 52 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, border: "1.5px solid var(--lh-green)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: "var(--lh-green)" }}>@</span>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>EmailScrape</div>
            <div style={{ fontSize: 11, color: "var(--lh-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Relevant Search Media</div>
          </div>
        </div>
        <a href="/excel" style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--lh-muted)", textDecoration: "none", border: "1px solid var(--lh-border)", padding: "6px 14px", borderRadius: 20 }}>
          📊 Downloads
        </a>
      </header>

      {/* Hero */}
      <div style={{ marginBottom: 40 }}>
      </div>

      {/* Form */}
      <div style={{ background: "var(--lh-surface)", border: "1px solid var(--lh-border)", borderRadius: "var(--r-lg)", padding: 28, marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--lh-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
          // target
        </div>

        {/* Keyword + Location inputs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--lh-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, display: "block" }}>Keyword</label>
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleStart()}
              placeholder="digital marketing agency"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = "var(--lh-green)")}
              onBlur={e  => (e.target.style.borderColor = "var(--lh-border)")}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--lh-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, display: "block" }}>Location</label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleStart()}
              placeholder="New York, California, Chicago..."
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = "var(--lh-cyan)")}
              onBlur={e  => (e.target.style.borderColor = "var(--lh-border)")}
            />
          </div>
        </div>

        {/* Execute button */}
        <button
          onClick={handleStart}
          disabled={!keyword.trim() || !location.trim()}
          style={{
            width: "100%", padding: "13px",
            background: (!keyword.trim() || !location.trim()) ? "var(--lh-muted2)" : "var(--lh-green)",
            color: (!keyword.trim() || !location.trim()) ? "var(--lh-muted)" : "#0a0a0f",
            border: "none", borderRadius: "var(--r-md)",
            fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)",
            cursor: (!keyword.trim() || !location.trim()) ? "not-allowed" : "pointer",
            letterSpacing: "0.06em", marginBottom: 16,
          }}
        >
          EXECUTE
        </button>

        {/* API key toggle */}
        <div>
          <button onClick={() => setShowKey(v => !v)} style={{ background: "none", border: "1px solid var(--lh-border)", borderRadius: "var(--r-sm)", color: "var(--lh-muted)", fontSize: 11, fontFamily: "var(--font-mono)", padding: "5px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#a78bfa" }}>💳</span>
            {serperKey ? "API key set ✓" : "Use your own Serper API key"}
            <span style={{ fontSize: 9 }}>{showKey ? "▲" : "▼"}</span>
          </button>
          {showKey && (
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <input
                type="password"
                placeholder="Paste your Serper API key"
                value={serperKey}
                onChange={e => setSerperKey(e.target.value)}
                style={{ ...inputStyle, fontSize: 12, padding: "8px 12px" }}
              />
              {serperKey && (
                <button onClick={() => setSerperKey("")} style={{ background: "none", border: "1px solid var(--lh-border)", borderRadius: "var(--r-sm)", color: "var(--lh-muted)", fontSize: 11, fontFamily: "var(--font-mono)", padding: "5px 10px", cursor: "pointer" }}>
                  clear
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Job cards */}
      {jobs.map(entry => (
        <JobCard
          key={entry.jobId}
          entry={entry}
          onStop={() => stop(entry.jobId)}
          onRemove={() => remove(entry.jobId)}
        />
      ))}
    </div>
  );
}