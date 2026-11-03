import TripsView from '@/components/TripsView';
import { COUNTRIES } from '@/lib/data/countries';
import { DESTINATIONS } from '@/lib/data/destinations';

export const metadata = { title: 'Trips · Peregrine' };

export default function TripsPage() {
  const names = Object.fromEntries(DESTINATIONS.map((d) => [d.id, `${d.name}, ${d.country}`]));
  const ccOf = Object.fromEntries(DESTINATIONS.map((d) => [d.id, d.cc]));
  const countries = Object.entries(COUNTRIES).map(([cc, c]) => ({ cc, name: c.name })).sort((a, b) => a.name.localeCompare(b.name));
  return <TripsView names={names} ccOf={ccOf} countries={countries} />;
}
