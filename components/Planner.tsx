'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { applyPatch, decodeSpec, DEFAULT_SPEC, encodeSpec, normalizeSpec, PRESETS } from '@/lib/spec';
import Link from 'next/link';
import { chatContext } from '@/lib/brief';
import { toUsd } from '@/lib/money';
import { EMPTY_IDS, EMPTY_PRESETS, K, useStored, type SavedPreset } from '@/lib/store';
import { useTripActions } from '@/lib/useTripActions';
import type { SearchResult, SearchSpec, SortKey, Trip } from '@/lib/types';
import PlanForm, { type CatalogEntry, type CountryEntry } from './PlanForm';
import RouteChart, { type ShapeLeg } from './RouteChart';
import TripSheet from './TripSheet';
import ChatDock from './ChatDock';
import TripSlip from './TripSlip';

type Res = SearchResult & { quota: { left: number; total: number } | null };

export default function Planner({ catalog, countries, hasLive }: { catalog: CatalogEntry[]; countries: CountryEntry[]; hasLive: boolean }) {
  const [stored, setStored] = useStored<SearchSpec>(K.spec, DEFAULT_SPEC);
  const [visited, setVisited] = useStored<string[]>(K.visited, EMPTY_IDS);
  const [wishlist, setWishlist] = useStored<string[]>(K.wishlist, EMPTY_IDS);
  const [beenCc] = useStored<string[]>(K.countries, EMPTY_IDS);
  const ccOf = useMemo(() => new Map(catalog.map((c) => [c.id, c.cc])), [catalog]);
  const beenCountries = useMemo(() => [...new Set([...beenCc, ...visited.map((id) => ccOf.get(id)).filter((x): x is string => !!x)])], [beenCc, visited, ccOf]);
  const [presets, setPresets] = useStored<SavedPreset[]>(K.presets, EMPTY_PRESETS);
  const spec = useMemo(() => normalizeSpec(stored), [stored]);
  const acts = useTripActions(spec.currency);

  const [res, setRes] = useState<Res | null>(null);
  const [ranFor, setRanFor] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const [open, setOpen] = useState<Trip | null>(null);
  const [copied, setCopied] = useState(false);
  const booted = useRef(false);

  const set = useCallback((patch: Partial<SearchSpec>) => setStored((s) => ({ ...normalizeSpec(s), ...patch })), [setStored]);

  const run = useCallback(async (s: SearchSpec) => {
    if (!s.origins.length) return;
    setLoading(true);
    setError(null);
    try {
      const body = { ...s, visited, wishlist, beenCountries };
      const r = await fetch('/api/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(`Search failed (${r.status})`);
      setRes((await r.json()) as Res);
      setRanFor(JSON.stringify({ ...s, sort: 'score', currency: 'USD' }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [visited, wishlist, beenCountries]);

  // first load: a shared link (?s=) wins over what's stored on this device
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const shared = new URLSearchParams(window.location.search).get('s');
    const fromLink = shared ? decodeSpec(shared) : null;
    const first = fromLink ?? (spec.origins.length ? spec : null);
    if (fromLink) {
      setStored(fromLink);
      window.history.replaceState(null, '', window.location.pathname);
    }
    if (first) setTimeout(() => run(first), 0);
  }, [run, setStored, spec]);

  // sorting is instant and client-side, so it doesn't make results "stale"
  const sansSort = (x: SearchSpec) => JSON.stringify({ ...x, sort: 'score', currency: 'USD' });
  const stale = res && ranFor !== sansSort(spec);
  const trips = useMemo(() => {
    const by: Record<SortKey, (t: Trip) => number> = {
      score: (t) => -t.score, total: (t) => t.total, price: (t) => t.best.price, time: (t) => t.best.outMin,
      hoursThere: (t) => -t.hoursThere, distance: (t) => t.distanceKm,
    };
    return [...(res?.trips ?? [])].sort((a, b) => by[spec.sort](a) - by[spec.sort](b) || a.total - b.total);
  }, [res, spec.sort]);
  const near = res?.near ?? [];
  const [showNear, setShowNear] = useState(false);

  // real track shapes for the leading ground journeys (drawn on the map once they arrive)
  const [shapes, setShapes] = useState<Record<string, ShapeLeg[] | null>>({});
  useEffect(() => {
    const ground = (res?.trips ?? []).filter((t) => t.best.mode === 'train' || t.best.mode === 'bus' || t.best.mode === 'ferry').slice(0, 12);
    if (!ground.length) return;
    const ctrl = new AbortController();
    const items = ground.map((t) => ({
      key: t.key, from: [t.originLat, t.originLon], to: [t.dest.lat, t.dest.lon], time: `${t.window.depart}T${spec.when.leaveAfter || '09:00'}:00`,
    }));
    fetch('/api/shapes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items }), signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : { shapes: {} }))
      .then((j: { shapes: Record<string, ShapeLeg[] | null> }) => setShapes((old) => ({ ...old, ...j.shapes })))
      .catch(() => {});
    return () => ctrl.abort();
    // only when a new result set arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res]);
  const cur = spec.currency;

  function share() {
    const url = `${window.location.origin}/?s=${encodeSpec(spec)}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  function savePreset() {
    const name = window.prompt('Name this setup', 'My weekends');
    if (!name) return;
    setPresets((p) => [...p.filter((x) => x.name !== name), { id: `${Date.now()}`, name, spec: { ...spec, origins: spec.origins } }]);
  }
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const title = spec.origins.length ? `From ${spec.origins.map((o) => o.label).join(' + ')}` : 'Peregrine';

  return (
    <div className="planner">
      <aside className="plan" aria-label="Trip settings" id="settings">
        <div className="plan-head">
          <h1>Where can I get to?</h1>
          <p>Set a home base, say what you’re after, and Peregrine plots every cheap way out: rail, coach, air, sea and shared cars.</p>
        </div>
        <div className="presets" aria-label="Starting points">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className="preset" onClick={() => setStored(applyPatch(spec, p.patch))}>
              <b>{p.name}</b>
              <span>{p.hint}</span>
            </button>
          ))}
          {presets.map((p) => (
            <button key={p.id} type="button" className="preset" onClick={() => setStored(normalizeSpec(p.spec))} style={{ borderColor: 'var(--accent)' }}>
              <b>{p.name}</b>
              <span>your setup</span>
            </button>
          ))}
        </div>
        <PlanForm spec={spec} set={set} catalog={catalog} countries={countries} quota={res?.quota ?? null} hasLive={hasLive} />
        <div className="go">
          <button className="btn primary" onClick={() => run(spec)} disabled={loading || !spec.origins.length}>
            {loading ? 'Plotting…' : stale ? 'Re-plot routes' : 'Plot routes'}
          </button>
          <button className="btn small" onClick={savePreset} title="Save these settings as a starting point">Save setup</button>
          <button className="btn small" onClick={share} title="Copy a link to this search">{copied ? 'Copied' : 'Share'}</button>
        </div>
      </aside>

      <main className="results">
        <RouteChart origins={spec.origins} trips={trips} near={near} shapes={shapes} hot={hot} setHot={setHot} open={setOpen} title={title} />
        {loading && <div className="loading-bar" aria-label="Searching" />}

        {!spec.origins.length && (
          <div className="empty">
            <h3>Start with where you’re based</h3>
            <p>Type your city in 01 From (a town or an airport code). You can add more than one.</p>
          </div>
        )}
        {error && <div className="empty"><h3>Something went wrong</h3><p>{error}</p></div>}

        {res && (
          <>
            <div className="res-head">
              <a className="btn small jump" href="#settings">Adjust search ↓</a>
              <div>
                <h2>{trips.length ? `${trips.length} ways out` : 'Nothing fits yet'}</h2>
                <div className="meta">
                  {res.considered} places checked · {res.windows.length} date{res.windows.length === 1 ? '' : 's'} · {res.live.calls + res.live.cached} live fare lookups
                  {stale ? ' · settings changed' : ''}
                </div>
              </div>
            </div>
            {trips.length > 1 && (
              <div className="sortbar" role="group" aria-label="Sort results">
                <span className="caps muted">Sort</span>
                {([
                  ['score', 'Best match'], ['total', 'Cheapest all in'], ['price', 'Cheapest travel'],
                  ['time', 'Shortest journey'], ['hoursThere', 'Most time there'], ['distance', 'Nearest'],
                ] as [SortKey, string][]).map(([k, label]) => (
                  <button key={k} type="button" className="tag" aria-pressed={spec.sort === k} onClick={() => set({ sort: k })}>{label}</button>
                ))}
              </div>
            )}
            {(res.notes.length > 0 || res.live.errors.length > 0) && (
              <div className="notes">
                {res.notes.map((n) => <p key={n}>{n}</p>)}
                {res.live.errors.map((n) => <p key={n}>{n}</p>)}
              </div>
            )}
            {!trips.length && (
              <div className="empty">
                <h3>No trips match every setting</h3>
                <p>Try a bigger budget, a longer journey limit, fewer hours required there, or more ways to travel.</p>
              </div>
            )}
            <div className="slips">
              {trips.map((t, i) => (
                <TripSlip key={t.key} trip={t} rank={i + 1} cur={cur} hot={hot === t.key} setHot={setHot} open={() => setOpen(t)}
                  starred={acts.isStarred(t)} onStar={() => acts.toggleStar(t)} compared={acts.inCompare(t)} onCompare={() => acts.toggleCompare(t)} />
              ))}
            </div>
            {near.length > 0 && (
              <>
                <div className="near-head">
                  <h3>Just outside your settings{near.some((t) => t.flags.includes('hidden')) ? ' · hidden places' : ''}</h3>
                  <span className="muted" style={{ fontSize: '0.85rem' }}>{near.length} place{near.length === 1 ? '' : 's'}, greyed on the map</span>
                  <button className="btn small" onClick={() => setShowNear((v) => !v)}>{showNear ? 'Hide' : 'Show'}</button>
                </div>
                {showNear && (
                  <div className="slips">
                    {near.map((t, i) => (
                      <TripSlip key={`n-${t.key}`} trip={t} rank={i + 1} cur={cur} hot={hot === t.key} setHot={setHot} open={() => setOpen(t)}
                        starred={acts.isStarred(t)} onStar={() => acts.toggleStar(t)} compared={acts.inCompare(t)} onCompare={() => acts.toggleCompare(t)} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

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
          onBeen={() => setVisited((v) => toggle(v, open.dest.id))}
          wished={wishlist.includes(open.dest.id)}
          onWish={() => setWishlist((v) => toggle(v, open.dest.id))}
          hidden={spec.exclude.includes(open.dest.id)}
          onHide={() => {
            const isHidden = spec.exclude.includes(open.dest.id);
            const next = normalizeSpec({ ...spec, exclude: isHidden ? spec.exclude.filter((x) => x !== open.dest.id) : [...spec.exclude, open.dest.id] });
            setStored(next);
            setOpen(null);
            run(next);
          }}
        />
      )}

      {acts.compare.length > 0 && !open && (
        <div className="cmp-tray" role="status">
          <span>{acts.compare.length} to compare</span>
          <Link className="btn small accent" href="/compare">Compare</Link>
          <button className="btn small" onClick={() => acts.setCompare([])}>Clear</button>
        </div>
      )}

      <ChatDock
        context={() => chatContext({ spec, results: trips, near, starred: acts.starred.map((s) => s.trip), compare: acts.compare, page: 'planner' })}
        prompts={['Which of my top results is the best value and why?', 'Compare the places in my compare list', 'Find me somewhere with a beach under 150 all in', 'What could I do this weekend without flying?']}
        onApply={(raw) => { const patch = { ...raw }; for (const k of ['budgetTotal', 'budgetTransport'] as const) { const v = patch[k]; if (typeof v === 'number') patch[k] = Math.round(toUsd(v, spec.currency)); } const next = normalizeSpec({ ...spec, ...patch, when: { ...spec.when, ...(patch.when ?? {}) }, modes: { ...spec.modes, ...(patch.modes ?? {}) }, weights: { ...spec.weights, ...(patch.weights ?? {}) } }); setStored(next); run(next); }}
      />
    </div>
  );
}
