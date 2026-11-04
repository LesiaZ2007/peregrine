import { describe, expect, it } from 'vitest';
import { airport } from '@/lib/catalog';
import { COUNTRIES } from '@/lib/data/countries';
import { DESTINATIONS } from '@/lib/data/destinations';
import { haversine } from '@/lib/geo';

describe('destination catalog', () => {
  it('has unique ids', () => {
    const seen = new Set<string>();
    const dupes = DESTINATIONS.filter((d) => (seen.has(d.id) ? true : (seen.add(d.id), false))).map((d) => d.id);
    expect(dupes).toEqual([]);
  });

  it('has sane coordinates, costs and months', () => {
    for (const d of DESTINATIONS) {
      expect(Math.abs(d.lat), d.id).toBeLessThanOrEqual(90);
      expect(Math.abs(d.lon), d.id).toBeLessThanOrEqual(180);
      expect(d.daily, d.id).toBeGreaterThan(10);
      expect(d.daily, d.id).toBeLessThan(400);
      expect(d.months.every((m) => m >= 1 && m <= 12), d.id).toBe(true);
      expect(d.tags.length, d.id).toBeGreaterThan(0);
    }
  });

  it('knows every country code it uses', () => {
    const missing = [...new Set(DESTINATIONS.map((d) => d.cc))].filter((cc) => !COUNTRIES[cc]);
    expect(missing).toEqual([]);
  });

  it("lists real airports that are actually near each place", () => {
    const bad: string[] = [];
    for (const d of DESTINATIONS) {
      for (const code of d.airports) {
        const a = airport(code);
        if (!a) { bad.push(`${d.id}: ${code} unknown`); continue; }
        const km = haversine(d.lat, d.lon, a.lat, a.lon);
        if (km > 260) bad.push(`${d.id}: ${code} is ${Math.round(km)} km away`);
      }
    }
    expect(bad).toEqual([]);
  });
});
