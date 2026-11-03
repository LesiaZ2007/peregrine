import SavedView from '@/components/SavedView';
import { DESTINATIONS } from '@/lib/data/destinations';

export const metadata = { title: 'Saved · Peregrine' };

export default function SavedPage() {
  const names = Object.fromEntries(DESTINATIONS.map((d) => [d.id, `${d.name}, ${d.country}`]));
  return <SavedView names={names} />;
}
