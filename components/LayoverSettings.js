'use client';
import { useState } from 'react';
import { Plane, Settings, ChevronDown, ChevronUp, Info } from 'lucide-react';

export const INTERESTING_LAYOVERS = [
  { code: 'DXB', city: 'Dubai', country: 'UAE', emoji: '🇦🇪', note: 'World-class shopping & skyline' },
  { code: 'DOH', city: 'Doha', country: 'Qatar', emoji: '🇶🇦', note: 'Stunning Hamad airport & old souk' },
  { code: 'AUH', city: 'Abu Dhabi', country: 'UAE', emoji: '🇦🇪', note: 'Sheikh Zayed Mosque & F1 circuit' },
  { code: 'AMS', city: 'Amsterdam', country: 'Netherlands', emoji: '🇳🇱', note: 'Canals, Rijksmuseum & cycling' },
  { code: 'IST', city: 'Istanbul', country: 'Turkey', emoji: '🇹🇷', note: 'Hagia Sophia & grand bazaar' },
  { code: 'SIN', city: 'Singapore', country: 'Singapore', emoji: '🇸🇬', note: 'Changi & Gardens by the Bay' },
  { code: 'ICN', city: 'Seoul', country: 'South Korea', emoji: '🇰🇷', note: 'K-food, K-pop culture & palaces' },
  { code: 'NRT', city: 'Tokyo', country: 'Japan', emoji: '🇯🇵', note: 'Narita city temples & city day trips' },
  { code: 'LHR', city: 'London', country: 'UK', emoji: '🇬🇧', note: 'Historic landmarks & world-class museums' },
  { code: 'CDG', city: 'Paris', country: 'France', emoji: '🇫🇷', note: 'Eiffel Tower & Louvre day trip' },
  { code: 'FRA', city: 'Frankfurt', country: 'Germany', emoji: '🇩🇪', note: 'Medieval old town & apple wine' },
  { code: 'ZRH', city: 'Zurich', country: 'Switzerland', emoji: '🇨🇭', note: 'Alps views & Swiss chocolate' },
  { code: 'HKG', city: 'Hong Kong', country: 'HK', emoji: '🇭🇰', note: 'Skyline ferry, dim sum & markets' },
  { code: 'TPE', city: 'Taipei', country: 'Taiwan', emoji: '🇹🇼', note: 'Night markets & Taipei 101' },
  { code: 'KUL', city: 'Kuala Lumpur', country: 'Malaysia', emoji: '🇲🇾', note: 'Petronas Towers & hawker food' },
];

export default function LayoverSettings({ value = new Set(), onChange }) {
  const [expanded, setExpanded] = useState(false);

  const toggle = (code) => {
    const next = new Set(value);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange(next);
  };

  const count = value.size;

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1.5px solid var(--border)',
      borderRadius: 'var(--r)',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <div style={{
          width: 32, height: 32,
          background: count > 0 ? 'var(--blue-light)' : 'var(--bg-2)',
          borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Plane size={15} color={count > 0 ? 'var(--blue)' : 'var(--text-muted)'} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
            Interesting Layovers
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {count === 0
              ? 'Opt in to embrace layovers in amazing cities (20h+)'
              : `${count} airport${count > 1 ? 's' : ''} opted in — flights with these layovers will be prioritized`}
          </div>
        </div>
        {expanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: 16 }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '8px 12px', background: 'var(--blue-light)',
            borderRadius: 'var(--r-sm)', marginBottom: 14, fontSize: 12, color: 'var(--blue)',
          }}>
            <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Flights with ≥20h layovers at your checked airports will appear at the top of results with a layover badge. Perfect for turning a long connection into a mini adventure.</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {INTERESTING_LAYOVERS.map(lv => {
              const checked = value.has(lv.code);
              return (
                <button
                  key={lv.code}
                  onClick={() => toggle(lv.code)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 'var(--r-sm)',
                    border: `1.5px solid ${checked ? 'var(--blue)' : 'var(--border)'}`,
                    background: checked ? 'var(--blue-light)' : 'var(--bg-2)',
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    transition: 'all .15s',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{lv.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: checked ? 'var(--blue)' : 'var(--text)' }}>
                      {lv.city}
                      <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 600, opacity: .6 }}>{lv.code}</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lv.note}
                    </div>
                  </div>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4,
                    border: `2px solid ${checked ? 'var(--blue)' : 'var(--border-2)'}`,
                    background: checked ? 'var(--blue)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all .12s',
                  }}>
                    {checked && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1, fontWeight: 900 }}>✓</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
