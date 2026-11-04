'use client';
import { useEffect, useRef, useState } from 'react';
import { fmtCoord } from '@/lib/geo';
import type { HomeBase } from '@/lib/types';

interface Place {
  kind: 'town' | 'airport';
  label: string;
  detail: string;
  lat: number;
  lon: number;
  cc: string;
  airports: { code: string; name: string; km: number }[];
}

/** Home bases: towns or airports you can start from, each with the airports you're happy to fly from. */
export default function HomeBasePicker({ value, onChange }: { value: HomeBase[]; onChange: (v: HomeBase[]) => void }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [nearby, setNearby] = useState<Record<string, Place['airports']>>({});
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) return;
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
        const j = (await r.json()) as { places: Place[] };
        setHits(j.places);
        setActive(0);
        setOpen(true);
      } catch {
        setHits([]);
      }
    }, 220);
    return () => clearTimeout(timer.current);
  }, [q]);

  function add(p: Place) {
    const base: HomeBase = { label: p.label.replace(/ \([A-Z]{3}\)$/, ''), lat: p.lat, lon: p.lon, cc: p.cc, airports: p.airports.slice(0, p.kind === 'airport' ? 1 : 2).map((a) => a.code) };
    setNearby((n) => ({ ...n, [base.label]: p.airports }));
    onChange([...value.filter((v) => v.label !== base.label), base]);
    setQ('');
    setHits([]);
    setOpen(false);
  }

  function toggleAir(i: number, code: string) {
    const b = value[i];
    const airports = b.airports.includes(code) ? b.airports.filter((c) => c !== code) : [...b.airports, code];
    onChange(value.map((v, j) => (j === i ? { ...v, airports } : v)));
  }

  return (
    <div className="bases">
      {value.map((b, i) => {
        const airs = nearby[b.label] ?? b.airports.map((code) => ({ code, name: code, km: 0 }));
        return (
          <div className="base" key={b.label}>
            <div>
              <b>{b.label}</b> <span className="mono">{fmtCoord(b.lat, b.lon)}</span>
            </div>
            <button className="btn small ghost" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Remove ${b.label}`}>
              Remove
            </button>
            <div className="airs" aria-label="Airports to fly from">
              {airs.map((a) => (
                <button key={a.code} className="air" aria-pressed={b.airports.includes(a.code)} onClick={() => toggleAir(i, a.code)} title={`${a.name}${a.km ? `, ${a.km} km` : ''}`}>
                  {a.code}
                </button>
              ))}
              {!airs.length && <span className="muted" style={{ fontSize: '0.78rem' }}>nearest airports picked automatically</span>}
            </div>
          </div>
        );
      })}
      <div className="suggest">
        <input
          className="input"
          placeholder={value.length ? 'Add another starting point…' : 'Where are you based? e.g. Florence, Leeds, MAD'}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (!open || !hits.length) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(hits.length - 1, a + 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
            if (e.key === 'Enter') { e.preventDefault(); add(hits[active]); }
            if (e.key === 'Escape') setOpen(false);
          }}
          aria-label="Search for a home base"
        />
        {open && hits.length > 0 && (
          <ul role="listbox">
            {hits.map((h, i) => (
              <li key={`${h.kind}-${h.label}-${h.lat}`}>
                <button data-active={i === active} onMouseDown={(e) => e.preventDefault()} onClick={() => add(h)}>
                  <span>{h.label}</span>
                  <small>
                    {h.detail}
                    {h.kind === 'town' && h.airports.length ? ` · flies from ${h.airports.map((a) => a.code).join(', ')}` : ''}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
