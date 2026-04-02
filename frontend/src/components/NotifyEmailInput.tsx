interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}

export function NotifyEmailInput({ value, onChange, disabled }: Props) {
  const labelStyle: React.CSSProperties = {
    fontSize: 11, color: 'var(--lh-muted)',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    marginBottom: 7, display: 'block',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#0d0d14',
    border: '1px solid var(--lh-border)', borderRadius: 'var(--r-md)',
    padding: '11px 14px', color: 'var(--lh-text)',
    fontSize: 13, fontFamily: 'var(--font-sans)',
    outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
      <div>
        <label style={labelStyle}>✉ Email when done</label>
        <input
          type="email" value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="notify@youremail.com"
          disabled={disabled} style={inputStyle}
          onFocus={e => (e.target.style.borderColor = 'var(--lh-cyan)')}
          onBlur={e => (e.target.style.borderColor = 'var(--lh-border)')}
        />
      </div>
      <div>
        <label style={labelStyle}>🔔 Push notification</label>
        <input
          placeholder="Allowed via browser prompt on start"
          disabled style={{ ...inputStyle, opacity: 0.4, cursor: 'not-allowed' }}
        />
      </div>
    </div>
  );
}