'use client';
import { TrendingDown, Award } from 'lucide-react';

/**
 * Sticky bar comparing cheapest price found per destination.
 * @param {Array} destinations - [{code, city, emoji}]
 * @param {object} cheapestByDest - { [destCode]: { price, origin } }
 */
export default function CompareBar({ destinations = [], cheapestByDest = {} }) {
  if (destinations.length < 2) return null;

  const withPrices = destinations.filter(d => cheapestByDest[d.code]);
  if (withPrices.length < 2) return null;

  const minPrice = Math.min(...withPrices.map(d => cheapestByDest[d.code]?.price || Infinity));

  return (
    <div style={{
      background: 'var(--navy)', color: '#fff',
      padding: '10px 20px',
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      boxShadow: '0 2px 8px rgba(0,0,0,.15)',
      borderRadius: 'var(--r)',
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.7)', flexShrink: 0 }}>
        <TrendingDown size={14} />
        Compare cheapest found:
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flex: 1 }}>
        {withPrices.map(dest => {
          const info = cheapestByDest[dest.code];
          const isBest = info.price === minPrice;
          return (
            <div
              key={dest.code}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '5px 12px',
                background: isBest ? 'rgba(16,185,129,.2)' : 'rgba(255,255,255,.08)',
                border: `1px solid ${isBest ? 'rgba(16,185,129,.4)' : 'rgba(255,255,255,.15)'}`,
                borderRadius: 'var(--r-full)',
                fontSize: 13, fontWeight: 700,
              }}
            >
              {dest.emoji && <span>{dest.emoji}</span>}
              <span>{dest.city || dest.code}</span>
              <span style={{ color: isBest ? '#6ee7b7' : 'rgba(255,255,255,.7)' }}>
                ${info.price?.toLocaleString()}
              </span>
              {info.origin && (
                <span style={{ fontSize: 10, fontWeight: 600, opacity: .6 }}>
                  from {info.origin}
                </span>
              )}
              {isBest && <Award size={12} color="#6ee7b7" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
