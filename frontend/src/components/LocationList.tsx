import type { LocationEntry } from '../types/job.types';

const STATUS_COLOR: Record<string, string> = {
  pending: '#d1d5db',
  running: '#fbbf24',
  done: '#34d399',
  failed: '#f87171',
};

export function LocationList({ locations }: { locations: LocationEntry[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
      {locations.map(loc => (
        <div key={loc.name} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px', background: '#f9fafb',
          borderRadius: 6, fontSize: 13,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: STATUS_COLOR[loc.status],
            flexShrink: 0,
          }} />
          <span style={{ flex: 1 }}>{loc.name}</span>
          {loc.status === 'done' && (
            <span style={{ color: '#6b7280', fontSize: 11 }}>{loc.emailsFound}</span>
          )}
        </div>
      ))}
    </div>
  );
}