'use client';
import { Eye, PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function WatchlistPage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <div style={{ width: 40, height: 40, background: 'var(--amber-bg)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Eye size={20} color="var(--amber)" />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Watchlist</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Saved flights — price changes are detected every time you visit</p>
        </div>
      </div>

      {/* Empty state */}
      <div className="card" style={{ padding: 56, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, background: 'var(--amber-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Eye size={24} color="var(--amber)" />
        </div>
        <h2 style={{ fontWeight: 800, fontSize: 20, margin: '0 0 10px' }}>No flights watched yet</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 360, margin: '0 auto 24px', lineHeight: 1.6 }}>
          Search for flights and click the <strong>Watch</strong> button on any result to track its price. Peregrine will highlight changes when you return.
        </p>
        <Link href="/" className="btn btn-primary" style={{ display: 'inline-flex', justifyContent: 'center' }}>
          <PlusCircle size={15} />
          Search flights to watch
        </Link>
      </div>
    </div>
  );
}
