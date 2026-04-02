interface Props {
  completed: number;
  total: number;
  currentLocation: string;
}

export function ProgressBar({ completed, total, currentLocation }: Props) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
      }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--lh-text)' }}>
          Scanning states
        </span>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--lh-cyan)' }}>
          {pct}%{currentLocation ? ` — ${currentLocation}` : ''}
        </span>
      </div>

      <div style={{
        height: 6,
        background: 'var(--lh-surface2)',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 8,
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: 'linear-gradient(90deg, var(--lh-green), var(--lh-cyan))',
          borderRadius: 3,
          transition: 'width 0.6s ease',
        }} />
      </div>

      <div style={{
        fontSize: 11,
        fontFamily: 'var(--font-mono)',
        color: 'var(--lh-muted)',
        display: 'flex',
        gap: 16,
      }}>
        <span style={{ color: 'var(--lh-green)' }}>{completed} completed</span>
        {currentLocation && <span style={{ color: 'var(--lh-cyan)' }}>{currentLocation} active</span>}
        <span>{total - completed} pending</span>
      </div>
    </div>
  );
}