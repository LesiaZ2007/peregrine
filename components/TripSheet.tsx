'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { FOOD_LABEL, rates, STAY_LABEL } from '@/lib/costs';
import { hotelLinks } from '@/lib/links';
import { bearingName, fmtCoord } from '@/lib/geo';
import { duration, money } from '@/lib/money';
import type { Currency, SearchSpec, Trip } from '@/lib/types';
import { LineBadge, MODE_LABEL, ModeChain } from './icons';
import Photo from './Photo';
import { Star } from './TripSlip';

interface Offer { price: number; airline: string; stops: number; durationMin: number; departTime: string; arriveTime: string; from: string; to: string }
interface BusRide { dep: string; arr: string; priceEur: number; transfers: number; durationMin: number }
interface BusResult { fare: { priceUsd: number; note?: string; link: string } | null; out: BusRide[]; back: BusRide[] }
interface Journey { start: string; end: string; durationMin: number; transfers: number; legs: { mode: string; from: string; to: string; start: string; end: string; line?: string; agency?: string }[] }
type Load<T> = { state: 'idle' | 'loading' | 'done' | 'error'; data?: T; msg?: string };

const time = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso.slice(11, 16) : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

async function getJson<T>(url: string, fallback: string): Promise<T> {
  const r = await fetch(url);
  const j = await r.json();
  if (!r.ok) throw new Error(j.error === 'no_key' ? 'Google fares need a free SerpApi key on the server.' : j.message ?? fallback);
  return j as T;
}

