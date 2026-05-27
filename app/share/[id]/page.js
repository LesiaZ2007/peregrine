import { decodePlan } from '@/lib/share';
import { Share2, Plane, Calendar, Users } from 'lucide-react';
import Link from 'next/link';

export default function SharePage({ params }) {
  const plan = decodePlan(params.id);

  if (!plan) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔗</div>
        <h1 style={{ fontWeight: 800, fontSize: 24, margin: '0 0 12px' }}>Link not found</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>This share link may be invalid or expired.</p>
        <Link href="/" className="btn btn-primary" style={{ display: 'inline-flex', justifyContent: 'center' }}>Start a new search</Link>
      </div>
    );
  }

  const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';

  const searchUrl = `/results?origins=${plan.origins?.join(',')}&destinations=${plan.destinations?.join(',')}&tripType=${plan.tripType || 'roundtrip'}&start=${plan.start || ''}&end=${plan.end || ''}&adults=${plan.adults || 1}&cabin=${plan.cabin || 'Economy'}${plan.layovers?.length ? `&layovers=${plan.layovers.join(',')}` : ''}`;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ width: 52, height: 52, background: 'var(--blue-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Share2 size={22} color="var(--blue)" />
          </div>
        </div>
        <h1 style={{ fontWeight: 800, fontSize: 26, margin: '0 0 8px' }}>Shared Trip Plan</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Searched via Peregrine{plan.searchedAt ? ` · ${new Date(plan.searchedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
        </p>
      </div>

      {/* Plan details */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
          <DetailItem icon={<Plane size={15} color="var(--blue)" />} label="Route" value={`${plan.origins?.join(', ') || '?'} → ${plan.destinations?.join(', ') || '?'}`} />
          <DetailItem icon={<Calendar size={15} color="var(--sky)" />} label="Dates" value={`${fmt(plan.start)}${plan.end ? ` → ${fmt(plan.end)}` : ''}`} />
          <DetailItem icon={<Users size={15} color="var(--green)" />} label="Travelers" value={`${plan.adults || 1} adult${plan.adults > 1 ? 's' : ''} · ${plan.cabin || 'Economy'}`} />
        </div>

        {plan.tripType && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <span className="pill pill-blue">{plan.tripType === 'roundtrip' ? 'Round trip' : plan.tripType === 'oneway' ? 'One way' : 'Multi-city'}</span>
            {plan.budget && <span className="pill pill-amber" style={{ marginLeft: 6 }}>Budget: ${plan.budget}</span>}
            {plan.layovers?.length > 0 && (
              <span className="pill pill-sky" style={{ marginLeft: 6 }}>
                Layovers: {plan.layovers.join(', ')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="card" style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Run this search yourself</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
          Search Peregrine with these exact parameters to see current prices and predictions.
        </p>
        <Link href={searchUrl} className="btn btn-primary" style={{ display: 'inline-flex', justifyContent: 'center', padding: '12px 24px', fontSize: 15 }}>
          <Plane size={16} />
          Search these flights
        </Link>
      </div>
    </div>
  );
}

function DetailItem({ icon, label, value }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>
        {icon} {label}
      </div>
      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{value}</div>
    </div>
  );
}
