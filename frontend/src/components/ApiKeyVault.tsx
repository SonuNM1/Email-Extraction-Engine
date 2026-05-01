import { useState } from "react";

interface StoredKey {
  id: string;
  key: string;
  creditsRemaining?: number;
  lastChecked?: string;
}

interface Props {
  onUse: (key: string) => void;
  activeKey: string;
}

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 5) + " •••••••••••• " + key.slice(-4);
}

export function ApiKeyVault({ onUse, activeKey }: Props) {
  const [keys, setKeys] = useState<StoredKey[]>(() => {
    try {
      const saved = localStorage.getItem("apiKeyVault");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [input, setInput] = useState("");

  const addKey = () => {
    const trimmed = input.trim();
    if (!trimmed || keys.some((k) => k.key === trimmed)) return;
    const updated = [...keys, { id: Date.now().toString(), key: trimmed }];
    setKeys(updated);
    localStorage.setItem("apiKeyVault", JSON.stringify(updated));
    setInput("");
  };

  const removeKey = (id: string) => {
    const updated = keys.filter((k) => k.id !== id);
    setKeys(updated);
    localStorage.setItem("apiKeyVault", JSON.stringify(updated));
  };

  const inputBase: React.CSSProperties = {
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
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Title */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
          }}
        >
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
      </div>

      {/* Input + Add */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          type="text"
          placeholder="Paste Serper API key..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addKey()}
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
        <button
          onClick={addKey}
          disabled={!input.trim()}
          style={{
            padding: "9px",
            background: input.trim() ? "var(--primary)" : "var(--border)",
            color: input.trim() ? "#fff" : "var(--muted)",
            border: "none",
            borderRadius: "var(--r-md)",
            fontSize: 12,
            fontWeight: 700,
            cursor: input.trim() ? "pointer" : "not-allowed",
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
        <div
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
        </div>

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
                  key={k.id}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "var(--r-md)",
                    border: `1.5px solid ${isActive ? "var(--primary)" : "var(--border)"}`,
                    background: isActive
                      ? "var(--primary-light)"
                      : "var(--surface-2)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "all 0.2s",
                    animation: "slide-in 0.25s ease",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-2)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {maskKey(k.key)}
                    </div>
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
                      {k.creditsRemaining !== undefined ? (
                        <span
                          style={{
                            fontSize: 10,
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
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
                            border: `1px solid ${
                              k.creditsRemaining === 0
                                ? "#fecaca"
                                : k.creditsRemaining < 200
                                  ? "#fde68a"
                                  : "#6ee7b7"
                            }`,
                            borderRadius: 4,
                            padding: "1px 6px",
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
                            color: "var(--muted-2)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          ⚪ Never used
                        </span>
                      )}
                      {/* Active indicator */}
                      {isActive && (
                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--primary)",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <div
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: "var(--primary)",
                              animation: "pulse-dot 2s infinite",
                            }}
                          />
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Actions */}
                  <button
                    onClick={() => onUse(k.key)}
                    style={{
                      padding: "4px 12px",
                      fontSize: 11,
                      fontWeight: 700,
                      border: `1.5px solid ${isActive ? "var(--primary)" : "var(--primary-border)"}`,
                      borderRadius: "var(--r-sm)",
                      background: isActive ? "var(--primary)" : "transparent",
                      color: isActive ? "#fff" : "var(--primary)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isActive ? "✓ Using" : "Use"}
                  </button>
                  <button
                    onClick={() => removeKey(k.id)}
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
          fontSize: 14,
          color: "var(--primary)",
          lineHeight: 1.7,
        }}
      >
        💡 <strong></strong> Sign up with a temp email at{" "}
        <a
          href="https://serper.dev"
          target="_blank"
          rel="noreferrer"
          style={{ color: "var(--primary)", fontWeight: 700 }}
        >
          serper.dev
        </a>{" "}
        to get 2,500 fresh credits per account.
      </div>
    </div>
  );
}
