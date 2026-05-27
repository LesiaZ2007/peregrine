'use client';
import { useState, useEffect } from 'react';
import { Eye, EyeOff, Check } from 'lucide-react';
import { addToWatchlist, removeFromWatchlist, isWatched } from '@/lib/watchlist';

export default function WatchlistButton({ flight, searchParams, style }) {
  const [watched, setWatched] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const { origins = [], destinations = [], tripType = 'roundtrip', start, end } = searchParams || {};

  useEffect(() => {
    setWatched(isWatched(origins, destinations, tripType, start, end));
  }, [origins, destinations, tripType, start, end]);

  const toggle = () => {
    if (watched) {
      const id = [origins.sort().join(','), destinations.sort().join(','), tripType, start, end].join('|');
      removeFromWatchlist(id);
      setWatched(false);
    } else {
      addToWatchlist({
        origins,
        destinations,
        tripType,
        start,
        end,
        lowestPrice: flight?.price,
        cabin: searchParams?.cabin || 'Economy',
        passengers: searchParams?.passengers || { adults: 1, children: 0, infants: 0 },
      });
      setWatched(true);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    }
  };

  return (
    <button
      onClick={toggle}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '6px 12px', borderRadius: 8,
        border: `1.5px solid ${watched ? 'var(--amber)' : 'var(--border-2)'}`,
        background: watched ? 'var(--amber-bg)' : 'var(--surface)',
        color: watched ? 'var(--amber)' : 'var(--text-muted)',
        fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
        cursor: 'pointer', transition: 'all .15s',
        ...style,
      }}
      onMouseEnter={e => { if (!watched) { e.currentTarget.style.borderColor = 'var(--amber)'; e.currentTarget.style.color = 'var(--amber)'; }}}
      onMouseLeave={e => { if (!watched) { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-muted)'; }}}
      title={watched ? 'Remove from watchlist' : 'Watch this route'}
    >
      {justAdded ? <Check size={13} /> : watched ? <Eye size={13} /> : <EyeOff size={13} />}
      {justAdded ? 'Added!' : watched ? 'Watching' : 'Watch'}
    </button>
  );
}
