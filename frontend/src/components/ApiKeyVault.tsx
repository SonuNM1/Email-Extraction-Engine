import { useState } from "react";
import type { StoredKey } from "../hooks/useApiKeys";
interface Props {
  onUse: (key: string) => void;
  activeKey: string;
  keys: StoredKey[];
  onAdd: (key: string) => void;
  onRemove: (id: string) => void;
  onMarkExhausted: (key: string) => void;
}

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 5) + " •••••••••••• " + key.slice(-4);
}

export function ApiKeyVault({ onUse, activeKey, keys, onAdd, onRemove, onMarkExhausted }: Props) {
  const [input, setInput] = useState("");

  const handleAdd = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setInput("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            background: "var(--primary-light)",
            border: "1px solid var(--primary-border)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
          }}
        >
          🔑
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
          API Key Vault
        </span>
      </div>

      {/* Input + Add */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          type="text"
          placeholder="Paste Serper API key..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1.5px solid var(--border)",
            borderRadius: "var(--r-md)",
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            color: "var(--text)",
            background: "var(--surface)",
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "var(--primary)";
            e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "var(--border)";
            e.target.style.boxShadow = "none";
          }}
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          style={{
            padding: "9px",
            border: "none",
            borderRadius: "var(--r-md)",
            fontSize: 12,
            fontWeight: 700,
            cursor: input.trim() ? "pointer" : "not-allowed",
            background: input.trim() ? "var(--primary)" : "var(--border)",
            color: input.trim() ? "#fff" : "var(--muted)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (input.trim())
              (e.currentTarget as HTMLElement).style.background =
                "var(--primary-dark)";
          }}
          onMouseLeave={(e) => {
            if (input.trim())
              (e.currentTarget as HTMLElement).style.background =
                "var(--primary)";
          }}
        >
          + Add Key
        </button>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--border)" }} />

      {/* Stored keys */}
      <div>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 10,
          }}
        >
          Stored Keys ({keys.length})
        </p>

        {keys.length === 0 ? (
          <div
            style={{
              padding: "28px 16px",
              textAlign: "center",
              border: "1.5px dashed var(--border)",
              borderRadius: "var(--r-lg)",
              color: "var(--muted-2)",
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            No keys yet.
            <br />
            Add one above to get started.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {keys.map((k) => {
              const isActive = activeKey === k.key;
              return (
                <div
                  key={k._id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    borderRadius: "var(--r-md)",
                    border: `1.5px solid ${isActive ? "var(--primary)" : "var(--border)"}`,
                    background: isActive
                      ? "var(--primary-light)"
                      : "var(--surface-2)",
                    transition: "all 0.2s",
                  }}
                >
                  {/* Key info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-2)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        margin: 0,
                      }}
                    >
                      {maskKey(k.key)}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 3,
                        flexWrap: "wrap",
                      }}
                    >
                      {/* Credits badge */}
                      {k.creditsRemaining !== undefined &&
                      k.creditsRemaining !== null ? (
                        <span
                          style={{
                            fontSize: 10,
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 4,
                            color:
                              k.creditsRemaining === 0
                                ? "#dc2626"
                                : k.creditsRemaining < 200
                                  ? "#d97706"
                                  : "#059669",
                            background:
                              k.creditsRemaining === 0
                                ? "#fef2f2"
                                : k.creditsRemaining < 200
                                  ? "#fffbeb"
                                  : "#ecfdf5",
                            border: `1px solid ${k.creditsRemaining === 0 ? "#fecaca" : k.creditsRemaining < 200 ? "#fde68a" : "#6ee7b7"}`,
                          }}
                        >
                          {k.creditsRemaining === 0
                            ? "🔴 Exhausted"
                            : `${k.creditsRemaining.toLocaleString()} / 2,500`}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 10,
                            fontFamily: "var(--font-mono)",
                            color: "var(--muted-2)",
                          }}
                        >
                          ⚪ Never used
                        </span>
                      )}
                      {isActive && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "var(--primary)",
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: "var(--primary)",
                              display: "inline-block",
                              animation: "pulse-dot 2s infinite",
                            }}
                          />
                          Active
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Use button */}
                  <button
                    onClick={() => onUse(k.key)}
                    style={{
                      padding: "4px 12px",
                      fontSize: 11,
                      fontWeight: 700,
                      border: `1.5px solid ${isActive ? "var(--primary)" : "var(--primary-border)"}`,
                      borderRadius: "var(--r-sm)",
                      cursor: "pointer",
                      background: isActive ? "var(--primary)" : "transparent",
                      color: isActive ? "#fff" : "var(--primary)",
                      transition: "all 0.15s",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isActive ? "✓ Using" : "Use"}
                  </button>

                  {/* Mark exhausted button */}
                  {k.creditsRemaining !== 0 && (
                    <button
                      onClick={() => onMarkExhausted(k.key)}
                      title="Mark as exhausted"
                      style={{
                        padding: "4px 8px",
                        fontSize: 10,
                        fontWeight: 700,
                        border: "1px solid #fecaca",
                        borderRadius: "var(--r-sm)",
                        background: "transparent",
                        color: "#dc2626",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      🔴
                    </button>
                  )}
                  {/* Remove button */}
                  <button
                    onClick={() => onRemove(k._id)}
                    style={{
                      padding: "4px 8px",
                      fontSize: 12,
                      border: "1px solid var(--border)",
                      borderRadius: "var(--r-sm)",
                      background: "transparent",
                      color: "var(--muted-2)",
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tip box */}
      <div
        style={{
          padding: "12px 14px",
          background: "var(--primary-light)",
          border: "1px solid var(--primary-border)",
          borderRadius: "var(--r-md)",
          fontSize: 11,
          color: "var(--primary)",
          lineHeight: 1.7,
        }}
      >
        💡 Sign up with a temp email at{" "}
        <a
          href="https://serper.dev"
          target="_blank"
          rel="noreferrer"
          style={{ color: "var(--primary)", fontWeight: 700 }}
        >
          serper.dev
        </a>{" "}
        to get 2,500 free credits per account.
      </div>
    </div>
  );
}
