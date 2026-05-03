import { useEffect, useState } from "react";
import axios from "axios";

type FileEntry = {
  jobId: string;
  keyword: string;
  status: string;
  emailCount: number;
  creditsUsed: number;
  creditsExhausted: boolean;
  downloadable: boolean;
  createdAt: string;
  completedAt: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  completed: "#059669",
  stopped:   "#d97706",
  failed:    "#dc2626",
  running:   "#0ea5e9",
  pending:   "#94a3b8",
};

const STATUS_LABEL: Record<string, string> = {
  completed: "✅ Complete",
  stopped:   "⚠️ Stopped",
  failed:    "❌ Failed",
  running:   "⟳ Running",
  pending:   "⏳ Pending",
};

function formatDateTime(dt: string | null): string {
  if (!dt) return "—";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return dt;
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ExcelPage() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const res = await axios.get(`/api/excel/files`);
        if (mounted) {
          setFiles(res.data);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (mounted) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 5000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 80px", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <header style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <a
            href="/"
            style={{ fontSize: 12, color: "var(--muted)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
          >
            ← Back
          </a>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>
          Excel{" "}
          <span style={{ color: "var(--primary)" }}>Downloads</span>
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 8 }}>
          All scrape runs — every job with emails is downloadable, including interrupted ones.
        </p>
      </header>

      {/* Content */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          Loading...
        </div>
      ) : files.length === 0 ? (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)", padding: 40,
          textAlign: "center", color: "var(--muted)", fontSize: 13,
        }}>
          No scrape runs yet — start one from the{" "}
          <a href="/" style={{ color: "var(--primary)", fontWeight: 700 }}>home page</a>.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {files.map(file => (
            <div
              key={file.jobId.toString()}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "var(--surface)",
                border: `1px solid ${file.status === "running" ? "var(--running-border)" : "var(--border)"}`,
                borderRadius: "var(--r-lg)", padding: "16px 20px",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {/* Left — info */}
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 40, height: 40,
                  background: "var(--primary-light)", border: "1px solid var(--primary-border)",
                  borderRadius: 10, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 18, flexShrink: 0,
                }}>
                  📊
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 5 }}>
                    {file.keyword}
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: STATUS_COLOR[file.status] ?? "var(--muted)", fontWeight: 600 }}>
                      {STATUS_LABEL[file.status] ?? file.status}
                    </span>
                    <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: 700 }}>
                      {file.emailCount.toLocaleString()} emails
                    </span>
                    <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
                      {file.creditsUsed} credits{file.creditsExhausted ? " 🚫" : ""}
                    </span>
                    <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
                      {formatDateTime(file.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right — download */}
              {file.downloadable ? (
                <a
                  href={`/api/excel/download/${file.jobId}`}
                  download
                  style={{
                    padding: "9px 20px",
                    background: file.status === "running" ? "var(--running)" : "var(--primary)",
                    color: "#fff",
                    borderRadius: "var(--r-md)",
                    fontSize: 12, fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  {file.status === "running" ? "↓ Partial" : "↓ Download"}
                </a>
              ) : (
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted-2)", padding: "9px 20px" }}>
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