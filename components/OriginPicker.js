'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { PlaneTakeoff, X, Plus, Search, Loader } from 'lucide-react';

// Popular US + major international airports — shown before any typing
const POPULAR = [
  { code: 'BOS', name: 'Boston Logan', city: 'Boston', country: 'US' },
  { code: 'JFK', name: 'John F. Kennedy', city: 'New York', country: 'US' },
  { code: 'LGA', name: 'LaGuardia', city: 'New York', country: 'US' },
  { code: 'EWR', name: 'Newark Liberty', city: 'Newark', country: 'US' },
  { code: 'LAX', name: 'Los Angeles Intl', city: 'Los Angeles', country: 'US' },
  { code: 'ORD', name: "O'Hare Intl", city: 'Chicago', country: 'US' },
  { code: 'ATL', name: 'Hartsfield-Jackson', city: 'Atlanta', country: 'US' },
  { code: 'SFO', name: 'San Francisco Intl', city: 'San Francisco', country: 'US' },
  { code: 'MIA', name: 'Miami Intl', city: 'Miami', country: 'US' },
  { code: 'SEA', name: 'Seattle-Tacoma', city: 'Seattle', country: 'US' },
  { code: 'DFW', name: 'Dallas/Fort Worth', city: 'Dallas', country: 'US' },
  { code: 'DEN', name: 'Denver Intl', city: 'Denver', country: 'US' },
  { code: 'PVD', name: 'T.F. Green', city: 'Providence', country: 'US' },
  { code: 'MHT', name: 'Manchester-Boston Regional', city: 'Manchester', country: 'US' },
  { code: 'LHR', name: 'Heathrow', city: 'London', country: 'UK' },
  { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'FR' },
];

function filterStatic(query) {
  const q = query.toLowerCase();
  return POPULAR.filter(a =>
    a.code.toLowerCase().includes(q) ||
    a.name.toLowerCase().includes(q) ||
    a.city.toLowerCase().includes(q)
  ).slice(0, 6);
}

export default function OriginPicker({ value = [], onChange }) {
  const [query, setQuery]       = useState('');
  const [open, setOpen]         = useState(false);
  const [liveResults, setLive]  = useState(null);
  const [loading, setLoading]   = useState(false);
  const inputRef    = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Live Amadeus airport search — debounced 300ms
  const fetchLive = useCallback(async (q) => {
    if (q.length < 2) { setLive(null); return; }
    setLoading(true);
    try {
      const res  = await fetch(`/api/locations/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (json.error === 'api_keys_missing' || !json.data?.length) {
        setLive(null);
      } else {
        setLive(json.data.map(loc => ({
          code:    loc.code,
          name:    loc.name || loc.city,
          city:    loc.city || loc.name,
          country: loc.countryCode || loc.country || '',
        })));
      }
    } catch {
      setLive(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!query) { setLive(null); setLoading(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchLive(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, fetchLive]);

  const results = query.length >= 1
    ? (liveResults ?? filterStatic(query))
    : POPULAR.slice(0, 6);

  const addOrigin = (airport) => {
    if (value.find(a => a.code === airport.code)) return;
    onChange([...value, airport]);
    setQuery('');
    setLive(null);
    inputRef.current?.focus();
  };

  const removeOrigin = (code) => onChange(value.filter(a => a.code !== code));

  useEffect(() => {
    const handler = (e) => { if (!containerRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>
        <PlaneTakeoff size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
        From
      </label>

      {/* Selected origins */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: value.length > 0 ? 8 : 0 }}>
        {value.map(airport => (
          <div key={airport.code} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'var(--blue)', color: '#fff',
            borderRadius: 'var(--r-full)',
            padding: '4px 10px 4px 12px',
            fontSize: 13, fontWeight: 700,
          }}>
            {airport.code}
            <span style={{ fontWeight: 400, opacity: .8, fontSize: 12 }}>{airport.city}</span>
            <button onClick={() => removeOrigin(airport.code)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', opacity: .8, padding: 0, display: 'flex', marginLeft: 2 }}>
              <X size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ position: 'relative' }}>
        {loading
          ? <Loader size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--blue)', animation: 'spin 1s linear infinite', pointerEvents: 'none' }} />
          : <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        }
        <input
          ref={inputRef}
          className="field"
          style={{ paddingLeft: 36 }}
          placeholder={value.length === 0 ? 'City or airport code (e.g. BOS)' : 'Add another origin…'}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'var(--surface)',
          border: '1.5px solid var(--border-2)',
          borderRadius: 'var(--r)',
          boxShadow: 'var(--shadow-md)',
          zIndex: 200, overflow: 'hidden',
          animation: 'slide-up .15s var(--ease)',
        }}>
          {!query && (
            <div style={{ padding: '8px 14px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Popular airports
            </div>
          )}
          {query && liveResults && (
            <div style={{ padding: '8px 14px 4px', fontSize: 11, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Live results
            </div>
          )}
          {results.length === 0 && !loading && (
            <div style={{ padding: '14px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
              No airports found for "{query}"
            </div>
          )}
          {results.map(airport => {
            const selected = value.find(a => a.code === airport.code);
            return (
              <button
                key={airport.code}
                onClick={() => { addOrigin(airport); setOpen(false); }}
                disabled={!!selected}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: 'none', background: selected ? 'var(--blue-light)' : 'transparent', cursor: selected ? 'default' : 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'background .1s' }}
                onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--bg-2)'; }}
                onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ width: 38, height: 28, background: selected ? 'var(--blue)' : 'var(--bg-2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: selected ? '#fff' : 'var(--blue)', flexShrink: 0, letterSpacing: '.5px' }}>
                  {airport.code}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: selected ? 'var(--blue)' : 'var(--text)' }}>{airport.city}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{airport.name} · {airport.country}</div>
                </div>
                {selected && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: 'var(--blue)' }}>Added</span>}
              </button>
            );
          })}
          {value.length === 0 && (
            <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
              <Plus size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
              Select multiple origins to compare departure airports
            </div>
          )}
        </div>
      )}
    </div>
  );
}
