'use client';
import { useState, useEffect, useCallback } from 'react';
import { Eye, PlusCircle, RefreshCw, Trash2, ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Link from 'next/link';
import { getWatchlist, removeFromWatchlist, updateWatchlistPrice, isStale, formatLastChecked } from '@/lib/watchlist';

export default function WatchlistPage() {
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedIds, setRefreshedIds] = useState(new Set());

  useEffect(() => {
    setItems(getWatchlist());
  }, []);

  const remove = (id) => {
    removeFromWatchlist(id);
    setItems(getWatchlist());
  };

  const refresh = useCallback(async (ids) => {
    setRefreshing(true);
    const toRefresh = ids || items.map(i => i.id);

    await Promise.allSettled(
      items
        .filter(item => toRefresh.includes(item.id))
        .map(async item => {
          try {
            const origin = item.origins?.[0];
            const dest   = item.destinations?.[0];
            if (!origin || !dest) return;

            const start = item.start ? new Date(item.start).toISOString().slice(0, 10) : '';
            const end   = item.end   ? new Date(item.end).toISOString().slice(0, 10)   : '';

            const qs = new URLSearchParams({ origins: origin, destination: dest, departureDate: start, ...(end ? { returnDate: end } : {}), adults: item.passengers?.adults || 1, max: 1 });
            const res  = await fetch(`/api/flights/search?${qs}`);
            const json = await res.json();

            if (json.data?.[0]?.price) {
              updateWatchlistPrice(item.id, json.data[0].price);
              setRefreshedIds(prev => new Set([...prev, item.id]));
            }
          } catch { /* silent */ }
        })
    );

    setItems(getWatchlist());
    setRefreshing(false);
  }, [items]);

  // Auto-refresh stale items on mount
  useEffect(() => {
    const staleIds = items.filter(isStale).map(i => i.id);
    if (staleIds.length > 0) refresh(staleIds);
  }, []); // eslint-disable-line

  if (items.length === 0) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, background: 'var(--amber-bg)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Eye size={20} color="var(--amber)" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Watchlist</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Price changes detected every time you visit</p>
          </div>
        </div>
        <div className="card" style={{ padding: 56, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>👁️</div>
          <h2 style={{ fontWeight: 800, fontSize: 20, margin: '0 0 10px' }}>No flights watched yet</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 360, margin: '0 auto 24px', lineHeight: 1.6 }}>
            Search for flights and click <strong>Watch</strong> on any result to track its price. Peregrine highlights changes when you return.
          </p>
          <Link href="/" className="btn btn-primary" style={{ display: 'inline-flex', justifyContent: 'center' }}>
            <PlusCircle size={15} />
            Search flights to watch
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, background: 'var(--amber-bg)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Eye size={20} color="var(--amber)" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Watchlist</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{items.length} route{items.length > 1 ? 's' : ''} tracked</p>
          </div>
        </div>
        <button onClick={() => refresh()} disabled={refreshing} className="btn btn-secondary" style={{ gap: 6 }}>
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          {refreshing ? 'Refreshing…' : 'Refresh All'}
        </button>
      </div>

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map(item => {
          const pct = item.priceChange || 0;
          const hasChange = Math.abs(pct) >= 2;
          const isUp = pct > 0;
          const TrendIcon = hasChange ? (isUp ? TrendingUp : TrendingDown) : Minus;
          const trendColor = hasChange ? (isUp ? 'var(--red)' : 'var(--green)') : 'var(--text-muted)';

          const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

          return (
            <div key={item.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {hasChange && (
                <div style={{ padding: '5px 16px', background: isUp ? 'var(--red-bg)' : 'var(--green-bg)', borderBottom: `1px solid ${isUp ? '#fca5a5' : '#a7f3d0'}`, fontSize: 12, fontWeight: 700, color: trendColor, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <TrendIcon size={13} />
                  Price {isUp ? 'went up' : 'dropped'} {Math.abs(pct)}% since you saved this route
                  {refreshedIds.has(item.id) && <span style={{ fontWeight: 400, opacity: .7 }}>· just updated</span>}
                </div>
              )}

              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>
                      {item.origins?.join(', ')} → {item.destinations?.join(', ')}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {formatDate(item.start)}{item.end ? ` → ${formatDate(item.end)}` : ''} · {item.tripType} · {item.cabin}
                    </div>
                  </div>

                  {/* Price display */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 22, color: trendColor }}>
                          ${item.currentPrice?.toLocaleString() || '—'}
                        </div>
                        {item.priceAtSave !== item.currentPrice && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                            was ${item.priceAtSave?.toLocaleString()}
                          </div>
                        )}
                      </div>
                      <TrendIcon size={20} color={trendColor} />
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-light)' }}>
                    Last checked: {formatLastChecked(item)} · Saved {new Date(item.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {isStale(item) && <span style={{ color: 'var(--amber)', marginLeft: 6, fontWeight: 600 }}>· Stale</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Link
                      href={`/results?origins=${item.origins?.join(',')}&destinations=${item.destinations?.join(',')}&tripType=${item.tripType}&start=${item.start || ''}&end=${item.end || ''}&adults=${item.passengers?.adults || 1}&cabin=${item.cabin || 'Economy'}`}
                      className="btn btn-secondary"
                      style={{ fontSize: 12, padding: '5px 12px', gap: 4 }}
                    >
                      <ExternalLink size={12} />
                      View results
                    </Link>
                    <button onClick={() => remove(item.id)} className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 10px', color: 'var(--red)' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
