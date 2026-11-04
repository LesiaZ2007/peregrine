'use client';
// Export and import of everything Peregrine keeps in the browser.
import { shortDay } from './dates';
import { money } from './money';
import { K, write, type PlanSlot, type SavedTrip } from './store';
import type { Currency } from './types';

const KEYS = Object.values(K);

export function download(name: string, mime: string, text: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

/** Everything: settings, stars, plan, compare list, setups, wishlist, been-there. */
export function exportBackup() {
  const data: Record<string, unknown> = {};
  for (const k of KEYS) {
    try {
      const raw = localStorage.getItem(k);
      if (raw != null) data[k] = JSON.parse(raw);
    } catch {
      // skip unreadable keys
    }
  }
  download(`peregrine-backup-${stamp()}.json`, 'application/json', JSON.stringify({ app: 'peregrine', version: 1, exportedAt: new Date().toISOString(), data }, null, 2));
}

/** Restore a backup file. Returns how many sections were restored. */
export async function importBackup(file: File): Promise<number> {
  const json = JSON.parse(await file.text()) as { app?: string; data?: Record<string, unknown> };
  if (json.app !== 'peregrine' || !json.data) throw new Error('That isn’t a Peregrine backup file.');
  let n = 0;
  for (const k of KEYS) {
    if (k in json.data) {
      write(k, json.data[k]);
      n++;
    }
  }
  return n;
}

const csvCell = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows: unknown[][]) => rows.map((r) => r.map(csvCell).join(',')).join('\r\n');

export function exportStarsCsv(starred: SavedTrip[], cur: Currency) {
  const rows: unknown[][] = [['Place', 'Country', 'From', 'Dates', 'Best way', 'Travel price', 'Price type', 'Stay & food (est.)', 'All in', 'Hours there', 'Distance km', 'Tags', 'Book']];
  for (const { trip: t } of starred) {
    rows.push([
      t.dest.name, t.dest.country, t.originLabel, t.window.label, t.best.mode, money(t.best.price, cur),
      t.best.source === 'live' ? 'live' : 'estimate', money(t.stayCost, cur), money(t.total, cur), t.hoursThere, t.distanceKm,
      t.dest.tags.join(' '), t.best.links[0]?.url ?? '',
    ]);
  }
  download(`peregrine-stars-${stamp()}.csv`, 'text/csv', csv(rows));
}

export function exportPlanCsv(plan: PlanSlot[], starred: SavedTrip[], cur: Currency) {
  const byId = new Map(starred.map((s) => [s.trip.dest.id, s.trip]));
  const rows: unknown[][] = [['Weekend', 'Leave', 'Back', 'Plan', 'Way', 'Travel', 'All in', 'Price type', 'Note']];
  for (const p of plan) {
    const t = p.tripKey ? byId.get(p.tripKey) : undefined;
    rows.push([
      `${shortDay(p.depart)} → ${shortDay(p.ret)}`, p.depart, p.ret,
      p.status === 'home' ? 'Staying put' : t ? `${t.dest.name}, ${t.dest.country}` : 'Open',
      p.checked?.mode ?? t?.best.mode ?? '', p.checked ? money(p.checked.price, cur) : t ? money(t.best.price, cur) : '',
      p.checked ? money(p.checked.total, cur) : t ? money(t.total, cur) : '',
      p.checked ? p.checked.source : t ? `${t.best.source} (from search)` : '', p.note ?? '',
    ]);
  }
  download(`peregrine-plan-${stamp()}.csv`, 'text/csv', csv(rows));
}

/** Planned trips as all-day calendar events. */
export function exportPlanIcs(plan: PlanSlot[], starred: SavedTrip[], cur: Currency) {
  const byId = new Map(starred.map((s) => [s.trip.dest.id, s.trip]));
  const d = (s: string) => s.replace(/-/g, '');
  const next = (s: string) => {
    const x = new Date(`${s}T00:00:00Z`);
    x.setUTCDate(x.getUTCDate() + 1);
    return x.toISOString().slice(0, 10);
  };
  const esc = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const now = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Peregrine//Trip plan//EN', 'CALSCALE:GREGORIAN'];
  for (const p of plan) {
    const t = p.tripKey ? byId.get(p.tripKey) : undefined;
    if (p.status !== 'trip' || !t) continue;
    const price = p.checked ? money(p.checked.total, cur) : money(t.total, cur);
    lines.push(
      'BEGIN:VEVENT',
      `UID:peregrine-${p.depart}-${t.dest.id}`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${d(p.depart)}`,
      `DTEND;VALUE=DATE:${d(next(p.ret))}`,
      `SUMMARY:${esc(`${t.dest.name} (${t.best.mode})`)}`,
      `DESCRIPTION:${esc(`About ${price} all in per person. ${t.dest.blurb}${p.note ? `\n${p.note}` : ''}`)}`,
      `LOCATION:${esc(`${t.dest.name}, ${t.dest.country}`)}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  download(`peregrine-plan-${stamp()}.ics`, 'text/calendar', lines.join('\r\n'));
}
