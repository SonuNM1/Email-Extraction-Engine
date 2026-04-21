import { useEffect, useState } from "react";
import axios from "axios";

type FileEntry = {
  jobId: string;
  name: string;
  keyword: string;
  status: string;
  emailCount: number;
  creditsUsed: number;
  creditsExhausted: boolean;
  fileExists: boolean;
  downloadable: boolean;
  createdAt: string;
  completedAt: string | null;
};

const API = import.meta.env.VITE_API_URL;

const STATUS_COLOR: Record<string, string> = {
  completed: "var(--lh-green)",
  stopped: "#f59e0b",
  failed: "var(--lh-danger)",
  running: "var(--lh-cyan)",
  pending: "var(--lh-muted)",
};

const STATUS_LABEL: Record<string, string> = {
  completed: "✅ Complete",
  stopped: "⚠️ Stopped",
  failed: "❌ Failed",
  running: "⟳ Running",
  pending: "⏳ Pending",
};

function formatDateTime(dt: string | null): string {
  if (!dt) return "—";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return dt;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ExcelPage() {
  const [files, setFiles] = useState<FileEntry[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await axios.get(`${API}/api/excel/files`);
        if (mounted) setFiles(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "48px 24px 80px",
        fontFamily: "var(--font-sans)",
      }}
    >
      <header style={{ marginBottom: 40 }}>
        <div
          style={{
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: "var(--lh-muted)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          // file archive
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 300,
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          Excel{" "}
          <span style={{ color: "var(--lh-green)", fontWeight: 600 }}>
            Downloads
          </span>
        </h1>
        <p style={{ color: "var(--lh-muted)", fontSize: 14, marginTop: 8 }}>
          All scrape runs — download anytime. Interrupted jobs rebuild from
          database automatically.
        </p>
      </header>

      {files.length === 0 ? (
        <div
          style={{
            background: "var(--lh-surface)",
            border: "1px solid var(--lh-border)",
            borderRadius: "var(--r-lg)",
            padding: 40,
            textAlign: "center",
            color: "var(--lh-muted)",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
          }}
        >
          No scrape runs yet — start one from the home page.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {files.map((file) => (
            <div
              key={file.jobId}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--lh-surface)",
                border: `1px solid ${STATUS_COLOR[file.status] ?? "var(--lh-border)"}`,
                borderRadius: "var(--r-lg)",
                padding: "16px 20px",
                opacity: file.status === "failed" ? 0.6 : 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    background: "rgba(0,255,136,0.08)",
                    border: "1px solid var(--lh-green)",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                  }}
                >
                  📊
                </div>
                <div>
                  <div
                    style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}
                  >
                    {file.keyword}
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                        color: STATUS_COLOR[file.status],
                      }}
                    >
                      {STATUS_LABEL[file.status] ?? file.status}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                        color: "var(--lh-green)",
                      }}
                    >
                      {file.emailCount.toLocaleString()} emails
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                        color: "var(--lh-muted)",
                      }}
                    >
                      {file.creditsUsed} credits
                      {file.creditsExhausted ? " 🚫" : ""}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                        color: "var(--lh-muted)",
                      }}
                    >
                      {formatDateTime(file.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {file.emailCount > 0 ? (
                <a
                  href={`${API}/api/excel/download/${file.jobId}`}
                  download
                  style={{
                    padding: "8px 18px",
                    background: file.downloadable
                      ? "var(--lh-green)"
                      : "#f59e0b",
                    color: "#0a0a0f",
                    borderRadius: "var(--r-md)",
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.06em",
                    textDecoration: "none",
                    whiteSpace: "nowrap" as const,
                  }}
                >
                  {file.downloadable ? "↓ DOWNLOAD" : "↓ RECOVER"}
                </a>
              ) : (
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: "var(--lh-muted)",
                    padding: "8px 18px",
                  }}
                >
                  no data
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
