interface Props {
  total: number;
  isRunning: boolean;
}

export function EmailCounter({ total, isRunning }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>

      <div style={{ background: 'var(--lh-surface)', border: '1px solid var(--lh-border)', borderRadius: 'var(--r-md)', padding: '18px 20px' }}>
        <div style={{ fontSize: 30, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--lh-green)', lineHeight: 1, marginBottom: 6 }}>
          {total.toLocaleString()}
        </div>
        <div style={{ fontSize: 11, color: 'var(--lh-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Emails found
        </div>
      </div>

      <div style={{ background: 'var(--lh-surface)', border: '1px solid var(--lh-border)', borderRadius: 'var(--r-md)', padding: '18px 20px' }}>
        <div style={{ fontSize: 30, fontWeight: 700, fontFamily: 'var(--font-mono)', color: isRunning ? 'var(--lh-warn)' : 'var(--lh-green)', lineHeight: 1, marginBottom: 6 }}>
          {isRunning ? 'Live' : 'Done'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--lh-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {isRunning ? 'Updating live' : 'Final count'}
        </div>
      </div>

      <div style={{ background: 'var(--lh-surface)', border: '1px solid var(--lh-border)', borderRadius: 'var(--r-md)', padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--lh-green)', animation: 'blink-dot 1.5s infinite' }} />
          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--lh-green)' }}>CONNECTED</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--lh-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Serper API</div>
      </div>

    </div>
  );
}