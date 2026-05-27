'use client';
import { ExternalLink } from 'lucide-react';

const PLATFORMS = [
  {
    id: 'google',
    name: 'Google Flights',
    color: '#4285F4',
    build: ({ origin, destination, start, end, adults }) => {
      const d1 = formatDate(start);
      const d2 = formatDate(end);
      return `https://www.google.com/travel/flights/search?tfs=CBwQAhoeEgoyMDI0LTAxLTAxagcIARIDJEJPUhIKMjAyNC0wMS0xNXIHCAESA0pGS3ABggELCP___________wFAAUAB&tfu=EgYIBBABGAA&hl=en`;
      // Real deep-link pattern (simplified for now — full build in Phase 4 API integration):
      // return `https://www.google.com/travel/flights?q=flights+from+${origin}+to+${destination}+on+${d1}${d2?`+returning+${d2}`:''}&adults=${adults}`;
    },
    buildSimple: ({ origin, destination, start, end, adults }) =>
      `https://www.google.com/travel/flights?q=Flights+from+${origin}+to+${destination}${start?`+on+${formatDate(start)}`:''}${end?`+returning+${formatDate(end)}`:''}`,
  },
  {
    id: 'expedia',
    name: 'Expedia',
    color: '#003087',
    buildSimple: ({ origin, destination, start, end, adults }) => {
      const base = 'https://www.expedia.com/Flights-Search';
      const params = new URLSearchParams({
        trip: end ? 'roundtrip' : 'oneway',
        leg1: `from:${origin},to:${destination},departure:${formatDate(start)}TANYT`,
        ...(end ? { leg2: `from:${destination},to:${origin},departure:${formatDate(end)}TANYT` } : {}),
        passengers: `children:0,adults:${adults || 1},seniors:0,infantsinlap:0`,
        mode: 'search',
      });
      return `${base}?${params}`;
    },
  },
  {
    id: 'kayak',
    name: 'Kayak',
    color: '#FF690F',
    buildSimple: ({ origin, destination, start, end, adults }) => {
      const d1 = formatDate(start);
      const d2 = formatDate(end);
      const type = end ? 'flights' : 'flights';
      return `https://www.kayak.com/${type}/${origin}-${destination}/${d1}${d2?`/${d2}`:''}/${adults}adults`;
    },
  },
  {
    id: 'booking',
    name: 'Booking.com',
    color: '#003580',
    buildSimple: ({ origin, destination, start, end, adults }) =>
      `https://www.booking.com/flights/search.html?from=${origin}&to=${destination}&depart=${formatDate(start)}${end?`&return=${formatDate(end)}`:''}&adults=${adults || 1}`,
  },
];

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch { return ''; }
}

/**
 * @param {object} props
 * @param {string}   props.origin       - airport code
 * @param {string}   props.destination  - airport code
 * @param {string}   props.start        - ISO date
 * @param {string}   [props.end]        - ISO date (round trip)
 * @param {number}   [props.adults]
 * @param {boolean}  [props.compact]    - show only icons
 */
export default function PlatformLinks({ origin, destination, start, end, adults = 1, compact = false }) {
  const params = { origin, destination, start, end, adults };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {PLATFORMS.map(platform => {
        const url = platform.buildSimple(params);
        return (
          <a
            key={platform.id}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: compact ? 0 : 5,
              padding: compact ? '5px 8px' : '5px 12px',
              borderRadius: 7,
              border: `1.5px solid ${platform.color}22`,
              background: `${platform.color}10`,
              color: platform.color,
              fontSize: 12, fontWeight: 700,
              textDecoration: 'none',
              transition: 'all .12s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = `${platform.color}20`;
              e.currentTarget.style.borderColor = `${platform.color}55`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = `${platform.color}10`;
              e.currentTarget.style.borderColor = `${platform.color}22`;
            }}
            title={`Search on ${platform.name}`}
          >
            {!compact && platform.name}
            <ExternalLink size={11} />
          </a>
        );
      })}
    </div>
  );
}
