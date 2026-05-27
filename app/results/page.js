'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowLeft, Search } from 'lucide-react';

function ResultsContent() {
  const params = useSearchParams();
  const router = useRouter();

  const origins = params.get('origins')?.split(',').filter(Boolean) || [];
  const destinations = params.get('destinations')?.split(',').filter(Boolean) || [];
  const tripType = params.get('tripType') || 'roundtrip';
  const start = params.get('start');
  const end = params.get('end');
  const adults = params.get('adults') || '1';
  const cabin = params.get('cabin') || 'Economy';

  const formatDate = (iso) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return iso; }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
      {/* Back + summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <button onClick={() => router.back()} className="btn btn-secondary" style={{ padding: '7px 12px' }}>
          <ArrowLeft size={15} />
          Back
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
            {origins.join(', ')} → {destinations.join(', ')}
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            {formatDate(start)}{end ? ` → ${formatDate(end)}` : ''} · {adults} adult{Number(adults) > 1 ? 's' : ''} · {cabin} · {tripType === 'roundtrip' ? 'Round trip' : tripType === 'oneway' ? 'One way' : 'Multi-city'}
          </div>
        </div>
      </div>

      {/* Placeholder — flight results will be built in Phase 4 */}
      <div className="card" style={{ padding: 48, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, background: 'var(--blue-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Search size={24} color="var(--blue)" />
        </div>
        <h2 style={{ fontWeight: 800, fontSize: 20, margin: '0 0 10px' }}>Flight results coming soon</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 380, margin: '0 auto 24px' }}>
          Search infrastructure is in progress. Once Amadeus API keys are configured, live results will appear here with price predictions, comparisons, and layover highlights.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {destinations.map(dest => (
            <div key={dest} className="pill pill-blue" style={{ fontSize: 13, padding: '6px 14px' }}>
              ✈️ {dest}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading results…</div>}>
      <ResultsContent />
    </Suspense>
  );
}
