import { DESTINATION_COSTS, INTERESTING_LAYOVERS } from '@/lib/destinations';
import { DESTINATIONS } from '@/lib/airports';
import { Hotel, Utensils, Map, Plane, ArrowLeft, Shield, Calendar } from 'lucide-react';
import Link from 'next/link';

export async function generateStaticParams() {
  return Object.keys(DESTINATION_COSTS).map(code => ({ code }));
}

export function generateMetadata({ params }) {
  const dest = DESTINATIONS.find(d => d.code === params.code);
  return {
    title: dest ? `${dest.city} · Peregrine` : `Destination · Peregrine`,
    description: `Flight prices, cost of staying, and travel info for ${dest?.city || params.code}`,
  };
}

export default function DestinationPage({ params }) {
  const { code } = params;
  const cost = DESTINATION_COSTS[code];
  const dest = DESTINATIONS.find(d => d.code === code);
  const layover = INTERESTING_LAYOVERS.find(l => l.code === code);

  if (!dest && !cost) {
    return (
      <div style={{ maxWidth: 700, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <h1 style={{ fontWeight: 800 }}>Destination not found</h1>
        <Link href="/" className="btn btn-primary" style={{ display: 'inline-flex', marginTop: 20 }}>Back to search</Link>
      </div>
    );
  }

  const nights = 7;
  const totalEst = cost ? (cost.hotel * nights) + (cost.meal * 3 * nights) + (cost.excursion * 3) : null;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px' }}>
      {/* Back */}
      <Link href="/" className="btn btn-secondary" style={{ display: 'inline-flex', marginBottom: 24 }}>
        <ArrowLeft size={15} /> Back to search
      </Link>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, var(--navy), #1a4480)', borderRadius: 'var(--r-xl)', padding: '40px 32px', marginBottom: 24, color: '#fff' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>{dest?.emoji || '🌍'}</div>
        <h1 style={{ fontWeight: 800, fontSize: 32, margin: '0 0 8px', color: '#fff' }}>
          {dest?.city || code}
        </h1>
        <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 16, margin: 0 }}>
          {dest?.country} · {dest?.region} · {code}
        </p>
        {layover && (
          <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(14,165,233,.2)', border: '1px solid rgba(14,165,233,.3)', borderRadius: 'var(--r-full)', color: '#7dd3fc', fontSize: 13, fontWeight: 600 }}>
            <Plane size={12} /> Popular Peregrine layover destination
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
        {/* Cost of staying */}
        {cost && (
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontWeight: 800, fontSize: 18, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Map size={18} color="var(--sky)" /> Cost of Staying
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
              <CostCard icon={<Hotel size={16} />} label="Hotel/night" value={`$${cost.hotel}`} />
              <CostCard icon={<Utensils size={16} />} label="Avg meal" value={`$${cost.meal}`} />
              <CostCard icon={<Map size={16} />} label="Excursion" value={`$${cost.excursion}`} />
            </div>
            <div style={{ padding: '12px', background: 'var(--blue-light)', borderRadius: 'var(--r-sm)', marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Estimated total for {nights} nights</div>
              <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--blue)' }}>${Math.round(totalEst).toLocaleString()}</div>
            </div>
            {cost.notes && <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>{cost.notes}</p>}
          </div>
        )}

        {/* Travel info */}
        {cost && (
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontWeight: 800, fontSize: 18, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={18} color="var(--green)" /> Travel Info
            </h2>
            <InfoRow label="Currency" value={cost.currency} />
            <InfoRow label="Safety" value={cost.safety} />
            <InfoRow label="Daily estimate" value={`~$${cost.daily}/day all-in`} />
            {cost.bestMonths && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
                  <Calendar size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />Best months to visit
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {cost.bestMonths.map(m => (
                    <span key={m} className="pill pill-green">{m}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="card" style={{ padding: 24, marginTop: 20, textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Ready to search flights to {dest?.city || code}?</div>
        <Link
          href={`/?destination=${code}`}
          className="btn btn-primary"
          style={{ display: 'inline-flex', padding: '12px 24px', fontSize: 15 }}
        >
          <Plane size={16} />
          Search flights to {dest?.city || code}
        </Link>
      </div>
    </div>
  );
}

function CostCard({ icon, label, value }) {
  return (
    <div style={{ background: 'var(--bg-2)', padding: '10px', borderRadius: 8, textAlign: 'center' }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4, display: 'flex', justifyContent: 'center' }}>{icon}</div>
      <div style={{ fontWeight: 800, fontSize: 16 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
