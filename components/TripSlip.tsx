'use client';
import { bearingName } from '@/lib/geo';
import { duration, money } from '@/lib/money';
import type { Currency, Trip } from '@/lib/types';
import { LineBadge } from './icons';

interface Props {
  trip: Trip;
  rank: number;
  cur: Currency;
  hot: boolean;
  setHot: (k: string | null) => void;
  open: () => void;
  starred: boolean;
  onStar: () => void;
  compared: boolean;
  onCompare: () => void;
}

export function Star({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" className="star" aria-pressed={on} aria-label={on ? `Unstar ${label}` : `Star ${label}`} title={on ? 'Starred' : 'Star'} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 1.8 12.5 7l5.7.6-4.3 3.9 1.2 5.6L10 14.2l-5.1 2.9 1.2-5.6L1.8 7.6 7.5 7Z" />
      </svg>
    </button>
  );
}

export default function TripSlip({ trip: t, rank, cur, hot, setHot, open, starred, onStar, compared, onCompare }: Props) {
  const b = t.best;
  const others = t.options.filter((o) => o.mode !== b.mode).slice(0, 3);
  const near = !!t.nearMiss?.length;
  return (
    <div
      className="slip"
      data-mode={b.mode}
      data-hot={hot}
      data-near={near}
      role="button"
      tabIndex={0}
      onMouseEnter={() => setHot(t.key)}
      onMouseLeave={() => setHot(null)}
      onFocus={() => setHot(t.key)}
      onClick={open}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
      aria-label={`${t.dest.name}, ${money(b.price, cur)} by ${b.mode}`}
    >
      <span className="rank">{near ? '—' : String(rank).padStart(2, '0')}</span>
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
        {near ? (
          <span className="why near-why">Just outside: {t.nearMiss!.join(' · ')}</span>
        ) : (
          t.reasons.length > 0 && <span className="why">{t.reasons.slice(0, 3).join(' · ')}</span>
        )}
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
        {t.flightHint?.cheaperLikely && <span className="hint-chip">other airlines may be cheaper</span>}
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
        <small title="travel + beds, food, getting around and sights">+ {money(t.stayCost, cur)} stay & food</small>
        <small className="all-in">{money(t.total, cur)} all in</small>
      </span>
      <span className="slip-acts">
        <Star on={starred} onClick={onStar} label={t.dest.name} />
        <button
          type="button"
          className="cmp"
          aria-pressed={compared}
          title={compared ? 'In compare' : 'Add to compare'}
          onClick={(e) => { e.stopPropagation(); onCompare(); }}
        >
          {compared ? '✓ cmp' : '+ cmp'}
        </button>
      </span>
    </div>
  );
}
