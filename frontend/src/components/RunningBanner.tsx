export function RunningBanner() {
  return (
    <div style={{
      background: '#00ff8810', border: '1px solid #00ff8825',
      borderRadius: 'var(--r-md)', padding: '12px 16px', marginBottom: 24,
      display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 13, color: 'var(--lh-green-mid)',
    }}>
      <div style={{
        width: 7, height: 7, borderRadius: '50%',
        background: 'var(--lh-green)', flexShrink: 0,
        animation: 'blink-dot 1.2s infinite',
      }} />
      Scraping in progress — you can leave this tab. We'll notify you when done.
    </div>
  );
}