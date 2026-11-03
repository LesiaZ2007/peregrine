import type { Currency } from './types';

/** Approximate units per US dollar (fixed; the UI says prices are approximate). */
export const RATE: Record<Currency, number> = {
  USD: 1, EUR: 0.87, GBP: 0.76, CHF: 0.81, CZK: 21.5, PLN: 3.7, HUF: 340, SEK: 9.6, NOK: 10.2, DKK: 6.5,
  RON: 4.4, TRY: 41, JPY: 150, CAD: 1.38, AUD: 1.52, MXN: 18.5,
};
export const CURRENCIES = Object.keys(RATE) as Currency[];
export const CURRENCY_NAME: Record<Currency, string> = {
  USD: 'US dollar', EUR: 'Euro', GBP: 'Pound', CHF: 'Swiss franc', CZK: 'Czech koruna', PLN: 'Polish złoty', HUF: 'Forint',
  SEK: 'Swedish krona', NOK: 'Norwegian krone', DKK: 'Danish krone', RON: 'Romanian leu', TRY: 'Turkish lira', JPY: 'Yen',
  CAD: 'Canadian dollar', AUD: 'Australian dollar', MXN: 'Mexican peso',
};

const fmt = new Map<Currency, Intl.NumberFormat>();
function formatter(cur: Currency) {
  let f = fmt.get(cur);
  if (!f) {
    f = new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur, maximumFractionDigits: 0, minimumFractionDigits: 0 });
    fmt.set(cur, f);
  }
  return f;
}

/** Big-unit currencies round to tidy steps (e.g. 1,240 Kč rather than 1,237 Kč). */
const step = (cur: Currency) => (RATE[cur] >= 100 ? 10 : 1);

export function money(usd: number, cur: Currency): string {
  const s = step(cur);
  const v = Math.round((usd * (RATE[cur] ?? 1)) / s) * s;
  return formatter(cur in RATE ? cur : 'USD').format(v);
}
export const toUsd = (v: number, cur: Currency) => v / (RATE[cur] ?? 1);
export const fromUsd = (v: number, cur: Currency) => Math.round(v * (RATE[cur] ?? 1));
export function sign(cur: Currency): string {
  return formatter(cur in RATE ? cur : 'USD').formatToParts(0).find((p) => p.type === 'currency')?.value ?? cur;
}

export function duration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m}m`;
  return m ? `${h}h ${String(m).padStart(2, '0')}m` : `${h}h`;
}
