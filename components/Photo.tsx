import { fmtCoord } from '@/lib/geo';
import type { Destination } from '@/lib/types';

/** Wikimedia only serves thumbnails at standard widths; snap up to one (max 960, which every source has). */
const STEPS = [120, 250, 330, 500, 960];
export function sized(src: string, w: number): string {
  const step = STEPS.find((s) => s >= w) ?? 960;
  return src.replace(/\/(\d+)px-/, `/${step}px-`);
}

/** A place's photo, or a chart-style placeholder when there isn't one. */
export default function Photo({ dest, w, className, credit = false }: { dest: Destination; w: number; className?: string; credit?: boolean }) {
  if (!dest.thumb) {
    return (
      <div className={`photo photo-none ${className ?? ''}`} aria-hidden="true">
        <svg viewBox="0 0 32 32"><path d="M16 4 26.4 10v12L16 28 5.6 22V10Z" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="16" cy="16" r="2.4" fill="currentColor" /></svg>
        <span>{fmtCoord(dest.lat, dest.lon)}</span>
      </div>
    );
  }
  return (
    <figure className={`photo ${className ?? ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={sized(dest.thumb, w)} alt={`${dest.name}, ${dest.country}`} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
      {credit && dest.imagePage && (
        <figcaption>
          Photo: <a href={dest.imagePage} target="_blank" rel="noreferrer">Wikipedia / Wikimedia Commons</a>
        </figcaption>
      )}
    </figure>
  );
}
