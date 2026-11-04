'use client';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
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
import MapStrip, { type MapStripHandle } from './MapStrip';

type Res = SearchResult & { quota: { left: number; total: number } | null };
type View = 'search' | 'map' | 'list';

/** Phones and small tablets get the one-thing-at-a-time layout with a tab bar. */
const NARROW = '(max-width: 980px)';
function useNarrow() {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(NARROW); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); },
    () => window.matchMedia(NARROW).matches,
    () => false,
  );
}

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
  const narrow = useNarrow();
  const strip = useRef<MapStripHandle>(null);
  const [chatOpen, setChatOpen] = useState(false);

  // phone views: search form, full-screen map, or the list; the back button steps between them
  const [view, setViewRaw] = useState<View>('search');
  const go = useCallback((v: View) => {
    setViewRaw(v);
    window.scrollTo(0, 0);
    const want = v === 'search' ? '' : `#${v}`;
    if (window.location.hash !== want) window.history.pushState(null, '', want || window.location.pathname);
  }, []);
  useEffect(() => {
    const onPop = () => {
      setOpen(null);
      const h = window.location.hash.slice(1);
      setViewRaw(h === 'map' || h === 'list' ? h : 'search');
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

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
    // read the device's settings directly: on the first render the stored value isn't hydrated yet
    let saved: SearchSpec | null = null;
    try {
      const raw = localStorage.getItem(K.spec);
      saved = raw ? normalizeSpec(JSON.parse(raw)) : null;
    } catch { /* private mode */ }
    const first = fromLink ?? (saved?.origins.length ? saved : null);
    if (fromLink) {
      setStored(fromLink);
      window.history.replaceState(null, '', window.location.pathname);
    }
    if (first) {
      setTimeout(() => {
        const h = window.location.hash.slice(1);
        const v = h === 'map' ? 'map' : 'list';
        setViewRaw(v);
        window.history.replaceState(null, '', `#${v}`);
        run(first);
      }, 0);
    }
  }, [run, setStored]);

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

  // on phones the trip sheet is a screen of its own, so the back button closes it
  const openTrip = useCallback((t: Trip) => {
    setOpen(t);
    if (narrow && !window.history.state?.pgSheet) window.history.pushState({ pgSheet: true }, '', window.location.href);
  }, [narrow]);
  const closeTrip = useCallback(() => {
    if (window.history.state?.pgSheet) window.history.back();
    else setOpen(null);
  }, []);

  function plot(s: SearchSpec) {
    run(s);
    if (narrow) go('list');
  }
  /** on a phone the first tap on a place lights it and brings its card up; the second opens it */
  const pickOnMap = (t: Trip) => {
    if (hot === t.key) openTrip(t);
    else { setHot(t.key); strip.current?.show(t.key); }
  };

  const title = spec.origins.length ? `From ${spec.origins.map((o) => o.label).join(' + ')}` : 'Peregrine';

  return (
    <div className="planner" data-view={view}>
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
          <button className="btn primary" onClick={() => plot(spec)} disabled={loading || !spec.origins.length}>
            {loading ? 'Plotting…' : stale ? 'Re-plot routes' : 'Plot routes'}
          </button>
          <button className="btn small" onClick={savePreset} title="Save these settings as a starting point">Save setup</button>
          <button className="btn small" onClick={share} title="Copy a link to this search">{copied ? 'Copied' : 'Share'}</button>
        </div>
      </aside>

      <main className="results">
        <div className="pane-map">
          <RouteChart origins={spec.origins} trips={trips} near={near} shapes={shapes} hot={hot} setHot={setHot} open={openTrip} title={title}
            fill={narrow} padBottom={narrow && trips.length ? 150 : 0} pick={narrow ? pickOnMap : undefined} />
          {narrow && <MapStrip ref={strip} trips={trips} cur={cur} hot={hot} setHot={setHot} open={openTrip} />}
          {narrow && loading && <div className="loading-bar map-loading" aria-label="Searching" />}
        </div>

        <div className="pane-list">
        {spec.origins.length > 0 && (
          <div className="m-summary">
            <div>
              <b>{title}</b>
              <span className="mono">
                {loading ? 'plotting routes…' : res ? `${trips.length} trips · ${res.windows.length} date${res.windows.length === 1 ? '' : 's'} · ${res.considered} places checked${stale ? ' · settings changed' : ''}` : 'not plotted yet'}
              </span>
            </div>
            <button type="button" className="btn small" onClick={() => go('search')}>Edit search</button>
          </div>
        )}
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
                <TripSlip key={t.key} trip={t} rank={i + 1} cur={cur} hot={hot === t.key} setHot={setHot} open={() => openTrip(t)}
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
                      <TripSlip key={`n-${t.key}`} trip={t} rank={i + 1} cur={cur} hot={hot === t.key} setHot={setHot} open={() => openTrip(t)}
                        starred={acts.isStarred(t)} onStar={() => acts.toggleStar(t)} compared={acts.inCompare(t)} onCompare={() => acts.toggleCompare(t)} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
        </div>
      </main>

      <nav className="m-tabs" aria-label="Planner views">
        <button type="button" aria-pressed={view === 'search'} onClick={() => go('search')}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h9M15 5h2M3 10h3M9 10h8M3 15h7M13 15h4" /><circle cx="13.5" cy="5" r="1.6" /><circle cx="7.5" cy="10" r="1.6" /><circle cx="11.5" cy="15" r="1.6" /></svg>
          Search
        </button>
        <button type="button" aria-pressed={view === 'map'} onClick={() => go('map')} disabled={!res && !loading}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2.5 5 7.5 3l5 2 5-2v12l-5 2-5-2-5 2Z M7.5 3v12M12.5 5v12" /></svg>
          Map
        </button>
        <button type="button" aria-pressed={view === 'list'} onClick={() => go('list')} disabled={!res && !loading}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14" /></svg>
          List{res && !loading ? <i className="mono">{trips.length}</i> : null}
        </button>
        <button type="button" aria-pressed={chatOpen} onClick={() => setChatOpen((v) => !v)}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4h14v9H8l-4 3v-3H3Z" /></svg>
          Ask
        </button>
      </nav>

      {open && (
        <TripSheet
          trip={open}
          spec={spec}
          close={closeTrip}
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
            closeTrip();
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
        open={chatOpen}
        onOpenChange={setChatOpen}
        context={() => chatContext({ spec, results: trips, near, starred: acts.starred.map((s) => s.trip), compare: acts.compare, page: 'planner' })}
        prompts={['Which of my top results is the best value and why?', 'Compare the places in my compare list', 'Find me somewhere with a beach under 150 all in', 'What could I do this weekend without flying?']}
        onApply={(raw) => { const patch = { ...raw }; for (const k of ['budgetTotal', 'budgetTransport'] as const) { const v = patch[k]; if (typeof v === 'number') patch[k] = Math.round(toUsd(v, spec.currency)); } const next = normalizeSpec({ ...spec, ...patch, when: { ...spec.when, ...(patch.when ?? {}) }, modes: { ...spec.modes, ...(patch.modes ?? {}) }, weights: { ...spec.weights, ...(patch.weights ?? {}) } }); setStored(next); run(next); if (narrow) { setChatOpen(false); go('list'); } }}
      />
    </div>
  );
}
