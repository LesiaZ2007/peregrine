'use client';
import { bearingName, fmtCoord } from '@/lib/geo';
import { duration, money } from '@/lib/money';
import type { Currency, Trip } from '@/lib/types';
import { LineBadge } from './icons';

export default function TripSlip({ trip: t, rank, cur, hot, setHot, open }: {
  trip: Trip; rank: number; cur: Currency; hot: boolean; setHot: (k: string | null) => void; open: () => void;
}) {
  const b = t.best;
  const others = t.options.filter((o) => o.mode !== b.mode).slice(0, 3);
  return (
    <button
      type="button"
      className="slip"
      data-mode={b.mode}
      data-hot={hot}
      onMouseEnter={() => setHot(t.key)}
      onMouseLeave={() => setHot(null)}
      onFocus={() => setHot(t.key)}
      onClick={open}
    >
      <span className="rank">{String(rank).padStart(2, '0')}</span>
      <span className="place">
        <b>
          {t.dest.name}
          {t.flags.includes('wish') && <span className="flag">wishlist</span>}
          {t.flags.includes('been') && <span className="flag">been</span>}
          {t.flags.includes('new') && <span className="flag">new find</span>}
        </b>
        <span>
          {t.dest.country} · <span className="mono">{t.distanceKm.toLocaleString('en-GB')} km {bearingName(t.originLat, t.originLon, t.dest.lat, t.dest.lon)}</span>
        </span>
        {t.reasons.length > 0 && <span className="why">{t.reasons.slice(0, 3).join(' · ')}</span>}
      </span>
      <span className="how">
        <span className="row" style={{ gap: 8 }}>
          <LineBadge mode={b.mode} />
          <span className="mono">{duration(b.outMin)}{b.transfers ? ` · ${b.transfers} chg` : ''}</span>
        </span>
        {others.length > 0 && (
          <span className="mono muted" style={{ fontSize: '0.74rem' }}>
            or {others.map((o) => `${o.mode} ${money(o.price, cur)}`).join(', ')}
          </span>
        )}
      </span>
      <span className="when">
        <span>{t.window.label}</span>
        <span className="mono">{t.hoursThere} h there{t.window.nights ? ` · ${t.window.nights} nt` : ''}</span>
      </span>
      <span className="price">
        <span className="big">{money(b.price, cur)}</span>
        <span>
          <span className={`stamp ${b.source === 'live' ? 'live' : 'est'}`}>{b.source === 'live' ? 'live' : 'est.'}</span>
        </span>
        <small>{money(t.total, cur)} all in</small>
        <span className="score-pip" title="match score">{t.score}/100</span>
      </span>
      <span className="vh">{fmtCoord(t.dest.lat, t.dest.lon)}</span>
    </button>
  );
}
