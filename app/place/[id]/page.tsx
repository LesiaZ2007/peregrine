import { notFound } from 'next/navigation';
import PlaceView from '@/components/PlaceView';
import { DEST_BY_ID } from '@/lib/catalog';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const d = DEST_BY_ID.get((await params).id);
  return { title: d ? `${d.name} · Peregrine` : 'Place · Peregrine' };
}

export default async function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const dest = DEST_BY_ID.get((await params).id);
  if (!dest) notFound();
  return <PlaceView dest={dest} />;
}
