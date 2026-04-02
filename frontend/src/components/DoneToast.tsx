interface Props {
  totalEmails: number;
  visible: boolean;
}

export function DoneToast({ totalEmails, visible }: Props) {
  if (!visible) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28,
      background: 'var(--lh-surface)', border: '1px solid var(--lh-green)',
      borderRadius: 'var(--r-lg)', padding: '16px 22px',
      boxShadow: '0 0 40px #00ff8820', zIndex: 9999, minWidth: 260,
    }}>
      <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--lh-green)', marginBottom: 4 }}>
        ✓ SCRAPE COMPLETE
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--lh-text)', marginBottom: 4 }}>
        {totalEmails.toLocaleString()} emails
      </div>
      <div style={{ fontSize: 12, color: 'var(--lh-muted)' }}>Check below to download your CSV</div>
    </div>
  );
}