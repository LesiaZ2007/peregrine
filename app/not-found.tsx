import Link from 'next/link';
import { Mark } from '@/components/icons';

export const metadata = {
  title: 'Off the chart · Peregrine',
};

/** Custom 404 matching Peregrine's cartographic paper ledger and waypoint mark. */
export default function NotFound() {
  return (
    <div className="page" style={{ minHeight: 'calc(100dvh - 54px)', alignContent: 'center', maxWidth: 640 }}>
      <div className="empty" style={{ display: 'grid', gap: 16, justifyItems: 'center', padding: '48px 28px', background: 'var(--paper-2)' }}>
        <Mark className="brand-mark" />
        <p className="caps muted" style={{ margin: 0, letterSpacing: '0.14em' }}>404 · Unmapped coordinates</p>
        <h1 style={{ fontSize: '1.85rem', margin: 0 }}>Nowhere on this chart</h1>
        <p className="muted" style={{ margin: 0, maxWidth: '42ch', lineHeight: 1.55 }}>
          That route isn’t plotted here. Head back to the planner to search from your home base, or try the preloaded Prague weekend demo.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 6 }}>
          <Link href="/" className="btn primary">
            Open planner
          </Link>
          <Link href="/demo" className="btn">
            Try Prague demo
          </Link>
          <a href="https://lastivka.dev/guide/peregrine/" className="btn ghost" rel="noopener">
            Back to Lastivka ↗
          </a>
        </div>
      </div>
    </div>
  );
}
