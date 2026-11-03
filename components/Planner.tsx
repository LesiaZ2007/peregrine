'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { applyPatch, decodeSpec, DEFAULT_SPEC, encodeSpec, normalizeSpec, PRESETS } from '@/lib/spec';
import { EMPTY_IDS, EMPTY_PRESETS, EMPTY_SAVED, K, useStored, type SavedPreset, type SavedTrip } from '@/lib/store';
import type { SearchResult, SearchSpec, Trip } from '@/lib/types';
import PlanForm, { type CatalogEntry, type CountryEntry } from './PlanForm';
import RouteChart from './RouteChart';
import TripSheet from './TripSheet';
import TripSlip from './TripSlip';

type Res = SearchResult & { quota: { left: number; total: number } | null };

export default function Planner({ catalog, countries, hasLive }: { catalog: CatalogEntry[]; countries: CountryEntry[]; hasLive: boolean }) {
  const [stored, setStored] = useStored<SearchSpec>(K.spec, DEFAULT_SPEC);
  const [visited, setVisited] = useStored<string[]>(K.visited, EMPTY_IDS);
  const [wishlist, setWishlist] = useStored<string[]>(K.wishlist, EMPTY_IDS);
  const [saved, setSaved] = useStored<SavedTrip[]>(K.saved, EMPTY_SAVED);
  const [presets, setPresets] = useStored<SavedPreset[]>(K.presets, EMPTY_PRESETS);
  const spec = useMemo(() => normalizeSpec(stored), [stored]);

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
      const body = { ...s, visited, wishlist };
      const r = await fetch('/api/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(`Search failed (${r.status})`);
      setRes((await r.json()) as Res);
      setRanFor(JSON.stringify(s));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [visited, wishlist]);

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

  const stale = res && ranFor !== JSON.stringify(spec);
  const trips = res?.trips ?? [];
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
        <RouteChart origins={spec.origins} trips={trips} hot={hot} setHot={setHot} open={setOpen} title={title} />
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
                <TripSlip key={t.key} trip={t} rank={i + 1} cur={cur} hot={hot === t.key} setHot={setHot} open={() => setOpen(t)} />
              ))}
            </div>
          </>
        )}
      </main>

      {open && (
        <TripSheet
          trip={open}
          spec={spec}
          close={() => setOpen(null)}
          saved={saved.some((s) => s.key === open.key)}
          onSave={() => setSaved((list) => (list.some((s) => s.key === open.key) ? list.filter((s) => s.key !== open.key) : [{ key: open.key, savedAt: new Date().toISOString(), trip: open, currency: cur }, ...list]))}
          been={visited.includes(open.dest.id)}
          onBeen={() => setVisited((v) => toggle(v, open.dest.id))}
          wished={wishlist.includes(open.dest.id)}
          onWish={() => setWishlist((v) => toggle(v, open.dest.id))}
          onHide={() => { set({ exclude: [...new Set([...spec.exclude, open.dest.id])] }); setOpen(null); }}
        />
      )}
    </div>
  );
}
