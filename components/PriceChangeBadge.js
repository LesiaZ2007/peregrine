'use client';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Shows an animated badge when a price has changed since last visit.
 * @param {{ changed, pct, direction }} change - from lib/priceHistory getPriceChange()
 */
export default function PriceChangeBadge({ change, size = 'sm' }) {
  if (!change || !change.changed) return null;

  const isUp   = change.direction === 'up';
  const color  = isUp ? 'var(--red)' : 'var(--green)';
  const bg     = isUp ? 'var(--red-bg)' : 'var(--green-bg)';
  const border = isUp ? '#fca5a5' : '#a7f3d0';
  const Icon   = isUp ? TrendingUp : TrendingDown;
  const label  = `${isUp ? '+' : ''}${change.pct}%`;

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: size === 'sm' ? '3px 8px' : '5px 12px',
      borderRadius: 'var(--r-full)',
      background: bg, border: `1px solid ${border}`,
      color, fontSize: size === 'sm' ? 11 : 13, fontWeight: 700,
      animation: 'bounce-in .3s var(--ease)',
    }}>
      <Icon size={size === 'sm' ? 11 : 14} />
      {label}
      <span style={{ fontWeight: 400, fontSize: '0.9em' }}>since last visit</span>
    </div>
  );
}

/** Inline direction arrow for compact use */
export function PriceDirectionArrow({ direction, pct }) {
  if (!direction || direction === 'stable' || direction === 'unknown') {
    return <Minus size={12} color="var(--text-muted)" />;
  }
  const isUp = direction === 'up' || direction === 'rising';
  return (
    <span style={{ color: isUp ? 'var(--red)' : 'var(--green)', fontWeight: 700, fontSize: 12 }}>
      {isUp ? '↑' : '↓'}
      {pct ? ` ${Math.abs(pct)}%` : ''}
    </span>
  );
}