export default function TripSheet({ trip: t, spec, close, starred, onStar, compared, onCompare, been, onBeen, wished, onWish, onHide, hidden = false }: {
  trip: Trip; spec: SearchSpec; close: () => void;
  starred: boolean; onStar: () => void; compared: boolean; onCompare: () => void;
  been: boolean; onBeen: () => void; wished: boolean; onWish: () => void; onHide?: () => void; hidden?: boolean;
}) {
  const cur: Currency = spec.currency;
  const ref = useRef<HTMLDivElement>(null);
  const [offers, setOffers] = useState<Load<Offer[]>>({ state: 'idle' });
  const [bus, setBus] = useState<Load<BusResult>>({ state: 'idle' });
  const [ground, setGround] = useState<Load<Journey[]>>({ state: 'idle' });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const fromAir = spec.origins.find((o) => o.label === t.originLabel)?.airports[0];
  const toAir = t.dest.airports[0];
  const hint = t.flightHint;
  const groundOpt = t.options.find((o) => o.mode === 'train' || o.mode === 'bus' || o.mode === 'ferry');
  const r = rates(t.dest, spec);
  const c = t.costs;

  async function run<T>(set: (l: Load<T>) => void, url: string, fallback: string, pick: (j: unknown) => T) {
    set({ state: 'loading' });
    try {
      set({ state: 'done', data: pick(await getJson(url, fallback)) });
    } catch (e) {
      set({ state: 'error', msg: (e as Error).message });
    }
  }
  const checkFlights = () =>
    run(setOffers, `/api/live/flights?from=${fromAir}&to=${toAir}&depart=${t.window.depart}&ret=${t.window.ret}&adults=${spec.travellers}`, 'Search failed', (j) => (j as { offers: Offer[] }).offers);
  const checkBus = () => {
    const q = new URLSearchParams({
      fromName: t.originLabel, fromLat: String(t.originLat), fromLon: String(t.originLon), toName: t.dest.name, toLat: String(t.dest.lat), toLon: String(t.dest.lon),
      depart: t.window.depart, ret: t.window.ret, leaveAfter: spec.when.leaveAfter, backBy: spec.when.backBy, overnight: spec.overnight ? '1' : '0',
    });
    return run(setBus, `/api/live/bus?${q}`, 'FlixBus lookup failed', (j) => j as BusResult);
  };
  const checkGround = () => {
    const q = new URLSearchParams({ fromLat: String(t.originLat), fromLon: String(t.originLon), toLat: String(t.dest.lat), toLon: String(t.dest.lon), time: `${t.window.depart}T${spec.when.leaveAfter || '08:00'}:00` });
    return run(setGround, `/api/live/ground?${q}`, 'Timetable lookup failed', (j) => (j as { journeys: Journey[] }).journeys);
  };

  return (
    <>
      <div className="scrim" onClick={close} />
      <aside className="sheet" role="dialog" aria-modal="true" aria-label={t.dest.name} tabIndex={-1} ref={ref}>
        <Photo dest={t.dest} w={960} className="sheet-photo" credit />
        {t.nearMiss?.length ? <div className="near-banner">Just outside your settings: {t.nearMiss.join(' · ')}</div> : null}
        <div className="sheet-head">
          <button className="btn small close" onClick={close}>Close</button>
          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
            <Star on={starred} onClick={onStar} label={t.dest.name} />
            <h2>{t.dest.name}</h2>
          </div>
          <div className="sub">
            {t.dest.country.toUpperCase()} · {fmtCoord(t.dest.lat, t.dest.lon)} · {t.distanceKm.toLocaleString('en-GB')} KM {bearingName(t.originLat, t.originLon, t.dest.lat, t.dest.lon)} OF {t.originLabel.toUpperCase()}
          </div>
          <p>{t.dest.blurb}{!t.dest.adHoc && <> <Link href={`/place/${t.dest.id}`}>Everything about {t.dest.name} →</Link></>}</p>
          {t.dest.tags.length > 0 && (
            <div className="tags" style={{ marginTop: 10 }}>
              {t.dest.tags.map((g) => <span key={g} className="tag" style={{ cursor: 'default' }}>{g.replace(/-/g, ' ')}</span>)}
            </div>
          )}
          <div className="row" style={{ marginTop: 14 }}>
            <button className={`btn small ${starred ? 'primary' : ''}`} onClick={onStar}>{starred ? '★ Starred' : '☆ Star'}</button>
            <button className={`btn small ${compared ? 'primary' : ''}`} onClick={onCompare}>{compared ? 'In compare' : 'Compare'}</button>
            <button className={`btn small ${wished ? 'primary' : ''}`} onClick={onWish}>{wished ? 'On wishlist' : 'Wishlist'}</button>
            <button className={`btn small ${been ? 'primary' : ''}`} onClick={onBeen}>{been ? 'Been there' : 'I’ve been'}</button>
            {onHide && <button className={`btn small ${hidden ? 'primary' : 'ghost'}`} onClick={onHide}>{hidden ? 'Unhide place' : 'Hide place'}</button>}
          </div>
          {starred && <p className="muted" style={{ fontSize: '0.8rem', margin: '8px 0 0' }}>Starred. Put it on a weekend in <Link href="/trips">Trips</Link>.</p>}
        </div>

        <section className="sheet-sec">
          <h3>Ways there · {t.window.label}</h3>
          <table className="ledger">
            <thead>
              <tr><th>Mode</th><th>One way</th><th style={{ textAlign: 'right' }}>Return pp</th></tr>
            </thead>
            <tbody>
              {t.options.map((o, oi) => (
                <tr key={`${o.mode}-${oi}`}>
                  <td>
                    <ModeChain option={o} /> {oi === 0 && <span className="flag">best fit</span>}
                    {o.legs && (
                      <ol className="legs">
                        {o.legs.map((l, k) => (
                          <li key={k} data-mode={l.mode}>
                            {l.note}
                            {l.price != null && <> · <b className="mono">{money(l.price, cur)}</b> <span className={`stamp ${l.source === 'live' ? 'live' : 'est'}`}>{l.source === 'live' ? 'live' : 'est.'}</span></>}
                          </li>
                        ))}
                      </ol>
                    )}
                    {o.carrier && <div style={{ fontSize: '0.8rem', marginTop: 4 }}>{o.carrier}</div>}
                    {o.note && <div className="muted" style={{ fontSize: '0.78rem', marginTop: 2 }}>{o.note}</div>}
                    <div className="links">
                      {o.source === 'estimate' && <span className="muted">Estimate. Real price:</span>}
                      {o.links.map((l) => <a key={l.label} href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a>)}
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: '0.85rem' }}>
                    {duration(o.outMin)}
                    <div className="muted">{o.transfers ? `${o.transfers} change${o.transfers > 1 ? 's' : ''}` : 'direct'}</div>
                  </td>
                  <td className="num">
                    {o.source === 'live' || o.priceHigh <= o.price ? money(o.price, cur) : `${money(o.price, cur)}–${money(o.priceHigh, cur).replace(/^\D/, '')}`}
                    <div><span className={`stamp ${o.source === 'live' ? 'live' : 'est'}`}>{o.source === 'live' ? 'live' : 'est.'}</span></div>
                    {o.extraEst ? <div className="muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>+ {money(o.extraEst, cur)} <span className="stamp est">est.</span><br />other legs<br /><b className="mono" style={{ color: 'var(--ink)' }}>= {money(o.price + o.extraEst, cur)}</b></div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {(t.blocked?.length ?? 0) > 0 && (
          <section className="sheet-sec">
            <h3>Also possible, outside your settings</h3>
            <table className="ledger blocked">
              <tbody>
                {t.blocked!.map((b, i) => (
                  <tr key={i}>
                    <td>
                      <ModeChain option={b.option} />
                      <div className="near-why" style={{ fontSize: '0.78rem', marginTop: 4 }}>{b.why}</div>
                      {b.option.legs && <ol className="legs">{b.option.legs.map((l, k) => <li key={k} data-mode={l.mode}>{l.note}{l.price != null && <> · <b className="mono">{money(l.price, cur)}</b></>}</li>)}</ol>}
                      <div className="links">{b.option.links.slice(0, 3).map((l) => <a key={l.label} href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a>)}</div>
                    </td>
                    <td className="mono" style={{ fontSize: '0.85rem' }}>{duration(b.option.outMin)}<div className="muted">{b.option.transfers ? `${b.option.transfers} chg` : 'direct'}</div></td>
                    <td className="num">{money(b.option.price + (b.option.extraEst ?? 0), cur)}<div><span className={`stamp ${b.option.source === 'live' ? 'live' : 'est'}`}>{b.option.source === 'live' ? 'live' : 'est.'}</span></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {hint && (
          <section className="sheet-sec">
            <h3>Cheaper flights?</h3>
            <div className="guide">
              {hint.noRealFare ? (
                <span>No live fare came back for these dates (we see Ryanair{spec.live ? ' and Google’s top results' : ''}), so the flight above is an estimate. Other airlines fly it: check them.</span>
              ) : hint.cheaperLikely ? (
                <span>The fare listed is above what this distance usually costs on a budget airline. Worth shopping around.</span>
              ) : (
                <span>The fare listed is already in the cheap range for this distance. Other airlines could still beat it.</span>
              )}
              <span>
                Typical cheap return at {t.distanceKm.toLocaleString('en-GB')} km, booked a few weeks out: <b className="mono">{money(hint.low, cur)}–{money(hint.high, cur).replace(/^\D/, '')}</b> <span className="stamp est">guide</span>
              </span>
              {hint.airlines.length > 0 && <span className="muted">Budget airlines to check around here: {hint.airlines.join(', ')}.</span>}
              <span className="row" style={{ gap: 12 }}>
                {hint.links.map((l) => <a key={l.label} href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a>)}
              </span>
              <span className="muted" style={{ fontSize: '0.78rem' }}>
                Tips: flexible dates (±1 day) and nearby airports often save the most. Google Flights’ date grid and Skyscanner’s “whole month” view show it fast.
              </span>
            </div>
          </section>
        )}

        <section className="sheet-sec">
          <h3>Check it for real</h3>
          <div className="row">
            {fromAir && toAir && fromAir !== toAir && (
              <button className="btn small" onClick={checkFlights} disabled={offers.state === 'loading'}>
                {offers.state === 'loading' ? 'Asking Google Flights…' : `All airlines ${fromAir} → ${toAir}`}
              </button>
            )}
            {t.options.some((o) => o.mode === 'bus') && (
              <button className="btn small" onClick={checkBus} disabled={bus.state === 'loading'}>
                {bus.state === 'loading' ? 'Asking FlixBus…' : 'Real FlixBus fares'}
              </button>
            )}
            {groundOpt && (
              <button className="btn small" onClick={checkGround} disabled={ground.state === 'loading'}>
                {ground.state === 'loading' ? 'Reading timetables…' : 'Train & coach timetable'}
              </button>
            )}
          </div>
          {offers.state === 'error' && <p className="muted">{offers.msg}</p>}
          {offers.state === 'done' && (
            <div>
              {!offers.data?.length && <p className="muted">No flights found for those dates.</p>}
              {offers.data?.map((o, i) => (
                <div className="offer" key={i}>
                  <span>{o.airline} · {o.stops ? `${o.stops} stop${o.stops > 1 ? 's' : ''}` : 'nonstop'}</span>
                  <b className="mono">{money(o.price, cur)}</b>
                  <span className="mono">{o.from} {o.departTime.slice(11)} → {o.to} {o.arriveTime.slice(11)} · {duration(o.durationMin)}</span>
                  <span className="muted" style={{ fontSize: '0.75rem' }}>return, pp</span>
                </div>
              ))}
            </div>
          )}
          {bus.state === 'error' && <p className="muted">{bus.msg}</p>}
          {bus.state === 'done' && bus.data && (
            <div>
              {bus.data.fare ? (
                <p style={{ margin: '0 0 6px' }}>
                  Cheapest return that fits your hours: <b className="mono">{money(bus.data.fare.priceUsd, cur)}</b>{' '}
                  <a href={bus.data.fare.link} target="_blank" rel="noreferrer">Book on FlixBus ↗</a>
                </p>
              ) : (
                <p className="muted" style={{ margin: '0 0 6px' }}>No FlixBus round trip fits your hours on these dates.</p>
              )}
              {([['Out', bus.data.out], ['Back', bus.data.back]] as const).map(([label, list]) =>
                list.length > 0 && (
                  <div key={label} style={{ marginBottom: 6 }}>
                    <span className="caps muted">{label}</span>
                    {list.slice(0, 6).map((ride, i) => (
                      <div className="offer" key={i}>
                        <span className="mono">{ride.dep.slice(11, 16)} → {ride.arr.slice(11, 16)} · {duration(ride.durationMin)}{ride.transfers ? ` · ${ride.transfers} chg` : ''}</span>
                        <b className="mono">€{ride.priceEur.toFixed(2)}</b>
                      </div>
                    ))}
                  </div>
                ),
              )}
            </div>
          )}
          {ground.state === 'error' && <p className="muted">{ground.msg}</p>}
          {ground.state === 'done' && (
            <div style={{ display: 'grid', gap: 10 }}>
              {!ground.data?.length && <p className="muted">No public transport journeys found that day.</p>}
              {ground.data?.map((j, i) => (
                <div className="journey" key={i}>
                  <b className="mono">{time(j.start)} → {time(j.end)} · {duration(j.durationMin)} · {j.transfers} change{j.transfers === 1 ? '' : 's'}</b>
                  {j.legs.filter((l) => l.mode !== 'LOCAL').map((l, k) => (
                    <span key={k} className="mono muted">{time(l.start)} {l.line ?? l.mode.toLowerCase()} {l.agency ? `(${l.agency})` : ''} {l.from} → {l.to}</span>
                  ))}
                </div>
              ))}
              <p className="muted" style={{ fontSize: '0.75rem', margin: 0 }}>
                Timetables: <a href="https://transitous.org/sources/" target="_blank" rel="noreferrer">Transitous</a> (open data). Times are schedules, not fares.
              </p>
            </div>
          )}
        </section>

        {t.alts.length > 1 && (
          <section className="sheet-sec">
            <h3>Other dates</h3>
            <table className="ledger">
              <tbody>
                {t.alts.map((a) => (
                  <tr key={a.window.depart} style={a.window.depart === t.window.depart ? { fontWeight: 700 } : undefined}>
                    <td>{a.window.label}</td>
                    <td><LineBadge mode={a.mode} /></td>
                    <td className="num">{money(a.price, cur)}</td>
                    <td className="num muted">{money(a.total, cur)} all in</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="sheet-sec">
          <h3>What it costs</h3>
          <table className="ledger">
            <tbody>
              <tr><td>{MODE_LABEL[t.best.mode]}, return <span className={`stamp ${t.best.source === 'live' ? 'live' : 'est'}`}>{t.best.source === 'live' ? 'live' : 'est.'}</span></td><td className="num">{money(t.best.price, cur)}</td></tr>
              {t.best.extraEst ? <tr><td>Other legs (transfers, ferry) <span className="stamp est">est.</span><div className="muted" style={{ fontSize: '0.78rem' }}>{t.best.legs?.filter((l) => l.mode !== t.best.mode).map((l) => l.note).join(' · ')}</div></td><td className="num">{money(t.best.extraEst, cur)}</td></tr> : null}
              <tr>
                <td>Beds · {c.nights} night{c.nights === 1 ? '' : 's'}, {STAY_LABEL[spec.stayStyle]}<div className="muted" style={{ fontSize: '0.78rem' }}>{spec.stayStyle === 'free' ? 'staying with friends' : `about ${money(r.bed, cur)} a night`}{t.best.overnight ? ' · one night on the move' : ''}</div></td>
                <td className="num">{money(c.beds, cur)}</td>
              </tr>
              {c.nights > 0 && (
                <tr>
                  <td colSpan={2} style={{ paddingTop: 0 }}>
                    <div className="links">
                      <span className="muted">Find a bed:</span>
                      {hotelLinks(t.dest.name, t.dest.country, t.window.depart, t.window.ret, spec.travellers, spec.stayStyle).map((l) => (
                        <a key={l.label} href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
              <tr>
                <td>Food · {c.days} day{c.days === 1 ? '' : 's'}, {FOOD_LABEL[spec.foodStyle]}<div className="muted" style={{ fontSize: '0.78rem' }}>about {money(r.food, cur)} a day</div></td>
                <td className="num">{money(c.food, cur)}</td>
              </tr>
              <tr><td>Getting around<div className="muted" style={{ fontSize: '0.78rem' }}>metro, buses, about {money(r.local, cur)} a day</div></td><td className="num">{money(c.local, cur)}</td></tr>
              {spec.includeSights && <tr><td>Sights & activities<div className="muted" style={{ fontSize: '0.78rem' }}>one paid thing a day, about {money(r.sights, cur)}</div></td><td className="num">{money(c.sights, cur)}</td></tr>}
              <tr className="total"><td>Per person</td><td className="num">{money(t.total, cur)}</td></tr>
              {spec.travellers > 1 && <tr><td>For {spec.travellers} of you</td><td className="num">{money(t.total * spec.travellers, cur)}</td></tr>}
            </tbody>
          </table>
          <p className="muted" style={{ fontSize: '0.78rem', margin: 0 }}>
            “live” prices are real fares (Ryanair, Google Flights, FlixBus). Everything stamped “est.” and every stay line is an estimate built from local price levels. Change where you sleep and how you eat in 05 Money.
          </p>
        </section>
      </aside>
    </>
  );
}
