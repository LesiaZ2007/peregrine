// Compact text versions of trips and settings, for the chat assistant.
import { money } from './money';
import type { Currency, SearchSpec, Trip } from './types';

export function tripBrief(t: Trip, cur: Currency): string {
  const opts = t.options
    .map((o) => `${o.legs ? o.legs.map((l) => l.mode).join('+') : o.mode} ${money(o.price, cur)}${o.extraEst ? ` + ${money(o.extraEst, cur)} est. transfers` : ''}${o.source === 'live' ? ' live' : ' est.'}${o.sure ? ` (confidence ${o.sure.level}/5)` : ''} ${Math.round(o.outMin / 6) / 10}h ${o.transfers}chg${o.overnight ? ' overnight' : ''}`)
    .join('; ');
  const c = t.costs;
  return [
    `${t.dest.name} (${t.dest.country}) ${t.distanceKm}km from ${t.originLabel}`,
    `dates ${t.window.label}, ${t.window.nights} nights, ${t.hoursThere}h there`,
    `best: ${t.best.mode} ${money(t.best.price, cur)} ${t.best.source === 'live' ? 'live' : 'est.'}`,
    `options: ${opts}`,
    `stay&food est. ${money(t.stayCost, cur)} (beds ${money(c.beds, cur)}, food ${money(c.food, cur)}, local ${money(c.local, cur)}, sights ${money(c.sights, cur)})`,
    `total ${money(t.total, cur)} pp`,
    `tags: ${t.dest.tags.join(', ') || 'none'}`,
    t.flightHint ? `typical cheap flight ${money(t.flightHint.low, cur)}-${money(t.flightHint.high, cur)}${t.flightHint.cheaperLikely ? ' (listed fare looks high)' : ''}` : '',
    t.nearMiss?.length ? `JUST OUTSIDE settings: ${t.nearMiss.join('; ')}` : '',
    `score ${t.score}/100. ${t.dest.blurb}`,
  ].filter(Boolean).join(' | ');
}

export function specBrief(spec: SearchSpec): string {
  const { visited: _v, wishlist: _w, beenCountries: _b, ...rest } = spec;
  return JSON.stringify(rest);
}

export function chatContext(o: { spec: SearchSpec; results?: Trip[]; near?: Trip[]; starred?: Trip[]; compare?: Trip[]; page: string; extra?: string }): string {
  const cur = o.spec.currency;
  const block = (title: string, list: Trip[] | undefined, n: number) =>
    list?.length ? `${title}:\n${list.slice(0, n).map((t, i) => `${i + 1}. ${tripBrief(t, cur)}`).join('\n')}` : '';
  return [
    `Page: ${o.page}. Currency: ${cur}.`,
    `Settings JSON (budgets in USD): ${specBrief(o.spec)}`,
    block('Results (ranked)', o.results, 15),
    block('Just outside the settings', o.near, 8),
    block('Starred', o.starred, 20),
    block('Compare list', o.compare, 4),
    o.extra ?? '',
  ].filter(Boolean).join('\n\n');
}
