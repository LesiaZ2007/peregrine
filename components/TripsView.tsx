'use client';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { chatContext } from '@/lib/brief';
import { shortDay, tripWindows } from '@/lib/dates';
import { exportBackup, exportPlanCsv, exportPlanIcs, exportStarsCsv, importBackup } from '@/lib/exporter';
import { duration, money } from '@/lib/money';
import { DEFAULT_SPEC, encodeSpec, normalizeSpec } from '@/lib/spec';
import { EMPTY_IDS, EMPTY_PLAN, EMPTY_PRESETS, K, useStored, type PlanSlot, type SavedPreset } from '@/lib/store';
import type { SearchResult, SearchSpec, Trip, TripWindow } from '@/lib/types';
import { useTripActions } from '@/lib/useTripActions';
import ChatDock from './ChatDock';
import { LineBadge } from './icons';
import TripSheet from './TripSheet';
import { Star } from './TripSlip';

type Cands = { state: 'loading' | 'done' | 'error'; trips: Trip[]; msg?: string };

export default function TripsView({ names }: { names: Record<string, string> }) {
  const [stored] = useStored<SearchSpec>(K.spec, DEFAULT_SPEC);
  const spec = useMemo(() => normalizeSpec(stored), [stored]);
  const cur = spec.currency;
  const m = (v: number) => money(v, cur);
  const acts = useTripActions(cur);
  const [plan, setPlan] = useStored<PlanSlot[]>(K.plan, EMPTY_PLAN);
  const [presets, setPresets] = useStored<SavedPreset[]>(K.presets, EMPTY_PRESETS);
  const [visited, setVisited] = useStored<string[]>(K.visited, EMPTY_IDS);
  const [wishlist, setWishlist] = useStored<string[]>(K.wishlist, EMPTY_IDS);
  const [weeks, setWeeks] = useStored<number>('pg:planWeeks', 12);
  const [cands, setCands] = useState<Record<string, Cands>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<Trip | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const starredTrips = acts.starred.map((s) => s.trip);
  const byId = useMemo(() => new Map(starredTrips.map((t) => [t.dest.id, t])), [starredTrips]);
  const windows = useMemo(
    () => tripWindows({ ...spec.when, kind: 'weekends', weekendsAhead: weeks, blackouts: [] }),
    [spec.when, weeks],
  );
  const busyDays = new Set(spec.when.blackouts);
  const slotFor = (w: TripWindow): PlanSlot => plan.find((p) => p.depart === w.depart) ?? { depart: w.depart, ret: w.ret, tripKey: null, status: 'open' };
  const setSlot = (w: TripWindow, patch: Partial<PlanSlot>) =>
    setPlan((list) => {
      const cur0 = list.find((p) => p.depart === w.depart) ?? { depart: w.depart, ret: w.ret, tripKey: null, status: 'open' as const };
      return [...list.filter((p) => p.depart !== w.depart), { ...cur0, ...patch }].sort((a, b) => a.depart.localeCompare(b.depart));
    });

  /** Real search for exactly this weekend, limited to the given places. */
  async function searchWeekend(w: TripWindow, ids: string[]): Promise<Trip[]> {
    const body: SearchSpec = {
      ...spec, scope: 'places', places: ids, tagsAny: [], tagsNone: [], exclude: [], skipVisited: false, visited, wishlist,
      when: { ...spec.when, kind: 'exact', depart: w.depart, ret: w.ret }, limit: 40,
    };
    const r = await fetch('/api/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`Search failed (${r.status})`);
    const j = (await r.json()) as SearchResult;
    return [...j.trips, ...j.near].sort((a, b) => a.total - b.total);
  }

  async function checkPrice(w: TripWindow, id: string) {
    setBusy((b) => ({ ...b, [w.depart]: true }));
    try {
      const t = (await searchWeekend(w, [id])).find((x) => x.dest.id === id);
      setSlot(w, {
        checked: t ? { price: t.best.price, total: t.total, mode: t.best.mode, source: t.best.source, at: new Date().toISOString() } : null,
        note: t ? (t.nearMiss?.length ? `outside your settings: ${t.nearMiss.join('; ')}` : undefined) : 'no way there fits these dates',
      });
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy((b) => ({ ...b, [w.depart]: false }));
    }
  }

  async function compareWeekend(w: TripWindow) {
    const ids = starredTrips.map((t) => t.dest.id);
    if (!ids.length) return;
    setCands((c) => ({ ...c, [w.depart]: { state: 'loading', trips: [] } }));
    try {
      const trips = await searchWeekend(w, ids);
      setCands((c) => ({ ...c, [w.depart]: { state: 'done', trips } }));
    } catch (e) {
      setCands((c) => ({ ...c, [w.depart]: { state: 'error', trips: [], msg: (e as Error).message } }));
    }
  }

  const planned = windows.map((w) => ({ w, slot: slotFor(w) })).filter(({ slot }) => slot.status === 'trip' && slot.tripKey && byId.has(slot.tripKey));
  const seasonTotal = planned.reduce((sum, { slot }) => sum + (slot.checked?.total ?? byId.get(slot.tripKey!)!.total), 0);
  const seasonTravel = planned.reduce((sum, { slot }) => sum + (slot.checked?.price ?? byId.get(slot.tripKey!)!.best.price), 0);

  const planText = windows
    .map((w) => {
      const s = slotFor(w);
      const t = s.tripKey ? byId.get(s.tripKey) : undefined;
      return `${w.label}: ${s.status === 'home' ? 'staying put' : t ? `${t.dest.name}${s.checked ? ` checked ${m(s.checked.total)} all in (${s.checked.source})` : ` about ${m(t.total)} from search`}` : 'open'}${busyDays.has(w.depart) || busyDays.has(w.ret) ? ' (has a busy day)' : ''}`;
    })
    .join('\n');

  return (
    <div className="page">
      <div>
        <h1>Trips</h1>
        <p className="muted" style={{ margin: 0 }}>Star places on the planner, then lay out your weekends here. Everything stays on this device; export it below.</p>
      </div>

      {msg && <div className="notes"><p>{msg}</p></div>}

      <section>
        <h2>Season plan</h2>
        <div className="row" style={{ marginBottom: 10 }}>
          <label className="field" style={{ minWidth: 220 }}>
            <span className="label">Weekends to plan: {weeks}</span>
            <input type="range" min={4} max={20} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} />
          </label>
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            Uses your weekend days from the planner (03 When). {acts.starred.length ? `${acts.starred.length} starred places to choose from.` : 'Star some places first.'}
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="season">
            <thead>
              <tr><th>Weekend</th><th>Plan</th><th style={{ textAlign: 'right' }}>Travel</th><th style={{ textAlign: 'right' }}>All in</th><th /></tr>
            </thead>
            <tbody>
              {windows.map((w) => {
                const s = slotFor(w);
                const t = s.tripKey ? byId.get(s.tripKey) : undefined;
                const alt = t?.alts.find((a) => a.window.depart === w.depart);
                const price = s.checked?.price ?? alt?.price ?? t?.best.price;
                const total = s.checked?.total ?? alt?.total ?? t?.total;
                const src = s.checked ? `${s.checked.source === 'live' ? 'live' : 'est.'}, checked for these dates` : alt ? 'from your search' : t ? 'from another weekend; check' : '';
                const hasBusy = [...busyDays].some((d) => d >= w.depart && d <= w.ret);
                const c = cands[w.depart];
                return (
                  <tr key={w.depart} data-status={s.status}>
                    <td>
                      <b>{w.label}</b>
                      <div className="muted mono" style={{ fontSize: '0.75rem' }}>{w.nights} nights{hasBusy ? ' · busy day' : ''}</div>
                    </td>
                    <td className="span2">
                      <select
                        className="input"
                        value={s.status === 'home' ? '__home' : s.tripKey ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === '__home') setSlot(w, { status: 'home', tripKey: null, checked: null, note: undefined });
                          else if (!v) setSlot(w, { status: 'open', tripKey: null, checked: null, note: undefined });
                          else setSlot(w, { status: 'trip', tripKey: v, checked: null, note: undefined });
                        }}
                        aria-label={`Plan for ${w.label}`}
                      >
                        <option value="">Open</option>
                        <option value="__home">Staying put</option>
                        {starredTrips.map((x) => <option key={x.dest.id} value={x.dest.id}>★ {x.dest.name}</option>)}
                      </select>
                      {t && <div style={{ marginTop: 6 }}><LineBadge mode={(s.checked?.mode as Trip['best']['mode']) ?? alt?.mode ?? t.best.mode} /> <span className="muted" style={{ fontSize: '0.78rem' }}>{src}</span></div>}
                      {s.note && <div className="near-why" style={{ fontSize: '0.78rem', marginTop: 4 }}>{s.note}</div>}
                      {c && (
                        <div className="cands">
                          {c.state === 'loading' && <span className="muted">Pricing your starred places for this weekend…</span>}
                          {c.state === 'error' && <span className="muted">{c.msg}</span>}
                          {c.state === 'done' && !c.trips.length && <span className="muted">None of your starred places fit this weekend.</span>}
                          {c.trips.map((x) => (
                            <div className="cand" key={x.key}>
                              <span><b>{x.dest.name}</b>{x.nearMiss?.length ? <span className="near-why" style={{ fontSize: '0.75rem' }}> · outside: {x.nearMiss[0]}</span> : null}</span>
                              <span><LineBadge mode={x.best.mode} /> <span className="mono">{duration(x.best.outMin)}</span></span>
                              <span className="mono">{m(x.total)} <span className={`stamp ${x.best.source === 'live' ? 'live' : 'est'}`}>{x.best.source === 'live' ? 'live' : 'est.'}</span></span>
                              <span className="row" style={{ gap: 4 }}>
                                <button className="btn small" onClick={() => setSlot(w, { status: 'trip', tripKey: x.dest.id, checked: { price: x.best.price, total: x.total, mode: x.best.mode, source: x.best.source, at: new Date().toISOString() }, note: x.nearMiss?.length ? `outside your settings: ${x.nearMiss.join('; ')}` : undefined })}>Choose</button>
                                <button className="btn small ghost" onClick={() => acts.toggleCompare(x)}>{acts.inCompare(x) ? '✓ cmp' : '+ cmp'}</button>
                              </span>
                            </div>
                          ))}
                          {c.state === 'done' && <button className="btn small ghost" style={{ justifySelf: 'start' }} onClick={() => setCands((all) => { const n = { ...all }; delete n[w.depart]; return n; })}>Hide</button>}
                        </div>
                      )}
                    </td>
                    <td className="num">{price != null && s.status === 'trip' ? m(price) : '—'}</td>
                    <td className="num">{total != null && s.status === 'trip' ? m(total) : '—'}</td>
                    <td>
                      <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                        {t && <button className="btn small" disabled={busy[w.depart]} onClick={() => checkPrice(w, t.dest.id)}>{busy[w.depart] ? 'Checking…' : 'Check price'}</button>}
                        {starredTrips.length > 1 && <button className="btn small ghost" onClick={() => compareWeekend(w)}>Compare stars</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>{planned.length} trip{planned.length === 1 ? '' : 's'} planned</td>
                <td className="span2 muted" style={{ fontWeight: 400, fontSize: '0.8rem' }}>Unchecked weekends use prices from your last search.</td>
                <td className="num">{m(seasonTravel)}</td>
                <td className="num">{m(seasonTotal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section>
        <h2>Starred ({acts.starred.length})</h2>
        {!acts.starred.length && <p className="muted">Press ☆ on any result in the <Link href="/">planner</Link>.</p>}
        <div className="card-list">
          {acts.starred.map(({ key, trip: t, savedAt }) => (
            <div className="card" key={key}>
              <div>
                <div className="row" style={{ gap: 6 }}>
                  <Star on onClick={() => acts.toggleStar(t)} label={t.dest.name} />
                  <button className="linkish" onClick={() => setOpen(t)}><b>{t.dest.name}</b></button>
                  <span className="muted">{t.dest.country}</span>
                </div>
                <div className="row" style={{ marginTop: 6, gap: 8 }}>
                  <LineBadge mode={t.best.mode} />
                  <span className="mono" style={{ fontSize: '0.82rem' }}>
                    {t.window.label} · {duration(t.best.outMin)} · {m(t.best.price)} {t.best.source === 'live' ? 'live' : 'est.'} · {m(t.total)} all in
                  </span>
                </div>
                <div className="muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>starred {new Date(savedAt).toLocaleDateString('en-GB')} · prices change, check again before booking</div>
              </div>
              <div className="row">
                <button className="btn small" onClick={() => acts.toggleCompare(t)}>{acts.inCompare(t) ? 'In compare' : 'Compare'}</button>
              </div>
            </div>
          ))}
        </div>
        {acts.compare.length > 0 && <p style={{ marginTop: 10 }}><Link className="btn small accent" href="/compare">Open compare ({acts.compare.length})</Link></p>}
      </section>

      <section>
        <h2>Your setups ({presets.length})</h2>
        {!presets.length && <p className="muted">On the planner, press Save setup to keep a set of filters.</p>}
        <div className="card-list">
          {presets.map((p) => (
            <div className="card" key={p.id}>
              <div>
                <b>{p.name}</b>
                <div className="muted" style={{ fontSize: '0.8rem' }}>from {p.spec.origins.map((o) => o.label).join(', ') || 'anywhere'} · {p.spec.when.kind}</div>
              </div>
              <div className="row">
                <Link className="btn small" href={`/?s=${encodeSpec(p.spec)}`}>Open</Link>
                <button className="btn small ghost" onClick={() => setPresets(presets.filter((x) => x.id !== p.id))}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid2" style={{ gap: 28 }}>
        {([
          ['Wishlist', wishlist, setWishlist, 'Wishlist places get a boost in results.'],
          ['Been there', visited, setVisited, 'Tick “Skip where I’ve been” to hide these.'],
        ] as const).map(([title, list, setList, hint]) => (
          <section key={title}>
            <h2>{title} ({list.length})</h2>
            <p className="muted" style={{ fontSize: '0.85rem' }}>{hint}</p>
            <div className="tags">
              {list.map((id) => (
                <button key={id} className="tag" onClick={() => setList(list.filter((x) => x !== id))}>
                  {names[id] ?? id}<span className="x">×</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section>
        <h2>Export</h2>
        <div className="export-row">
          <button className="btn small" onClick={exportBackup}>Full backup (.json)</button>
          <button className="btn small" onClick={() => exportStarsCsv(acts.starred, cur)} disabled={!acts.starred.length}>Starred (.csv)</button>
          <button className="btn small" onClick={() => exportPlanCsv(windows.map(slotFor), acts.starred, cur)}>Season plan (.csv)</button>
          <button className="btn small" onClick={() => exportPlanIcs(windows.map(slotFor), acts.starred, cur)} disabled={!planned.length}>Plan to calendar (.ics)</button>
          <button className="btn small ghost" onClick={() => fileRef.current?.click()}>Import backup…</button>
          <input
            ref={fileRef} type="file" accept="application/json,.json" hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try {
                setMsg(`Restored ${await importBackup(f)} sections from ${f.name}.`);
              } catch (err) {
                setMsg((err as Error).message);
              }
            }}
          />
        </div>
        <p className="muted" style={{ fontSize: '0.8rem' }}>The backup holds your settings, stars, plan, compare list, setups, wishlist and been-there list. Importing replaces what’s here.</p>
      </section>

      {open && (
        <TripSheet
          trip={open}
          spec={spec}
          close={() => setOpen(null)}
          starred={acts.isStarred(open)}
          onStar={() => acts.toggleStar(open)}
          compared={acts.inCompare(open)}
          onCompare={() => acts.toggleCompare(open)}
          been={visited.includes(open.dest.id)}
          onBeen={() => setVisited((v) => (v.includes(open.dest.id) ? v.filter((x) => x !== open.dest.id) : [...v, open.dest.id]))}
          wished={wishlist.includes(open.dest.id)}
          onWish={() => setWishlist((v) => (v.includes(open.dest.id) ? v.filter((x) => x !== open.dest.id) : [...v, open.dest.id]))}
        />
      )}

      <ChatDock
        context={() => chatContext({ spec, starred: starredTrips, compare: acts.compare, page: 'trips (season plan)', extra: `Season plan:\n${planText}\nWeekends shown: ${windows.map((w) => shortDay(w.depart)).join(', ')}` })}
        prompts={['Which starred place suits which weekend?', 'How much will my plan cost in total?', 'Which of my stars is the best value?', 'Suggest a cheaper swap for my priciest weekend']}
      />
    </div>
  );
}
