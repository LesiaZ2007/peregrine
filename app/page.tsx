import Planner from '@/components/Planner';
import { COUNTRIES } from '@/lib/data/countries';
import { DESTINATIONS } from '@/lib/data/destinations';
import { hasSerp } from '@/lib/providers/serp';

export default function Home() {
  const catalog = DESTINATIONS.map((d) => ({ id: d.id, name: d.name, country: d.country, cc: d.cc, region: d.region }));
  const countries = Object.entries(COUNTRIES)
    .map(([cc, c]) => ({ cc, name: c.name, region: c.region }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return <Planner catalog={catalog} countries={countries} hasLive={hasSerp()} />;
}
