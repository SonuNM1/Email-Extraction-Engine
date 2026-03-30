interface Props {
  completed: number;
  total: number;
  currentLocation: string;
}

export function ProgressBar({ completed, total, currentLocation }: Props) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14, color: '#666' }}>
        <span>{completed} / {total} locations</span>
        <span>{currentLocation ? `Scanning: ${currentLocation}` : ''}</span>
        <span>{pct}%</span>
      </div>
      <div style={{ background: '#e5e7eb', borderRadius: 8, height: 10 }}>
        <div style={{
          width: `${pct}%`,
          background: '#6366f1',
          height: '100%',
          borderRadius: 8,
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  );
}