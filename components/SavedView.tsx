'use client';
import Link from 'next/link';
import { duration, money } from '@/lib/money';
import { encodeSpec } from '@/lib/spec';
import { EMPTY_IDS, EMPTY_PRESETS, EMPTY_SAVED, K, useStored, type SavedPreset, type SavedTrip } from '@/lib/store';
import { LineBadge } from './icons';

export default function SavedView({ names }: { names: Record<string, string> }) {
  const [saved, setSaved] = useStored<SavedTrip[]>(K.saved, EMPTY_SAVED);
  const [presets, setPresets] = useStored<SavedPreset[]>(K.presets, EMPTY_PRESETS);
  const [visited, setVisited] = useStored<string[]>(K.visited, EMPTY_IDS);
  const [wishlist, setWishlist] = useStored<string[]>(K.wishlist, EMPTY_IDS);

  return (
    <div className="page">
      <div>
        <h1>Saved</h1>
        <p className="muted">Kept on this device only.</p>
      </div>

      <section>
        <h2>Trips ({saved.length})</h2>
        {!saved.length && <p className="muted">Open a result and press Save trip.</p>}
        <div className="card-list">
          {saved.map(({ key, trip: t, currency, savedAt }) => (
            <div className="card" key={key}>
              <div>
                <b>{t.dest.name}</b> <span className="muted">{t.dest.country}</span>
                <div className="row" style={{ marginTop: 6, gap: 8 }}>
                  <LineBadge mode={t.best.mode} />
                  <span className="mono" style={{ fontSize: '0.82rem' }}>
                    {t.window.label} · {duration(t.best.outMin)} · {money(t.best.price, currency)} {t.best.source === 'live' ? 'live' : 'est.'} · {money(t.total, currency)} all in
                  </span>
                </div>
                <div className="muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
                  saved {new Date(savedAt).toLocaleDateString('en-GB')} · prices change, check again before booking ·{' '}
                  {t.best.links[0] && <a href={t.best.links[0].url} target="_blank" rel="noreferrer">{t.best.links[0].label} ↗</a>}
                </div>
              </div>
              <button className="btn small ghost" onClick={() => setSaved(saved.filter((s) => s.key !== key))}>Remove</button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Your setups ({presets.length})</h2>
        {!presets.length && <p className="muted">On the planner, press Save setup to keep a set of filters.</p>}
        <div className="card-list">
          {presets.map((p) => (
            <div className="card" key={p.id}>
              <div>
                <b>{p.name}</b>
                <div className="muted" style={{ fontSize: '0.8rem' }}>
                  from {p.spec.origins.map((o) => o.label).join(', ') || 'anywhere'} · {p.spec.when.kind}
                </div>
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
        {[
          ['Wishlist', wishlist, setWishlist, 'Wishlist places get a boost in results.'],
          ['Been there', visited, setVisited, 'Tick “Skip where I’ve been” to hide these.'],
        ].map(([title, list, setList, hint]) => (
          <section key={title as string}>
            <h2>{title as string} ({(list as string[]).length})</h2>
            <p className="muted" style={{ fontSize: '0.85rem' }}>{hint as string}</p>
            <div className="tags">
              {(list as string[]).map((id) => (
                <button key={id} className="tag" onClick={() => (setList as (v: string[]) => void)((list as string[]).filter((x) => x !== id))}>
                  {names[id] ?? id}<span className="x">×</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
