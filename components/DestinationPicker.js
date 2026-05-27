'use client';
import { useState, useRef, useEffect } from 'react';
import { MapPin, X, Sparkles, Search } from 'lucide-react';
import { DESTINATIONS, SIMILAR_DESTINATIONS } from '@/lib/airports';

// Re-export so server components can import from lib/airports directly
export { DESTINATIONS };

function getSuggestions(selected) {
  if (selected.length === 0) return [];
  const codes = new Set(selected.map(d => d.code));
  const suggestCodes = new Set();
  selected.forEach(d => {
    (SIMILAR_DESTINATIONS[d.code] || []).forEach(c => { if (!codes.has(c)) suggestCodes.add(c); });
  });
  return DESTINATIONS.filter(d => suggestCodes.has(d.code)).slice(0, 4);
}

function filterDests(query) {
  const q = query.toLowerCase();
  return DESTINATIONS.filter(d =>
    d.code.toLowerCase().includes(q) ||
    d.iata.toLowerCase().includes(q) ||
    d.city.toLowerCase().includes(q) ||
    d.country.toLowerCase().includes(q)
  ).slice(0, 8);
}

export default function DestinationPicker({ value = [], onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const suggestions = getSuggestions(value);
  const results = query.length >= 1 ? filterDests(query) : DESTINATIONS.slice(0, 8);

  const addDest = (dest) => {
    if (value.find(d => d.code === dest.code)) return;
    if (value.length >= 5) return;
    onChange([...value, dest]);
    setQuery('');
    setOpen(false);
  };

  const removeDest = (code) => onChange(value.filter(d => d.code !== code));

  useEffect(() => {
    const handler = (e) => { if (!containerRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>
        <MapPin size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
        Destinations
        <span style={{ marginLeft: 6, fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-light)' }}>
          (up to 5)
        </span>
      </label>

      {/* Selected destinations */}
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {value.map(dest => (
            <div key={dest.code} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--sky-light)', border: '1.5px solid #bae6fd',
              borderRadius: 'var(--r-full)', padding: '4px 10px 4px 12px',
              fontSize: 13, fontWeight: 600, color: '#0369a1',
            }}>
              <span>{dest.emoji}</span>
              <span>{dest.city}</span>
              <span style={{ fontWeight: 400, opacity: .75, fontSize: 12 }}>{dest.code}</span>
              <button onClick={() => removeDest(dest.code)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0369a1', opacity: .7, padding: 0, display: 'flex', marginLeft: 2 }}>
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Sparkles size={10} /> Peregrine suggests
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {suggestions.map(dest => (
              <button
                key={dest.code}
                onClick={() => addDest(dest)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 'var(--r-full)', background: 'var(--surface)', border: '1.5px dashed var(--border-2)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', fontFamily: 'inherit', transition: 'all .12s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sky)'; e.currentTarget.style.color = '#0369a1'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-2)'; }}
              >
                {dest.emoji} {dest.city}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      {value.length < 5 && (
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            ref={inputRef}
            className="field"
            style={{ paddingLeft: 36 }}
            placeholder={value.length === 0 ? 'Search destination (e.g. Tokyo, Japan)' : 'Add another destination…'}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
          />
        </div>
      )}

      {/* Dropdown */}
      {open && value.length < 5 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--surface)', border: '1.5px solid var(--border-2)', borderRadius: 'var(--r)', boxShadow: 'var(--shadow-md)', zIndex: 200, overflow: 'hidden', maxHeight: 320, overflowY: 'auto', animation: 'slide-up .15s var(--ease)' }}>
          {!query && <div style={{ padding: '8px 14px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Popular destinations</div>}
          {results.map(dest => {
            const selected = value.find(d => d.code === dest.code);
            return (
              <button
                key={dest.code}
                onClick={() => addDest(dest)}
                disabled={!!selected}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: 'none', background: selected ? 'var(--sky-light)' : 'transparent', cursor: selected ? 'default' : 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'background .1s' }}
                onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--bg-2)'; }}
                onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: 22, flexShrink: 0 }}>{dest.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: selected ? '#0369a1' : 'var(--text)' }}>{dest.city}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {dest.country} · {dest.iata}
                    <span style={{ marginLeft: 6, padding: '1px 6px', background: 'var(--bg-2)', borderRadius: 4, fontSize: 10, fontWeight: 600, color: 'var(--text-light)' }}>{dest.region}</span>
                  </div>
                </div>
                {selected && <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1' }}>Added</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
