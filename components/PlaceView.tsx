'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { chatContext } from '@/lib/brief';
import { BED_FACTOR, FOOD_FACTOR, rates } from '@/lib/costs';
import { bearingName, fmtCoord, haversine } from '@/lib/geo';
import { hotelLinks } from '@/lib/links';
import { duration, money } from '@/lib/money';
import { DEFAULT_SPEC, normalizeSpec } from '@/lib/spec';
import { EMPTY_IDS, K, useStored } from '@/lib/store';
import type { Destination, Mode, SearchResult, SearchSpec, StayStyle, Trip } from '@/lib/types';
import { useTripActions } from '@/lib/useTripActions';
import ChatDock from './ChatDock';
import { LineBadge, MODE_LABEL, ModeChain } from './icons';
import Photo from './Photo';
import TripSheet from './TripSheet';
import { Star } from './TripSlip';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STAYS: [StayStyle, string][] = [['hostel', 'Hostel bed'], ['budget', 'Budget room'], ['mid', 'Hotel']];

export default function PlaceView({ dest }: { dest: Destination }) {
  const [stored] = useStored<SearchSpec>(K.spec, DEFAULT_SPEC);
  const spec = useMemo(() => normalizeSpec(stored), [stored]);
  const cur = spec.currency;
  const m = (v: number) => money(v, cur);
  const acts = useTripActions(cur);
  const [visited, setVisited] = useStored<string[]>(K.visited, EMPTY_IDS);
  const [wishlist, setWishlist] = useStored<string[]>(K.wishlist, EMPTY_IDS);
  const [state, setState] = useState<{ loading: boolean; trip: Trip | null; error?: string }>({ loading: true, trip: null });
  const [open, setOpen] = useState(false);
  const home = spec.origins[0];

  // one search, limits off, so every way there shows up; ways outside your settings are marked
  useEffect(() => {
    if (!spec.origins.length) return;
    const ctrl = new AbortController();
    const body: SearchSpec = {
      ...spec, scope: 'places', places: [dest.id], tagsAny: [], tagsNone: [], exclude: [], skipVisited: false, skipBeenCountries: false,
      minDistanceKm: 0, maxDistanceKm: 0, budgetTotal: null, budgetTransport: null, maxLegHours: 48, maxTransfers: 9,
      minHoursThere: 0, modeMaxHours: {}, abroad: 'any', inSeasonOnly: false, limit: 1, visited, wishlist,
      modes: { ...spec.modes, train: true, bus: true, flight: true, ferry: true, rideshare: true },
    };
    fetch('/api/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal })
      .then((r) => r.json() as Promise<SearchResult>)
      .then((j) => setState({ loading: false, trip: j.trips[0] ?? j.near[0] ?? null }))
      .catch((e: Error) => { if (e.name !== 'AbortError') setState({ loading: false, trip: null, error: e.message }); });
    return () => ctrl.abort();
    // re-run when the home base or dates change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dest.id, JSON.stringify(spec.origins), JSON.stringify(spec.when), spec.live]);

  const t = state.trip;
  // which ways break the traveller's own limits (the search above ignored them)
  const breaks = (o: { outMin: number; transfers: number; overnight?: boolean; mode: Mode }) => {
    const r: string[] = [];
    if (o.outMin / 60 > spec.maxLegHours) r.push('longer than your journey limit');
    if (o.transfers > spec.maxTransfers) r.push('more changes than you allow');
    const lim = spec.modeMaxHours[o.mode];
    if (lim && o.outMin / 60 > lim) r.push(`over your ${MODE_LABEL[o.mode].toLowerCase()} limit`);
    return r;
  };

  // dates × ways table
  const table = useMemo(() => {
    if (!t) return null;
    const label = (c: Mode[]) => c.map((x) => MODE_LABEL[x]).join(' + ');
    const cols = [...new Set(t.alts.flatMap((a) => (a.ways ?? []).map((w) => label(w.chain))))];
    const rows = t.alts.map((a) => {
      const cells = cols.map((c) => {
        const ws = (a.ways ?? []).filter((w) => label(w.chain) === c);
        return ws.length ? ws.reduce((x, y) => (y.price < x.price ? y : x)) : null;
      });
      const min = Math.min(...cells.filter(Boolean).map((x) => x!.price));
      return { a, cells, min };
    });
    return { cols, rows };
  }, [t]);

  const km = home ? Math.round(haversine(home.lat, home.lon, dest.lat, dest.lon)) : null;
  const typical = (o: Mode) => {
    const xs = (t?.alts ?? []).flatMap((a) => a.ways ?? []).filter((w) => w.chain.length === 1 && w.chain[0] === o).map((w) => w.price).sort((x, y) => x - y);
    if (!xs.length) return null;
    return { low: xs[0], high: xs[xs.length - 1], n: xs.length };
  };

  return (
    <div className="page wide place-page">
      <p style={{ margin: 0 }}><Link href="/place">← All places</Link></p>
      <div className="place-hero">
        <Photo dest={dest} w={960} className="place-hero-img" credit />
        <div className="place-hero-text">
          <div className="row" style={{ gap: 6 }}>
            {t && <Star on={acts.isStarred(t)} onClick={() => acts.toggleStar(t)} label={dest.name} />}
            <h1>{dest.name}</h1>
          </div>
          <div className="sub mono">{dest.country.toUpperCase()} · {fmtCoord(dest.lat, dest.lon)}{home && km != null ? ` · ${km.toLocaleString('en-GB')} KM ${bearingName(home.lat, home.lon, dest.lat, dest.lon)} OF ${home.label.toUpperCase()}` : ''}</div>
          <p className="lead">{dest.blurb}</p>
          <div className="tags">{dest.tags.map((g) => <span key={g} className="tag" style={{ cursor: 'default' }}>{g.replace(/-/g, ' ')}</span>)}</div>
          <div className="months" aria-label="Best months">
            {MON.map((mo, i) => <span key={mo} data-good={dest.months.includes(i + 1)}>{mo}</span>)}
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            {t && <button className={`btn small ${acts.isStarred(t) ? 'primary' : ''}`} onClick={() => acts.toggleStar(t)}>{acts.isStarred(t) ? '★ Starred' : '☆ Star'}</button>}
            {t && <button className={`btn small ${acts.inCompare(t) ? 'primary' : ''}`} onClick={() => acts.toggleCompare(t)}>{acts.inCompare(t) ? 'In compare' : 'Compare'}</button>}
            {t && <button className="btn small accent" onClick={() => setOpen(true)}>Full details & live checks</button>}
          </div>
        </div>
      </div>

      {!spec.origins.length && (
        <div className="empty"><h3>Set your home base first</h3><p>Add where you’re based in the <Link href="/">planner</Link> (01 From), then come back.</p></div>
      )}
      {spec.origins.length > 0 && state.loading && <div className="loading-bar" aria-label="Looking up ways there" />}
      {state.error && <div className="notes"><p>{state.error}</p></div>}
      {spec.origins.length > 0 && !state.loading && !t && <div className="empty"><h3>No way there turned up</h3><p>None of the modes you use reach {dest.name} from {home?.label} on your dates.</p></div>}

      {t && (
        <>
          <section>
            <h2>Ways there from {t.originLabel} · best dates {t.window.label}</h2>
            <p className="muted" style={{ fontSize: '0.85rem', marginTop: 0 }}>Shown with your limits switched off, so you see everything. Ways outside your settings are marked.</p>
            <table className="ledger">
              <thead><tr><th>Way</th><th>One way</th><th style={{ textAlign: 'right' }}>Return pp</th></tr></thead>
              <tbody>
                {t.options.map((o, i) => {
                  const why = breaks(o);
                  return (
                    <tr key={i} style={why.length ? { opacity: 0.6 } : undefined}>
                      <td>
                        <ModeChain option={o} /> {i === 0 && <span className="flag">cheapest fit</span>}
                        {o.legs && <ol className="legs">{o.legs.map((l, k) => <li key={k} data-mode={l.mode}>{l.note}{l.price != null && <> · <b className="mono">{m(l.price)}</b> <span className={`stamp ${l.source === 'live' ? 'live' : 'est'}`}>{l.source === 'live' ? 'live' : 'est.'}</span></>}</li>)}</ol>}
                        {why.length > 0 && <div className="near-why" style={{ fontSize: '0.78rem' }}>outside your settings: {why.join(', ')}</div>}
                        <div className="links">{o.source === 'estimate' && <span className="muted">Estimate. Real price:</span>}{o.links.slice(0, 4).map((l) => <a key={l.label} href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a>)}</div>
                      </td>
                      <td className="mono" style={{ fontSize: '0.85rem' }}>{duration(o.outMin)}<div className="muted">{o.transfers ? `${o.transfers} chg` : 'direct'}</div></td>
                      <td className="num">{m(o.price + (o.extraEst ?? 0))}<div><span className={`stamp ${o.source === 'live' ? 'live' : 'est'}`}>{o.source === 'live' ? (o.extraEst ? 'live+est.' : 'live') : 'est.'}</span></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {table && table.rows.length > 1 && (
            <section>
              <h2>Prices across your dates</h2>
              <div className="cmp-scroll">
                <table className="cmp-table date-table" style={{ ['--cols' as string]: table.cols.length }}>
                  <thead><tr><th>Dates</th>{table.cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                  <tbody>
                    {table.rows.map(({ a, cells, min }) => (
                      <tr key={a.window.depart}>
                        <th scope="row">{a.window.label}</th>
                        {cells.map((c, i) => (
                          <td key={i} data-best={c != null && c.price === min}>
                            {c ? <><b className="mono">{m(c.price)}</b> <span className={`stamp ${c.source === 'live' ? 'live' : 'est'}`}>{c.source === 'live' ? 'live' : 'est.'}</span><div className="muted mono" style={{ fontSize: '0.75rem' }}>{duration(c.outMin)}</div></> : <span className="muted">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section>
            <h2>Typical prices</h2>
            <div className="typical">
              {(['flight', 'train', 'bus', 'ferry', 'rideshare'] as Mode[]).map((mo) => {
                const ty = typical(mo);
                const hint = mo === 'flight' && t.flightHint;
                if (!ty && !hint) return null;
                return (
                  <div key={mo} className="typical-card" data-mode={mo}>
                    <LineBadge mode={mo} />
                    {ty ? <b className="mono">{m(ty.low)}{ty.high > ty.low ? `–${m(ty.high).replace(/^\D/, '')}` : ''}</b> : <b className="mono muted">no real fare</b>}
                    <span className="muted">{ty ? `return, across ${ty.n} date${ty.n === 1 ? '' : 's'}` : ''}</span>
                    {hint && <span className="muted">usual cheap fare for {km?.toLocaleString('en-GB')} km: {m(hint.low)}–{m(hint.high).replace(/^\D/, '')} <span className="stamp est">guide</span></span>}
                    {hint && hint.airlines.length > 0 && <span className="muted" style={{ fontSize: '0.75rem' }}>try {hint.airlines.slice(0, 4).join(', ')}</span>}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      <section>
        <h2>What a day costs here</h2>
        <table className="ledger" style={{ maxWidth: 760 }}>
          <thead><tr><th>Staying in</th><th style={{ textAlign: 'right' }}>Bed / night</th><th style={{ textAlign: 'right' }}>Food / day</th><th style={{ textAlign: 'right' }}>Getting around</th><th style={{ textAlign: 'right' }}>Sights</th><th style={{ textAlign: 'right' }}>Day total</th></tr></thead>
          <tbody>
            {STAYS.map(([st, label]) => {
              const r = rates(dest, { ...spec, stayStyle: st });
              const food = Math.round(dest.daily * 0.33 * FOOD_FACTOR[spec.foodStyle]);
              const bed = Math.round(dest.daily * 0.42 * BED_FACTOR[st]);
              return (
                <tr key={st} style={st === spec.stayStyle ? { fontWeight: 700 } : undefined}>
                  <td>{label}</td><td className="num">{m(bed)}</td><td className="num">{m(food)}</td><td className="num">{m(r.local)}</td><td className="num">{m(r.sights)}</td><td className="num">{m(bed + food + r.local + r.sights)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: '0.8rem' }}>Estimates from local price levels, with food at “{spec.foodStyle === 'self' ? 'self-catering' : spec.foodStyle === 'cheap' ? 'cheap eats' : 'restaurants'}” (change it in the planner, 05 Money).</p>
        <div className="links" style={{ fontSize: '0.9rem' }}>
          <span className="muted">Find a bed{t ? ` for ${t.window.label}` : ''}:</span>
          {hotelLinks(dest.name, dest.country, t?.window.depart ?? '', t?.window.ret ?? '', spec.travellers, spec.stayStyle).map((l) => (
            <a key={l.label} href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a>
          ))}
        </div>
      </section>

      {open && t && (
        <TripSheet
          trip={t} spec={spec} close={() => setOpen(false)}
          starred={acts.isStarred(t)} onStar={() => acts.toggleStar(t)} compared={acts.inCompare(t)} onCompare={() => acts.toggleCompare(t)}
          been={visited.includes(dest.id)} onBeen={() => setVisited((v) => (v.includes(dest.id) ? v.filter((x) => x !== dest.id) : [...v, dest.id]))}
          wished={wishlist.includes(dest.id)} onWish={() => setWishlist((v) => (v.includes(dest.id) ? v.filter((x) => x !== dest.id) : [...v, dest.id]))}
        />
      )}

      <ChatDock
        context={() => chatContext({ spec, results: t ? [t] : [], starred: acts.starred.map((s) => s.trip), compare: acts.compare, page: `place page for ${dest.name}`, extra: `Place: ${dest.name}, ${dest.country}. Best months: ${dest.months.map((x) => MON[x - 1]).join(' ')}. Budget daily cost about ${m(dest.daily)}.` })}
        prompts={[`What's the cheapest way to get to ${dest.name}?`, `Which of my dates is best for ${dest.name}?`, `Is ${dest.name} worth it for a weekend?`, `How do I save money on a ${dest.name} trip?`]}
      />
    </div>
  );
}
