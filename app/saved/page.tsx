import { redirect } from 'next/navigation';

// "Saved" became "Trips" (stars, season plan, export).
export default function SavedPage() {
  redirect('/trips');
}
