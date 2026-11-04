'use client';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { duration, money } from '@/lib/money';
import type { Currency, Trip } from '@/lib/types';
import { ModeChain } from './icons';

export interface MapStripHandle { show: (key: string) => void }

/** Phone map view: a sideways strip of trip cards; the card in the middle lights its route on the map. */
const MapStrip = forwardRef<MapStripHandle, { trips: Trip[]; cur: Currency; hot: string | null; setHot: (k: string | null) => void; open: (t: Trip) => void }>(
  function MapStrip({ trips, cur, hot, setHot, open }, ref) {
    const el = useRef<HTMLDivElement>(null);
    const tick = useRef<number | null>(null);

    useImperativeHandle(ref, () => ({
      show: (key) => {
        const card = el.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`);
        card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      },
    }));

    // whichever card sits nearest the middle is the one lit on the map
    const onScroll = () => {
      if (tick.current) cancelAnimationFrame(tick.current);
      tick.current = requestAnimationFrame(() => {
        const box = el.current;
        if (!box) return;
        const mid = box.scrollLeft + box.clientWidth / 2;
        let best: HTMLElement | null = null;
        let bestD = Infinity;
        for (const c of box.querySelectorAll<HTMLElement>('[data-key]')) {
          const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
          if (d < bestD) { bestD = d; best = c; }
        }
        const k = best?.dataset.key ?? null;
        if (k && k !== hot) setHot(k);
      });
    };

    if (!trips.length) return null;
    return (
      <div className="map-strip" ref={el} onScroll={onScroll} aria-label="Trips on the map">
        {trips.map((t, i) => {
          const b = t.best;
          return (
            <button
              key={t.key}
              type="button"
              className="map-card"
              data-key={t.key}
              data-mode={b.mode}
              data-hot={hot === t.key}
              onClick={() => open(t)}
            >
              <span className="mc-top">
                <span className="mc-rank mono">{String(i + 1).padStart(2, '0')}</span>
                <b>{t.dest.name}</b>
                <span className="mc-price mono">{money(b.price + (b.extraEst ?? 0), cur)}</span>
              </span>
              <span className="mc-mid">
                <ModeChain option={b} compact />
                <span className="mono">{duration(b.outMin)}{b.transfers ? ` · ${b.transfers} chg` : ''}</span>
                <span className={`stamp ${b.source === 'live' ? 'live' : 'est'}`}>{b.source === 'live' ? 'live' : 'est.'}</span>
              </span>
              <span className="mc-bot">
                <span>{t.window.label}</span>
                <span className="mono">all in {money(t.total, cur)}</span>
              </span>
            </button>
          );
        })}
      </div>
    );
  },
);
export default MapStrip;
