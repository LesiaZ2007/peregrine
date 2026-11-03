import TripsView from '@/components/TripsView';
import { DESTINATIONS } from '@/lib/data/destinations';

export const metadata = { title: 'Trips · Peregrine' };

export default function TripsPage() {
  const names = Object.fromEntries(DESTINATIONS.map((d) => [d.id, `${d.name}, ${d.country}`]));
  return <TripsView names={names} />;
}
