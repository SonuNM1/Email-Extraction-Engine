import { useEffect, useState } from "react";
import axios from "axios";

type ExcelFile = { name: string; url: string };

const API = import.meta.env.VITE_API_URL;

function parseDate(filename: string): string {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "—";
}

function parseKeyword(filename: string): string {
  return filename.replace(/-\d{4}-\d{2}-\d{2}\.xlsx$/, "").replace(/_/g, " ");
}

export default function ExcelPage() {
  const [files, setFiles] = useState<ExcelFile[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetch = async () => {
      try {
        const res = await axios.get(`${API}/api/excel/files`);
        if (isMounted) setFiles(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetch();
    const interval = setInterval(fetch, 5000);
    return () => {
      isMounted = false;
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
          Files are written live during scraping — download any time, even
          mid-run.
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
          No files yet — start a scrape from the home page.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...files].reverse().map((file, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--lh-surface)",
                border: "1px solid var(--lh-border)",
                borderRadius: "var(--r-lg)",
                padding: "16px 20px",
                transition: "border-color 0.2s",
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
                    style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}
                  >
                    {parseKeyword(file.name)}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                      color: "var(--lh-muted)",
                    }}
                  >
                    {parseDate(file.name)}
                  </div>
                </div>
              </div>
              <a
                href={`${API}${file.url}`}
                download
                style={{
                  padding: "8px 18px",
                  background: "var(--lh-green)",
                  color: "#0a0a0f",
                  borderRadius: "var(--r-md)",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.06em",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                ↓ DOWNLOAD
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
