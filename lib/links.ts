import type { Link, Mode } from './types';

interface Ends {
  fromName: string;
  toName: string;
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  fromAir?: string;
  toAir?: string;
  depart: string;
  ret: string;
}

const enc = encodeURIComponent;
const yymmdd = (d: string) => d.slice(2).replace(/-/g, '');
const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-');

function rome2rio(e: Ends): Link {
  return { label: 'Rome2rio', url: `https://www.rome2rio.com/map/${enc(slug(e.fromName))}/${enc(slug(e.toName))}` };
}
function gmaps(e: Ends, mode: 'transit' | 'driving'): Link {
  return {
    label: mode === 'transit' ? 'Google Maps transit' : 'Google Maps route',
    url: `https://www.google.com/maps/dir/?api=1&origin=${e.fromLat},${e.fromLon}&destination=${e.toLat},${e.toLon}&travelmode=${mode}`,
  };
}

/** Booking / checking links per mode. Deep links where a site supports them, search pages otherwise. */
export function linksFor(mode: Mode, e: Ends): Link[] {
  switch (mode) {
    case 'flight': {
      const out: Link[] = [];
      if (e.fromAir && e.toAir) {
        out.push({
          label: 'Google Flights',
          url: `https://www.google.com/travel/flights?q=${enc(`Flights from ${e.fromAir} to ${e.toAir} on ${e.depart} through ${e.ret}`)}`,
        });
        out.push({
          label: 'Skyscanner',
          url: `https://www.skyscanner.net/transport/flights/${e.fromAir.toLowerCase()}/${e.toAir.toLowerCase()}/${yymmdd(e.depart)}/${yymmdd(e.ret)}/`,
        });
        out.push({
          label: 'Kiwi.com',
          url: `https://www.kiwi.com/en/search/results/${enc(e.fromAir)}/${enc(e.toAir)}/${e.depart}/${e.ret}`,
        });
      }
      return out;
    }
    case 'train':
      return [
        { label: 'Omio', url: `https://www.omio.com/search?departure=${enc(e.fromName)}&arrival=${enc(e.toName)}&date=${e.depart}` },
        { label: 'Trainline', url: 'https://www.thetrainline.com/' },
        rome2rio(e),
        gmaps(e, 'transit'),
      ];
    case 'bus':
      return [
        { label: 'FlixBus', url: 'https://www.flixbus.com/' },
        { label: 'Omio', url: `https://www.omio.com/search?departure=${enc(e.fromName)}&arrival=${enc(e.toName)}&date=${e.depart}` },
        rome2rio(e),
      ];
    case 'ferry':
      return [
        { label: 'Ferryhopper', url: 'https://www.ferryhopper.com/' },
        { label: 'Direct Ferries', url: 'https://www.directferries.com/' },
        rome2rio(e),
      ];
    case 'rideshare':
      return [
        {
          label: 'BlaBlaCar',
          url: `https://www.blablacar.com/search?fn=${enc(e.fromName)}&tn=${enc(e.toName)}&db=${e.depart}&seats=1`,
        },
        rome2rio(e),
      ];
    case 'drive':
      return [gmaps(e, 'driving'), rome2rio(e)];
  }
}

/** Places to look for a bed, ordered by how you like to stay. Dates and group size filled in. */
export function hotelLinks(place: string, country: string, checkin: string, checkout: string, guests: number, style: 'free' | 'hostel' | 'budget' | 'mid'): Link[] {
  const q = `${place}, ${country}`;
  const booking: Link = {
    label: 'Booking.com',
    url: `https://www.booking.com/searchresults.html?ss=${enc(q)}&checkin=${checkin}&checkout=${checkout}&group_adults=${guests}&no_rooms=1&order=price`,
  };
  const hostelworld: Link = {
    label: 'Hostelworld',
    url: `https://www.hostelworld.com/search?search_keywords=${enc(q)}&date_from=${checkin}&date_to=${checkout}&number_of_guests=${guests}`,
  };
  const airbnb: Link = {
    label: 'Airbnb',
    url: `https://www.airbnb.com/s/${enc(q)}/homes?checkin=${checkin}&checkout=${checkout}&adults=${guests}`,
  };
  const google: Link = {
    label: 'Google Hotels',
    url: `https://www.google.com/travel/hotels?q=${enc(`hotels in ${q}`)}&dates=${checkin},${checkout}&adults=${guests}`,
  };
  const couch: Link = { label: 'Couchsurfing', url: 'https://www.couchsurfing.com/' };
  if (style === 'hostel') return [hostelworld, booking, airbnb, google];
  if (style === 'free') return [couch, hostelworld, booking, airbnb];
  return [booking, airbnb, google, hostelworld];
}
