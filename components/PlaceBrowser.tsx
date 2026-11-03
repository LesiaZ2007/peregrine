'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Destination, Region } from '@/lib/types';
import { REGION_LABEL } from './PlanForm';
import Photo from './Photo';

type Slim = Pick<Destination, 'id' | 'name' | 'country' | 'region' | 'tags' | 'thumb' | 'lat' | 'lon' | 'blurb'>;

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function PlaceBrowser({ places }: { places: Slim[] }) {
  const [q, setQ] = useState('');
  const [region, setRegion] = useState<Region | ''>('');
  const regions = useMemo(() => [...new Set(places.map((p) => p.region))], [places]);
  const hits = useMemo(() => {
    const s = fold(q.trim());
    return places.filter(
      (p) => (!region || p.region === region) && (!s || fold(`${p.name} ${p.country} ${p.tags.join(' ')}`).includes(s)),
    );
  }, [places, q, region]);

  return (
    <div className="page wide">
      <div>
        <h1>Look up a place</h1>
        <p className="muted" style={{ margin: 0 }}>Every way to get there from your home base, prices across your dates, what a day costs, and where to stay.</p>
      </div>
      <div className="row">
        <input className="input" style={{ maxWidth: 420, fontSize: '1.05rem' }} autoFocus placeholder="Search a city, country or interest (e.g. Porto, Greece, ski)…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search places" />
        <span className="muted mono" style={{ fontSize: '0.85rem' }}>{hits.length} places</span>
      </div>
      <div className="tags">
        <button className="tag" aria-pressed={!region} onClick={() => setRegion('')}>All regions</button>
        {regions.map((r) => (
          <button key={r} className="tag" aria-pressed={region === r} onClick={() => setRegion(region === r ? '' : r)}>{REGION_LABEL[r]}</button>
        ))}
      </div>
      <div className="place-grid">
        {hits.slice(0, 120).map((p) => (
          <Link key={p.id} href={`/place/${p.id}`} className="place-card">
            <Photo dest={p as Destination} w={330} className="place-card-img" />
            <div>
              <b>{p.name}</b>
              <span>{p.country}</span>
              <p>{p.blurb}</p>
            </div>
          </Link>
        ))}
      </div>
      {hits.length > 120 && <p className="muted">Showing 120 of {hits.length}. Search to narrow it down.</p>}
    </div>
  );
}
