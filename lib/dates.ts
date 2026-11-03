import type { TripWindow, When } from './types';

const DAY = 86_400_000;
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Parse YYYY-MM-DD as a UTC date (no timezone drift). */
export function parseDay(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
export function fmtDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export function addDays(s: string, n: number): string {
  return fmtDay(new Date(parseDay(s).getTime() + n * DAY));
}
export function weekday(s: string): number {
  return parseDay(s).getUTCDay();
}
export function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / DAY);
}
/** "HH:MM" → hours as a number */
export function hours(hhmm: string): number {
  const [h, m] = (hhmm || '0:0').split(':').map(Number);
  return (h || 0) + (m || 0) / 60;
}
/** "Fri 13 Nov" */
export function shortDay(s: string): string {
  const d = parseDay(s);
  return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;
}
export function monthOf(s: string): number {
  return parseDay(s).getUTCMonth() + 1;
}

function makeWindow(depart: string, ret: string, when: When): TripWindow {
  const nights = daysBetween(depart, ret);
  const spanHours = Math.max(0, nights * 24 + hours(when.backBy) - hours(when.leaveAfter));
  return { depart, ret, nights, spanHours, label: `${shortDay(depart)} → ${shortDay(ret)}` };
}

const MAX_WINDOWS = 12;

/**
 * Turn the "when" settings into concrete trip windows, earliest first.
 * `today` is injectable for tests.
 */
export function tripWindows(when: When, today: string = fmtDay(new Date())): TripWindow[] {
  const black = new Set(when.blackouts);
  const clear = (a: string, b: string) => {
    for (let d = a; d <= b; d = addDays(d, 1)) if (black.has(d)) return false;
    return true;
  };
  const out: TripWindow[] = [];

  if (when.kind === 'exact') {
    if (when.depart && when.ret && when.ret >= when.depart) out.push(makeWindow(when.depart, when.ret, when));
    return out;
  }

  if (when.kind === 'weekends') {
    const departDays = when.departDays.length ? when.departDays : [5];
    const returnDays = when.returnDays.length ? when.returnDays : [0];
    const start = addDays(today, 1);
    // a "weekend" is anchored on each Saturday in range
    let sat = start;
    while (weekday(sat) !== 6) sat = addDays(sat, 1);
    for (let w = 0; w < Math.max(1, when.weekendsAhead); w++, sat = addDays(sat, 7)) {
      // choose the earliest allowed departure and latest allowed return around this Saturday
      const deps = [-3, -2, -1, 0].map((o) => addDays(sat, o)).filter((d) => departDays.includes(weekday(d)) && d >= start);
      const rets = [0, 1, 2, 3].map((o) => addDays(sat, o)).filter((d) => returnDays.includes(weekday(d)));
      if (!deps.length || !rets.length) continue;
      const dep = deps[0];
      const ret = rets[rets.length - 1];
      if (ret <= dep && !(ret === dep && hours(when.backBy) > hours(when.leaveAfter))) continue;
      if (!clear(dep, ret)) continue;
      out.push(makeWindow(dep, ret, when));
    }
    return out;
  }

  // flexible window: pick evenly spread departures for each allowed length
  const from = when.from > today ? when.from : addDays(today, 1);
  const to = when.to;
  if (!to || to < from) return out;
  const nMin = Math.max(0, when.nightsMin);
  const nMax = Math.max(nMin, when.nightsMax);
  const cands: TripWindow[] = [];
  for (let n = nMin; n <= nMax; n++) {
    for (let d = from; addDays(d, n) <= to; d = addDays(d, 1)) {
      const r = addDays(d, n);
      if (clear(d, r)) cands.push(makeWindow(d, r, when));
    }
  }
  if (cands.length <= MAX_WINDOWS) return cands;
  // sample evenly, keep order
  const step = cands.length / MAX_WINDOWS;
  for (let i = 0; i < MAX_WINDOWS; i++) out.push(cands[Math.floor(i * step)]);
  return out;
}
