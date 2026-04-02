import type { LocationEntry } from '../types/job.types';

const BORDER: Record<string, string> = {
  pending: 'transparent',
  running: 'var(--lh-cyan)',
  done:    'var(--lh-green)',
  failed:  'var(--lh-danger)',
};

const DOT: Record<string, string> = {
  pending: 'var(--lh-muted2)',
  running: 'var(--lh-cyan)',
  done:    'var(--lh-green)',
  failed:  'var(--lh-danger)',
};

const COUNT_COLOR: Record<string, string> = {
  done:    'var(--lh-green)',
  running: 'var(--lh-cyan)',
  failed:  'var(--lh-danger)',
  pending: 'var(--lh-muted)',
};

export function LocationList({ locations }: { locations: LocationEntry[] }) {
  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
      }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>Location breakdown</span>
        <div style={{ display: 'flex', gap: 14 }}>
          {(['done', 'running', 'pending'] as const).map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: DOT[s] }} />
              <span style={{ fontSize: 11, color: 'var(--lh-muted)', fontFamily: 'var(--font-mono)' }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 8,
      }}>
        {locations.map(loc => (
          <div key={loc.name} style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            background: 'var(--lh-surface2)',
            borderRadius: 'var(--r-sm)',
            border: `1px solid ${BORDER[loc.status] ?? 'transparent'}`,
            opacity: loc.status === 'pending' ? 0.45 : 1,
            animation: loc.status === 'running' ? 'loc-pulse 1.5s ease-in-out infinite' : 'none',
            transition: 'opacity 0.3s, border-color 0.3s',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: DOT[loc.status] ?? 'var(--lh-muted2)',
              flexShrink: 0, marginRight: 8,
            }} />
            <span style={{
              flex: 1, fontSize: 12, color: 'var(--lh-text)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {loc.name}
            </span>
            {loc.status !== 'pending' && (
              <span style={{
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                color: COUNT_COLOR[loc.status] ?? 'var(--lh-muted)',
                marginLeft: 8, flexShrink: 0,
              }}>
                {loc.status === 'done' ? loc.emailsFound : loc.status === 'running' ? '...' : 'err'}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}