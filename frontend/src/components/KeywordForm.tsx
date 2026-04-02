interface Props {
  keyword: string;
  onKeywordChange: (v: string) => void;
  onStart: () => void;
  disabled: boolean;
  loading: boolean;
}

export function KeywordForm({ keyword, onKeywordChange, onStart, disabled, loading }: Props) {
  const isDisabled = loading || !keyword.trim() || disabled;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 16 }}>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--lh-green)', pointerEvents: 'none',
        }}>_</span>
        <input
          value={keyword}
          onChange={e => onKeywordChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !isDisabled && onStart()}
          placeholder="roofing, gym, plumber, restaurant..."
          disabled={disabled}
          style={{
            width: '100%', background: '#0d0d14',
            border: '1px solid var(--lh-border)', borderRadius: 'var(--r-md)',
            padding: '13px 14px 13px 36px', color: 'var(--lh-text)',
            fontSize: 15, fontFamily: 'var(--font-sans)', outline: 'none',
            transition: 'border-color 0.2s', boxSizing: 'border-box' as const,
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--lh-green)')}
          onBlur={e => (e.target.style.borderColor = 'var(--lh-border)')}
        />
      </div>
      <button
        onClick={onStart}
        disabled={isDisabled}
        style={{
          padding: '13px 28px',
          background: isDisabled ? 'var(--lh-muted2)' : 'var(--lh-green)',
          color: isDisabled ? 'var(--lh-muted)' : '#0a0a0f',
          border: 'none', borderRadius: 'var(--r-md)',
          fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          letterSpacing: '0.06em', whiteSpace: 'nowrap' as const,
          transition: 'opacity 0.2s, background 0.2s',
        }}
      >
        {loading ? 'STARTING...' : 'EXECUTE'}
      </button>
    </div>
  );
}