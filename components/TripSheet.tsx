'use client';
import { useEffect, useRef, useState } from 'react';
import { bearingName, fmtCoord } from '@/lib/geo';
import { duration, money } from '@/lib/money';
import { linksFor } from '@/lib/links';
import { STAY_FACTOR } from '@/lib/search';
import type { Currency, SearchSpec, Trip } from '@/lib/types';
import { LineBadge, MODE_LABEL } from './icons';

interface Offer { price: number; airline: string; stops: number; durationMin: number; departTime: string; arriveTime: string; from: string; to: string }
interface BusRide { dep: string; arr: string; priceEur: number; transfers: number; durationMin: number }
interface BusResult { fare: { priceUsd: number; note?: string; link: string } | null; out: BusRide[]; back: BusRide[] }
interface Journey { start: string; end: string; durationMin: number; transfers: number; legs: { mode: string; from: string; to: string; start: string; end: string; line?: string; agency?: string }[] }

const time = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso.slice(11, 16) : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

export default function TripSheet({ trip: t, spec, close, saved, onSave, been, onBeen, wished, onWish, onHide }: {
  trip: Trip; spec: SearchSpec; close: () => void;
  saved: boolean; onSave: () => void; been: boolean; onBeen: () => void; wished: boolean; onWish: () => void; onHide: () => void;
}) {
  const cur: Currency = spec.currency;
  const ref = useRef<HTMLDivElement>(null);
  const [offers, setOffers] = useState<{ state: 'idle' | 'loading' | 'done' | 'error'; data?: Offer[]; msg?: string }>({ state: 'idle' });
  const [bus, setBus] = useState<{ state: 'idle' | 'loading' | 'done' | 'error'; data?: BusResult; msg?: string }>({ state: 'idle' });
  const [ground, setGround] = useState<{ state: 'idle' | 'loading' | 'done' | 'error'; data?: Journey[]; msg?: string }>({ state: 'idle' });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const flight = t.options.find((o) => o.mode === 'flight');
  const fromAir = spec.origins.find((o) => o.label === t.originLabel)?.airports[0];
  const toAir = t.dest.airports[0];
  const groundOpt = t.options.find((o) => o.mode === 'train' || o.mode === 'bus' || o.mode === 'ferry');
  const flightLinks = linksFor('flight', {
    fromName: t.originLabel, toName: t.dest.name, fromLat: t.originLat, fromLon: t.originLon, toLat: t.dest.lat, toLon: t.dest.lon,
    fromAir, toAir, depart: t.window.depart, ret: t.window.ret,
  });

  async function checkBus() {
    setBus({ state: 'loading' });
    try {
      const q = new URLSearchParams({
        fromName: t.originLabel, fromLat: String(t.originLat), fromLon: String(t.originLon),
        toName: t.dest.name, toLat: String(t.dest.lat), toLon: String(t.dest.lon),
        depart: t.window.depart, ret: t.window.ret, leaveAfter: spec.when.leaveAfter, backBy: spec.when.backBy,
        overnight: spec.overnight ? '1' : '0',
      });
      const r = await fetch(`/api/live/bus?${q}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.message ?? 'FlixBus lookup failed');
      setBus({ state: 'done', data: j });
    } catch (e) {
      setBus({ state: 'error', msg: (e as Error).message });
    }
  }

  async function checkFlights() {
    if (!fromAir || !toAir) return;
    setOffers({ state: 'loading' });
    try {
      const r = await fetch(`/api/live/flights?from=${fromAir}&to=${toAir}&depart=${t.window.depart}&ret=${t.window.ret}&adults=${spec.travellers}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error === 'no_key' ? 'Live fares need a SerpApi key on the server.' : j.message ?? 'Search failed');
      setOffers({ state: 'done', data: j.offers });
    } catch (e) {
      setOffers({ state: 'error', msg: (e as Error).message });
    }
  }
  async function checkGround() {
    setGround({ state: 'loading' });
    try {
      const when = `${t.window.depart}T${spec.when.leaveAfter || '08:00'}:00`;
      const q = new URLSearchParams({ fromLat: String(t.originLat), fromLon: String(t.originLon), toLat: String(t.dest.lat), toLon: String(t.dest.lon), time: when });
      const r = await fetch(`/api/live/ground?${q}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.message ?? 'Timetable lookup failed');
      setGround({ state: 'done', data: j.journeys });
    } catch (e) {
      setGround({ state: 'error', msg: (e as Error).message });
    }
  }

  const nightsPaid = Math.max(0, t.window.nights - (t.best.overnight ? 1 : 0));
  const people = spec.travellers;

  return (
    <>
      <div className="scrim" onClick={close} />
      <aside className="sheet" role="dialog" aria-modal="true" aria-label={t.dest.name} tabIndex={-1} ref={ref}>
        {t.dest.thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="sheet-thumb" src={t.dest.thumb} alt="" />
        )}
        <div className="sheet-head">
          <button className="btn small close" onClick={close}>Close</button>
          <h2>{t.dest.name}</h2>
          <div className="sub">
            {t.dest.country.toUpperCase()} · {fmtCoord(t.dest.lat, t.dest.lon)} · {t.distanceKm.toLocaleString('en-GB')} KM {bearingName(t.originLat, t.originLon, t.dest.lat, t.dest.lon)} OF {t.originLabel.toUpperCase()}
          </div>
          <p>{t.dest.blurb}</p>
          {t.dest.tags.length > 0 && (
            <div className="tags" style={{ marginTop: 10 }}>
              {t.dest.tags.map((g) => <span key={g} className="tag" style={{ cursor: 'default' }}>{g.replace(/-/g, ' ')}</span>)}
            </div>
          )}
          <div className="row" style={{ marginTop: 14 }}>
            <button className={`btn small ${saved ? 'primary' : ''}`} onClick={onSave}>{saved ? 'Saved' : 'Save trip'}</button>
            <button className={`btn small ${wished ? 'primary' : ''}`} onClick={onWish}>{wished ? 'On wishlist' : 'Wishlist'}</button>
            <button className={`btn small ${been ? 'primary' : ''}`} onClick={onBeen}>{been ? 'Been there' : 'I’ve been'}</button>
            <button className="btn small ghost" onClick={onHide}>Hide place</button>
          </div>
        </div>

        <section className="sheet-sec">
          <h3>Ways there · {t.window.label}</h3>
          <table className="ledger">
            <thead>
              <tr><th>Mode</th><th>One way</th><th style={{ textAlign: 'right' }}>Return pp</th></tr>
            </thead>
            <tbody>
              {t.options.map((o) => (
                <tr key={o.mode}>
                  <td>
                    <LineBadge mode={o.mode} /> {o.mode === t.best.mode && <span className="flag">best fit</span>}
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
                    {o.source === 'live' ? money(o.price, cur) : o.priceHigh > o.price ? `${money(o.price, cur)}–${money(o.priceHigh, cur).replace(/^\D/, '')}` : money(o.price, cur)}
                    <div><span className={`stamp ${o.source === 'live' ? 'live' : 'est'}`}>{o.source === 'live' ? 'live' : 'est.'}</span></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!flight && spec.modes.flight && t.distanceKm > 250 && toAir && (
            <p className="muted" style={{ fontSize: '0.82rem', margin: 0 }}>
              No real flight fare turned up for these dates, so flights aren’t listed.{' '}
              {flightLinks.length > 0 && <>Look yourself: {flightLinks.map((l, i) => <span key={l.label}>{i ? ' · ' : ''}<a href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a></span>)}</>}
            </p>
          )}
        </section>

        <section className="sheet-sec">
          <h3>Check it for real</h3>
          <div className="row">
            {fromAir && toAir && fromAir !== toAir && (
              <button className="btn small" onClick={checkFlights} disabled={offers.state === 'loading'}>
                {offers.state === 'loading' ? 'Asking Google Flights…' : `Flights ${fromAir} → ${toAir}`}
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
              {[['Out', bus.data.out], ['Back', bus.data.back]].map(([label, list]) => (
                (list as BusRide[]).length > 0 && (
                  <div key={label as string} style={{ marginBottom: 6 }}>
                    <span className="caps muted">{label as string}</span>
                    {(list as BusRide[]).slice(0, 6).map((r, i) => (
                      <div className="offer" key={i}>
                        <span className="mono">{r.dep.slice(11, 16)} → {r.arr.slice(11, 16)} · {duration(r.durationMin)}{r.transfers ? ` · ${r.transfers} chg` : ''}</span>
                        <b className="mono">€{r.priceEur.toFixed(2)}</b>
                      </div>
                    ))}
                  </div>
                )
              ))}
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
          <h3>Ledger</h3>
          <table className="ledger">
            <tbody>
              <tr><td>{MODE_LABEL[t.best.mode]}, return</td><td className="num">{money(t.best.price, cur)}</td></tr>
              <tr>
                <td>
                  Stay & spending, {nightsPaid || 'no'} night{nightsPaid === 1 ? '' : 's'}
                  <div className="muted" style={{ fontSize: '0.78rem' }}>about {money(t.dest.daily * STAY_FACTOR[spec.stayStyle], cur)} a day at your stay level</div>
                </td>
                <td className="num">{money(t.stayCost, cur)}</td>
              </tr>
              <tr className="total"><td>Per person</td><td className="num">{money(t.total, cur)}</td></tr>
              {people > 1 && <tr><td>For {people} of you</td><td className="num">{money(t.total * people, cur)}</td></tr>}
            </tbody>
          </table>
          <p className="muted" style={{ fontSize: '0.78rem', margin: 0 }}>
            Prices stamped “live” are real fares (Ryanair, Google Flights, FlixBus). Prices stamped “est.” are estimates from distance, region and how far ahead you book; follow the links for the real price. Stay costs are always estimates.
          </p>
        </section>
      </aside>
    </>
  );
}
