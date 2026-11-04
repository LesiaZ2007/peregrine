// What being somewhere costs, split into beds, food, getting around and sights.
// Built from each place's budget "daily" figure, so every line is an estimate.
import type { Costs, Destination, FoodStyle, StayStyle } from './types';

/** share of a budget traveller's day that goes on each thing */
const SPLIT = { beds: 0.42, food: 0.33, local: 0.1, sights: 0.15 };
/** a bed costs this many times a hostel dorm bed */
export const BED_FACTOR: Record<StayStyle, number> = { free: 0, hostel: 1, budget: 2.1, mid: 3.6 };
export const FOOD_FACTOR: Record<FoodStyle, number> = { self: 0.6, cheap: 1, restaurants: 1.9 };

export const STAY_LABEL: Record<StayStyle, string> = { free: 'with friends', hostel: 'hostel bed', budget: 'budget room', mid: 'hotel' };
export const FOOD_LABEL: Record<FoodStyle, string> = { self: 'self-catering', cheap: 'cheap eats', restaurants: 'restaurants' };

export interface CostPrefs {
  stayStyle: StayStyle;
  foodStyle: FoodStyle;
  includeSights: boolean;
  travellers: number;
}

/** Per-person costs for a stay. `nights` you pay for, `days` you're there (part days count half). */
export function stayCosts(d: Destination, nights: number, hoursThere: number, p: CostPrefs): Costs {
  const days = Math.max(0.5, Math.round((hoursThere / 24) * 2) / 2);
  // rooms are shared between travellers (two to a room) except dorm beds
  const roomShare = p.stayStyle === 'budget' || p.stayStyle === 'mid' ? (p.travellers >= 2 ? 0.55 : 1) : 1;
  return {
    beds: Math.round(d.daily * SPLIT.beds * BED_FACTOR[p.stayStyle] * roomShare * nights),
    food: Math.round(d.daily * SPLIT.food * FOOD_FACTOR[p.foodStyle] * days),
    local: Math.round(d.daily * SPLIT.local * days),
    sights: p.includeSights ? Math.round(d.daily * SPLIT.sights * days) : 0,
    nights,
    days,
  };
}

export const costTotal = (c: Costs) => c.beds + c.food + c.local + c.sights;

/** One-night rates for the ledger ("about €28 a night"). */
export function rates(d: Destination, p: CostPrefs) {
  return {
    bed: Math.round(d.daily * SPLIT.beds * BED_FACTOR[p.stayStyle]),
    food: Math.round(d.daily * SPLIT.food * FOOD_FACTOR[p.foodStyle]),
    local: Math.round(d.daily * SPLIT.local),
    sights: Math.round(d.daily * SPLIT.sights),
  };
}
