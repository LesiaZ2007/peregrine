// How much to trust a price: 1 (rough guess) to 5 (real fare for your dates).
import { COUNTRIES } from './data/countries';
import type { Mode, Option } from './types';

export interface Sureness {
  level: 1 | 2 | 3 | 4 | 5;
  why: string;
}

const clamp = (n: number) => Math.max(1, Math.min(5, Math.round(n))) as Sureness['level'];

function modeGuess(mode: Mode, km: number, cc: string[]): Sureness {
  const rail = Math.min(...cc.map((c) => COUNTRIES[c]?.railScore ?? 1));
  const bus = Math.min(...cc.map((c) => COUNTRIES[c]?.busScore ?? 1));
  switch (mode) {
    case 'flight':
      return { level: 2, why: 'estimated from typical budget fares for the distance; real fares swing a lot by date and airline' };
    case 'train':
      return rail >= 2 && km < 800
        ? { level: 3, why: 'estimated from fares per km on a well-priced network; advance and youth fares can be cheaper' }
        : { level: 2, why: 'estimated; long or sparse rail routes vary a lot in price' };
    case 'bus':
      return bus >= 2 ? { level: 3, why: 'estimated from typical coach fares on a busy network' } : { level: 2, why: 'estimated; few coach operators here' };
    case 'ferry':
      return { level: 2, why: 'estimated from crossing length; ferry prices vary by season and operator' };
    case 'rideshare':
      return { level: 2, why: 'estimated; drivers set their own prices and rides may not run' };
    case 'drive':
      return { level: 4, why: 'fuel and tolls are fairly predictable' };
  }
}

/** Confidence in an option's total price. Multi-leg journeys are as sure as their least sure leg. */
export function sureness(o: Option, km: number, cc: string[]): Sureness {
  if (o.source === 'live' && !o.extraEst) return { level: 5, why: 'real fare for your dates' };
  if (o.alsoLive) return { level: 3, why: 'likely price on other airlines; the live fare beside it is the most you should pay' };
  if (o.legs?.length) {
    const parts = o.legs.map((l) =>
      l.source === 'live' ? { level: 5 as const, why: 'real fare' } : modeGuess(l.mode, km, cc),
    );
    const worst = parts.reduce((a, b) => (b.level < a.level ? b : a));
    const anyLive = o.legs.some((l) => l.source === 'live');
    return {
      level: clamp(anyLive ? Math.max(worst.level, 3) : worst.level),
      why: anyLive ? `real fare for the main leg; ${worst.why}` : worst.why,
    };
  }
  if (o.source === 'live') return { level: 4, why: 'real fare, plus estimated transfers' };
  return modeGuess(o.mode, km, cc);
}
