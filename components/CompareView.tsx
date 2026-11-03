'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { chatContext } from '@/lib/brief';
import { duration, money } from '@/lib/money';
import { DEFAULT_SPEC, normalizeSpec } from '@/lib/spec';
import { K, useStored } from '@/lib/store';
import type { SearchSpec, Trip } from '@/lib/types';
import { useTripActions } from '@/lib/useTripActions';
import ChatDock from './ChatDock';
import { MODE_LABEL, ModeChain } from './icons';
import Photo from './Photo';
import { Star } from './TripSlip';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Row {
  label: string;
  /** numeric value per trip, for picking the best; undefined = no highlight */
  val?: (t: Trip) => number;
  better?: 'low' | 'high';
  cell: (t: Trip) => React.ReactNode;
}

export default function CompareView() {
  const [stored] = useStored<SearchSpec>(K.spec, DEFAULT_SPEC);
  const spec = useMemo(() => normalizeSpec(stored), [stored]);
  const cur = spec.currency;
  const acts = useTripActions(cur);
  const list = acts.compare;
  const m = (v: number) => money(v, cur);

  const rows: Row[] = [
    { label: 'Dates', cell: (t) => <>{t.window.label}<div className="muted mono">{t.window.nights} night{t.window.nights === 1 ? '' : 's'}</div></> },
    { label: 'Distance', val: (t) => t.distanceKm, better: 'low', cell: (t) => <span className="mono">{t.distanceKm.toLocaleString('en-GB')} km</span> },
    {
      label: 'Best way', val: (t) => t.best.price + (t.best.extraEst ?? 0), better: 'low',
      cell: (t) => (
        <>
          <ModeChain option={t.best} /> <b className="mono">{m(t.best.price + (t.best.extraEst ?? 0))}</b>{' '}
          <span className={`stamp ${t.best.source === 'live' ? 'live' : 'est'}`}>{t.best.source === 'live' ? 'live' : 'est.'}</span>
          {t.best.carrier && <div className="muted" style={{ fontSize: '0.78rem' }}>{t.best.carrier}</div>}
        </>
      ),
    },
    { label: 'Journey, one way', val: (t) => t.best.outMin, better: 'low', cell: (t) => <span className="mono">{duration(t.best.outMin)}{t.best.transfers ? ` · ${t.best.transfers} chg` : ' · direct'}</span> },
    { label: 'Time there', val: (t) => t.hoursThere, better: 'high', cell: (t) => <span className="mono">{t.hoursThere} h</span> },
    { label: 'Beds', val: (t) => t.costs.beds, better: 'low', cell: (t) => <span className="mono">{m(t.costs.beds)}</span> },
    { label: 'Food', val: (t) => t.costs.food, better: 'low', cell: (t) => <span className="mono">{m(t.costs.food)}</span> },
    { label: 'Getting around', val: (t) => t.costs.local, better: 'low', cell: (t) => <span className="mono">{m(t.costs.local)}</span> },
    { label: 'Sights', val: (t) => t.costs.sights, better: 'low', cell: (t) => <span className="mono">{m(t.costs.sights)}</span> },
    { label: 'All in, per person', val: (t) => t.total, better: 'low', cell: (t) => <b className="mono big-total">{m(t.total)}</b> },
    ...(spec.travellers > 1 ? [{ label: `For ${spec.travellers} of you`, val: (t: Trip) => t.total, better: 'low' as const, cell: (t: Trip) => <span className="mono">{m(t.total * spec.travellers)}</span> }] : []),
    {
      label: 'Other ways',
      cell: (t) => (
        <div style={{ display: 'grid', gap: 4 }}>
          {t.options.slice(1).map((o, i) => (
            <span key={i} className="mono" style={{ fontSize: '0.8rem' }}>
              {(o.legs?.map((l) => MODE_LABEL[l.mode]) ?? [MODE_LABEL[o.mode]]).filter((x, k, a) => k === 0 || a[k - 1] !== x).join(' + ')} {m(o.price + (o.extraEst ?? 0))} {o.source === 'live' ? (o.extraEst ? 'live+est.' : 'live') : 'est.'} · {duration(o.outMin)}
            </span>
          ))}
          {t.options.length < 2 && <span className="muted">none</span>}
        </div>
      ),
    },
    {
      label: 'Cheaper flights?',
      cell: (t) =>
        t.flightHint ? (
          <span style={{ fontSize: '0.82rem' }}>
            typical {m(t.flightHint.low)}–{m(t.flightHint.high).replace(/^\D/, '')} <span className="stamp est">guide</span>
            {t.flightHint.cheaperLikely && <div className="hint-chip" style={{ marginTop: 4 }}>listed fare looks high</div>}
          </span>
        ) : <span className="muted">—</span>,
    },
    { label: 'What it’s like', cell: (t) => <span style={{ fontSize: '0.85rem' }}>{t.dest.blurb}</span> },
    { label: 'Tags', cell: (t) => <span style={{ fontSize: '0.8rem' }}>{t.dest.tags.map((g) => g.replace(/-/g, ' ')).join(', ')}</span> },
    { label: 'Best months', cell: (t) => <span style={{ fontSize: '0.8rem' }}>{t.dest.months.map((x) => MON[x - 1]).join(' ') || '—'}</span> },
    { label: 'Match score', val: (t) => t.score, better: 'high', cell: (t) => <span className="mono">{t.score}/100</span> },
    {
      label: 'Book / check',
      cell: (t) => (
        <div className="links" style={{ display: 'grid', gap: 2, fontSize: '0.8rem' }}>
          {t.best.links.slice(0, 3).map((l) => <a key={l.label} href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a>)}
        </div>
      ),
    },
  ];

  const bestOf = (r: Row) => {
    if (!r.val || list.length < 2) return null;
    const vals = list.map(r.val);
    const target = r.better === 'high' ? Math.max(...vals) : Math.min(...vals);
    if (vals.every((v) => v === target)) return null;
    return target;
  };

  return (
    <div className="page wide">
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div>
          <h1>Compare</h1>
          <p className="muted" style={{ margin: 0 }}>Up to four trips side by side. The best value in each row is marked. Prices are as of when you added them.</p>
        </div>
        {list.length > 0 && <button className="btn small" style={{ marginLeft: 'auto' }} onClick={() => acts.setCompare([])}>Clear all</button>}
      </div>

      {!list.length ? (
        <div className="empty">
          <h3>Nothing to compare yet</h3>
          <p>Press <b>+ cmp</b> on any result, or Compare in a trip’s details. <Link href="/">Back to the planner</Link></p>
        </div>
      ) : (
        <div className="cmp-scroll">
          <table className="cmp-table" style={{ ['--cols' as string]: list.length }}>
            <thead>
              <tr>
                <th />
                {list.map((t) => (
                  <th key={t.key} data-mode={t.best.mode}>
                    <Photo dest={t.dest} w={640} className="cmp-photo" />
                    <div className="cmp-head">
                      <Star on={acts.isStarred(t)} onClick={() => acts.toggleStar(t)} label={t.dest.name} />
                      <div>
                        <b>{t.dest.name}</b>
                        <span>{t.dest.country} · from {t.originLabel}</span>
                      </div>
                      <button className="btn small ghost" onClick={() => acts.toggleCompare(t)} aria-label={`Remove ${t.dest.name}`}>×</button>
                    </div>
                    {t.nearMiss?.length ? <div className="near-why" style={{ fontSize: '0.75rem', fontWeight: 400 }}>outside: {t.nearMiss.join('; ')}</div> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const best = bestOf(r);
                return (
                  <tr key={r.label}>
                    <th scope="row">{r.label}</th>
                    {list.map((t) => (
                      <td key={t.key} data-best={best != null && r.val!(t) === best}>{r.cell(t)}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ChatDock
        context={() => chatContext({ spec, compare: list, starred: acts.starred.map((s) => s.trip), page: 'compare' })}
        prompts={['Which of these should I pick, and why?', 'Which is the best value per hour there?', 'Which is easiest without flying?', 'What would make the cheapest one cheaper?']}
      />
    </div>
  );
}
