'use client';
import { useState } from 'react';
import { Hotel, Utensils, Map, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { getCostData } from '@/lib/destinations';

export default function CostOfStaying({ destCode, nights = 7 }) {
  const [open, setOpen] = useState(false);
  const data = getCostData(destCode);
  if (!data) return null;

  const totalEst = (data.hotel * nights) + (data.meal * 3 * nights) + (data.excursion * Math.ceil(nights / 2));

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Map size={13} color="var(--sky)" />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>
            Est. cost of staying · ~${Math.round(totalEst).toLocaleString()} for {nights} nights
          </span>
        </div>
        {open ? <ChevronUp size={13} color="var(--text-muted)" /> : <ChevronDown size={13} color="var(--text-muted)" />}
      </button>

      {open && (
        <div style={{ padding: '0 14px 12px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
            <CostItem icon={<Hotel size={13} />} label="Hotel/night" value={`~$${data.hotel}`} />
            <CostItem icon={<Utensils size={13} />} label="Avg meal" value={`~$${data.meal}`} />
            <CostItem icon={<Map size={13} />} label="Excursion" value={`~$${data.excursion}`} />
          </div>

          {data.notes && (
            <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--bg-2)', borderRadius: 6, fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 6 }}>
              <Info size={11} style={{ flexShrink: 0, marginTop: 1 }} />
              {data.notes}
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            <span style={{ fontSize: 11, padding: '2px 8px', background: 'var(--sky-light)', color: '#0369a1', borderRadius: 'var(--r-full)', fontWeight: 600 }}>
              Currency: {data.currency}
            </span>
            <span style={{ fontSize: 11, padding: '2px 8px', background: 'var(--green-bg)', color: 'var(--green)', borderRadius: 'var(--r-full)', fontWeight: 600 }}>
              Safety: {data.safety}
            </span>
            {data.bestMonths && (
              <span style={{ fontSize: 11, padding: '2px 8px', background: 'var(--amber-bg)', color: 'var(--amber)', borderRadius: 'var(--r-full)', fontWeight: 600 }}>
                Best: {data.bestMonths.join(', ')}
              </span>
            )}
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-light)', marginTop: 8, marginBottom: 0 }}>
            Estimates are rough averages — costs vary by neighborhood, season, and spending habits.
          </p>
        </div>
      )}
    </div>
  );
}

function CostItem({ icon, label, value }) {
  return (
    <div style={{ background: 'var(--bg-2)', padding: '8px 10px', borderRadius: 8, textAlign: 'center' }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4, display: 'flex', justifyContent: 'center' }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  );
}
