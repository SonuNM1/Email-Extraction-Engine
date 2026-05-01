import { LOCATIONS } from '../utils/locations';

export interface LocationStatus {
  status: 'pending' | 'running' | 'done';
  emailCount: number;
}

interface Props {
  locationData: Record<string, LocationStatus>;
  isRunning: boolean;
}

export function LocationGrid({ locationData }: Props) {
  const doneCount = Object.values(locationData).filter(l => l.status === 'done').length;

  return (
    <div>
      {/* Overall progress bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${(doneCount / LOCATIONS.length) * 100}%`,
            background: 'linear-gradient(90deg, var(--primary), var(--running))',
            borderRadius: 3,
            transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5, fontFamily: 'var(--font-mono)' }}>
          {doneCount} of {LOCATIONS.length} locations complete
        </div>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 6,
        maxHeight: 320,
        overflowY: 'auto',
        paddingRight: 2,
      }}>
        {LOCATIONS.map((loc, i) => {
          const data    = locationData[loc];
          const status  = data?.status ?? 'pending';
          const count   = data?.emailCount ?? 0;

          return (
            <div
              key={loc}
              style={{
                padding: '7px 9px',
                borderRadius: 'var(--r-md)',
                border: `1px solid ${
                  status === 'done'    ? 'var(--success-border)' :
                  status === 'running' ? 'var(--running-border)' :
                  'var(--border)'
                }`,
                background:
                  status === 'done'    ? 'var(--success-light)' :
                  status === 'running' ? 'var(--running-light)'  :
                  'var(--surface-2)',
                transition: 'all 0.3s',
                animation: `fade-in 0.3s ease ${Math.min(i * 0.008, 0.3)}s both`,
              }}
            >
              {/* Location name */}
              <div style={{
                fontSize: 9,
                fontWeight: 700,
                color:
                  status === 'done'    ? 'var(--success)' :
                  status === 'running' ? 'var(--running)'  :
                  'var(--text-2)',
                marginBottom: 3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}>
                {status === 'running' && (
                  <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: 'var(--running)', animation: 'pulse-dot 1.2s infinite', flexShrink: 0 }} />
                )}
                {status === 'done' && <span style={{ flexShrink: 0 }}>✓</span>}
                {loc}
              </div>

              {/* Email count */}
              <div style={{
                fontSize: 14,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color:
                  status === 'done'    ? 'var(--success)' :
                  status === 'running' ? 'var(--running)'  :
                  'var(--muted-2)',
              }}>
                {count > 0 ? count.toLocaleString() : '—'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}