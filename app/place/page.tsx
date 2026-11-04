import PlaceBrowser from '@/components/PlaceBrowser';
import '@/lib/catalog'; // attaches photos to places
import { DESTINATIONS } from '@/lib/data/destinations';

export const metadata = { title: 'Look up a place · Peregrine' };

export default function PlacesPage() {
  const places = DESTINATIONS.map((d) => ({
    id: d.id, name: d.name, country: d.country, region: d.region, tags: d.tags, thumb: d.thumb, lat: d.lat, lon: d.lon, blurb: d.blurb,
  })).sort((a, b) => a.name.localeCompare(b.name));
  return <PlaceBrowser places={places} />;
}
