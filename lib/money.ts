import type { Currency } from './types';

/** Rough fixed rates from USD. Shown as approximate in the UI. */
const RATE: Record<Currency, number> = { USD: 1, EUR: 0.87, GBP: 0.76 };
const SIGN: Record<Currency, string> = { USD: '$', EUR: '€', GBP: '£' };

export function money(usd: number, cur: Currency): string {
  const v = Math.round(usd * RATE[cur]);
  return `${SIGN[cur]}${v.toLocaleString('en-GB')}`;
}
export const toUsd = (v: number, cur: Currency) => v / RATE[cur];
export const fromUsd = (v: number, cur: Currency) => Math.round(v * RATE[cur]);
export const sign = (cur: Currency) => SIGN[cur];

export function duration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m}m`;
  return m ? `${h}h ${String(m).padStart(2, '0')}m` : `${h}h`;
}
