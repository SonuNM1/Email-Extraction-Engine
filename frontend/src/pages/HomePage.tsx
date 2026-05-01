import { useState } from "react";
import { useScrapeJobs } from "../hooks/useScrapeJob";
import type { JobEntry } from "../hooks/useScrapeJob";
import { ApiKeyVault } from "../components/ApiKeyVault";
import { LocationGrid } from "../components/LocationGrid";
import { LOCATIONS } from "../utils/locations";

const API = import.meta.env.VITE_API_URL || "";

function JobCard({
  entry,
  onStop,
  onRemove,
}: {
  entry: JobEntry;
  onStop: () => void;
  onRemove: () => void;
}) {
  const { jobId, keyword, job, loading, error } = entry;
  const totalEmails: number = (job as any)?.totalEmailsFound ?? 0;
  const creditsUsed: number = (job as any)?.serperCreditsUsed ?? 0;
  const creditsExhausted = (job as any)?.creditsExhausted ?? false;
  const location: string = (job as any)?.location ?? "";
  const isRunning = job?.status === "running";
  const isDone = job?.status === "completed";
  const isStopped = job?.status === "stopped";
  const isFailed = job?.status === "failed";
  const isTerminal = isDone || isStopped || isFailed;

  const borderColor = isFailed
    ? "var(--danger)"
    : creditsExhausted || isStopped
      ? "var(--warning)"
      : isDone
        ? "var(--success-border)"
        : isRunning
          ? "var(--running-border)"
          : "var(--border)";

  return (
    <div
      style={{
        background: "var(--surface)",
        border: `1.5px solid ${borderColor}`,
        borderRadius: "var(--r-lg)",
        padding: "18px 20px",
        boxShadow: "var(--shadow-sm)",
        animation: "fade-in 0.3s ease",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isRunning && (
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--running)",
                animation: "pulse-dot 1.2s infinite",
                flexShrink: 0,
              }}
            />
          )}
          {isDone && (
            <span style={{ color: "var(--success)", fontSize: 14 }}>✓</span>
          )}
          {isStopped && (
            <span style={{ color: "var(--warning)", fontSize: 14 }}>⏹</span>
          )}
          {isFailed && (
            <span style={{ color: "var(--danger)", fontSize: 14 }}>✕</span>
          )}
          {loading && !job && (
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--muted-2)",
                animation: "pulse-dot 1.5s infinite",
              }}
            />
          )}
          <div>
            <span
              style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}
            >
              {keyword}
            </span>
            {location && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  marginLeft: 8,
                  fontFamily: "var(--font-mono)",
                }}
              >
                📍 {location}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isRunning && (
            <button
              onClick={onStop}
              style={{
                padding: "5px 14px",
                background: "var(--danger-light)",
                border: "1px solid var(--danger)",
                borderRadius: "var(--r-sm)",
                color: "var(--danger)",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Stop
            </button>
          )}
          {isTerminal && jobId && (
            <a
              href={`${API}/api/scrape/${jobId}/download`}
              download={`${keyword}-emails.xlsx`}
              style={{
                padding: "5px 14px",
                background: "var(--primary)",
                border: "none",
                borderRadius: "var(--r-sm)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              ↓ Excel
            </a>
          )}
          {isTerminal && (
            <button
              onClick={onRemove}
              style={{
                padding: "5px 10px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-sm)",
                color: "var(--muted)",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Dismiss
            </button>
          )}
        </div>
      </div>

      {error && (
        <p style={{ color: "var(--danger)", fontSize: 12, marginBottom: 10 }}>
          ✕ {error}
        </p>
      )}

      {creditsExhausted && (
        <div
          style={{
            background: "var(--warning-light)",
            border: "1px solid #fde68a",
            borderRadius: "var(--r-md)",
            padding: "9px 14px",
            marginBottom: 12,
            fontSize: 12,
            color: "var(--warning)",
          }}
        >
          🚫 <strong>Credits exhausted</strong> — {creditsUsed} used.{" "}
          <a
            href="https://serper.dev"
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--warning)", fontWeight: 700 }}
          >
            Top up →
          </a>
        </div>
      )}

      {job && (
        <div style={{ display: "flex", gap: 12 }}>
          <div
            style={{
              flex: 1,
              padding: "12px 16px",
              background: "var(--success-light)",
              border: "1px solid var(--success-border)",
              borderRadius: "var(--r-md)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--muted)",
                marginBottom: 4,
              }}
            >
              Emails Found
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                color: "var(--success)",
              }}
            >
              {totalEmails.toLocaleString()}
            </div>
            {isRunning && (
              <div
                style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}
              >
                updating live...
              </div>
            )}
          </div>
          <div
            style={{
              flex: 1,
              padding: "12px 16px",
              background: creditsExhausted
                ? "var(--warning-light)"
                : "var(--primary-light)",
              border: `1px solid ${creditsExhausted ? "#fde68a" : "var(--primary-border)"}`,
              borderRadius: "var(--r-md)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--muted)",
                marginBottom: 4,
              }}
            >
              Credits Used
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                color: creditsExhausted ? "var(--warning)" : "var(--primary)",
              }}
            >
              {creditsUsed.toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function HomePage() {
  const { jobs, start, stop, remove } = useScrapeJobs();
  const [keyword, setKeyword] = useState("");
  const [serperKey, setSerperKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [hasExecuted, setHasExecuted] = useState(false);

  const isReady = keyword.trim().length > 0;

  const handleStart = async () => {
    if (!isReady) return;
    setHasExecuted(true);
    await start(keyword.trim(), serperKey.trim() || null);
  };

  const inputBase: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    border: "1.5px solid var(--border)",
    borderRadius: "var(--r-md)",
    fontSize: 14,
    fontFamily: "var(--font-sans)",
    color: "var(--text)",
    background: "var(--surface)",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* ── Header ── */}
      <header
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          padding: "0 32px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              background: "var(--primary)",
              borderRadius: 9,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                color: "#fff",
                fontSize: 17,
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
              }}
            >
              @
            </span>
          </div>
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: "var(--text)",
                lineHeight: 1.1,
              }}
            >
              Email Scraper
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--muted)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              by Relevant Search Media
            </div>
          </div>
        </div>
        <a
          href="/excel"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--muted)",
            textDecoration: "none",
            padding: "6px 16px",
            border: "1px solid var(--border)",
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor =
              "var(--primary)";
            (e.currentTarget as HTMLElement).style.color = "var(--primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor =
              "var(--border)";
            (e.currentTarget as HTMLElement).style.color = "var(--muted)";
          }}
        >
          📊 Downloads
        </a>
      </header>

      {/* ── Main ── */}
      <main
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "36px 28px 80px",
          display: "flex",
          gap: 28,
          alignItems: "flex-start",
        }}
      >
        {/* ─── LEFT PANEL (70%) ─── */}
        <div style={{ flex: "0 0 70%", maxWidth: "70%" }}>
          {/* Hero */}
          <div style={{ marginBottom: 32 }}>
            <h1
              style={{
                fontSize: 38,
                fontWeight: 800,
                color: "var(--text)",
                lineHeight: 1.15,
                marginBottom: 12,
                letterSpacing: "-0.025em",
              }}
            >
              Find Business Emails
              <br />
              <span style={{ color: "var(--primary)" }}>
                Across All US States
              </span>
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "var(--muted)",
                lineHeight: 1.75,
                maxWidth: 540,
              }}
            ></p>
          </div>

          {/* Form card */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-xl)",
              padding: 28,
              boxShadow: "var(--shadow-md)",
              marginBottom: 24,
            }}
          >
            {/* Keyword */}
            <div style={{ marginBottom: 18 }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  display: "block",
                  marginBottom: 7,
                }}
              >
                Business / Service Keyword
              </label>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
                placeholder="e.g. digital marketing agency, roofing contractor..."
                style={inputBase}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--primary)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--border)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* API Key */}
            <div style={{ marginBottom: 22 }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  display: "block",
                  marginBottom: 7,
                }}
              >
                Serper API Key
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showKey ? "text" : "password"}
                  value={serperKey}
                  onChange={(e) => setSerperKey(e.target.value)}
                  placeholder="Paste your Serper API key here..."
                  style={{ ...inputBase, paddingRight: 72 }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--primary)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--border)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    display: "flex",
                    gap: 4,
                  }}
                >
                  <button
                    onClick={() => setShowKey((v) => !v)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 14,
                      color: "var(--muted)",
                      padding: "2px 4px",
                      lineHeight: 1,
                    }}
                  >
                    {showKey ? "🙈" : "👁"}
                  </button>
                  {serperKey && (
                    <button
                      onClick={() => setSerperKey("")}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12,
                        color: "var(--muted-2)",
                        padding: "2px 4px",
                        lineHeight: 1,
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              {serperKey && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--success)",
                    marginTop: 5,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontWeight: 600,
                  }}
                >
                  <span>✓</span> API key is set
                </div>
              )}
            </div>

            {/* Execute button */}
            <button
              onClick={handleStart}
              disabled={!isReady}
              style={{
                width: "100%",
                padding: "14px",
                background: isReady ? "var(--primary)" : "var(--border)",
                color: isReady ? "#ffffff" : "var(--muted)",
                border: "none",
                borderRadius: "var(--r-md)",
                fontSize: 14,
                fontWeight: 800,
                cursor: isReady ? "pointer" : "not-allowed",
                letterSpacing: "0.01em",
                boxShadow: isReady ? "var(--shadow-blue)" : "none",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (isReady)
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--primary-dark)";
              }}
              onMouseLeave={(e) => {
                if (isReady)
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--primary)";
              }}
            >
              🚀 Execute — Scrape All {LOCATIONS.length} Locations
            </button>
          </div>

          {/* Location progress — appears after first execute */}
          {hasExecuted && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-xl)",
                padding: 24,
                boxShadow: "var(--shadow-sm)",
                marginBottom: 24,
                animation: "fade-in 0.4s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--text)",
                      marginBottom: 2,
                    }}
                  >
                    Location Progress
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    Scraping across all US states &amp; territories
                  </div>
                </div>
                <div
                  style={{
                    background: "var(--primary-light)",
                    border: "1px solid var(--primary-border)",
                    borderRadius: 20,
                    padding: "4px 12px",
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    color: "var(--primary)",
                  }}
                >
                  {LOCATIONS.length} locations
                </div>
              </div>
              <LocationGrid
                locationData={(jobs[0]?.job as any)?.locationProgress ?? {}}
                isRunning={jobs.some((j) => j.job?.status === "running")}
              />
            </div>
          )}

          {/* Active job cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {jobs.map((entry) => (
              <JobCard
                key={entry.jobId}
                entry={entry}
                onStop={() => stop(entry.jobId)}
                onRemove={() => remove(entry.jobId)}
              />
            ))}
          </div>
        </div>

        {/* ─── RIGHT PANEL (30%) ─── */}
        <div
          style={{
            flex: "0 0 calc(30% - 28px)",
            maxWidth: "calc(30% - 28px)",
            position: "sticky",
            top: 76,
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-xl)",
              padding: 24,
              boxShadow: "var(--shadow-md)",
            }}
          >
            <ApiKeyVault
              onUse={(key) => setSerperKey(key)}
              activeKey={serperKey}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
