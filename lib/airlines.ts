// Guidance for beating a listed fare: which budget airlines fly where, and what a cheap
// fare on a given distance usually looks like. This is guidance, never a listed price.
import { linksFor } from './links';
import type { FlightHint, Option } from './types';

/** Budget and low-fare airlines with big bases in each country (ISO alpha-2). */
const BUDGET: Record<string, string[]> = {
  ES: ['Vueling', 'Iberia Express', 'Volotea', 'easyJet', 'Wizz Air', 'Binter'],
  PT: ['easyJet', 'TAP', 'Transavia'],
  FR: ['easyJet', 'Transavia', 'Volotea', 'Vueling'],
  BE: ['Brussels Airlines', 'TUI fly', 'Transavia'],
  NL: ['Transavia', 'easyJet', 'KLM'],
  GB: ['easyJet', 'Jet2', 'Wizz Air', 'Loganair'],
  IE: ['Aer Lingus'],
  DE: ['Eurowings', 'easyJet', 'Condor', 'Wizz Air'],
  AT: ['Austrian', 'Wizz Air', 'easyJet'],
  CH: ['easyJet', 'Edelweiss', 'SWISS'],
  IT: ['easyJet', 'Wizz Air', 'Volotea', 'ITA Airways', 'Aeroitalia'],
  MT: ['KM Malta Airlines', 'Wizz Air'],
  PL: ['Wizz Air', 'LOT', 'Enter Air'],
  CZ: ['Smartwings', 'Wizz Air'],
  HU: ['Wizz Air'],
  SK: ['Wizz Air'],
  RO: ['Wizz Air', 'HiSky', 'TAROM'],
  BG: ['Wizz Air'],
  GR: ['Aegean', 'Sky Express', 'Volotea', 'easyJet'],
  CY: ['Wizz Air', 'Aegean', 'easyJet'],
  HR: ['Croatia Airlines', 'easyJet', 'Wizz Air'],
  RS: ['Air Serbia', 'Wizz Air'],
  AL: ['Wizz Air'],
  MK: ['Wizz Air'],
  BA: ['Wizz Air'],
  ME: ['Wizz Air'],
  DK: ['Norwegian', 'SAS'],
  SE: ['Norwegian', 'SAS'],
  NO: ['Norwegian', 'Widerøe', 'Flyr'],
  FI: ['Finnair', 'Norwegian'],
  IS: ['PLAY', 'Icelandair'],
  EE: ['airBaltic'],
  LV: ['airBaltic'],
  LT: ['airBaltic', 'Wizz Air'],
  TR: ['Pegasus', 'AJet', 'SunExpress'],
  GE: ['Wizz Air', 'Pegasus'],
  MA: ['Air Arabia Maroc', 'Royal Air Maroc', 'easyJet', 'Transavia'],
  TN: ['Tunisair', 'Nouvelair', 'Transavia'],
  EG: ['Air Arabia', 'EgyptAir', 'Wizz Air'],
  JO: ['Royal Jordanian', 'Wizz Air'],
  AE: ['flydubai', 'Air Arabia', 'Wizz Air'],
  IL: ['Israir', 'Arkia', 'Wizz Air'],
  US: ['Spirit', 'Frontier', 'Southwest', 'JetBlue', 'Allegiant'],
  CA: ['Flair', 'Porter', 'WestJet'],
  MX: ['Volaris', 'Viva Aerobus'],
  BR: ['Gol', 'Azul'],
  AR: ['Flybondi', 'JetSMART'],
  CL: ['JetSMART', 'Sky Airline'],
  CO: ['Wingo', 'JetSMART'],
  PE: ['JetSMART', 'Sky Airline'],
  JP: ['Peach', 'Jetstar Japan', 'Zipair', 'Spring Japan'],
  KR: ["Jeju Air", "T'way", 'Jin Air'],
  TW: ['Tigerair Taiwan', 'StarLux'],
  CN: ['Spring Airlines', 'Juneyao'],
  HK: ['HK Express'],
  TH: ['AirAsia', 'Thai Lion Air', 'Nok Air'],
  VN: ['VietJet', 'Bamboo'],
  MY: ['AirAsia', 'Batik Air'],
  SG: ['Scoot', 'Jetstar Asia'],
  ID: ['AirAsia', 'Lion Air', 'Citilink'],
  PH: ['Cebu Pacific', 'AirAsia'],
  IN: ['IndiGo', 'Air India Express', 'Akasa'],
  AU: ['Jetstar', 'Virgin Australia', 'Rex'],
  NZ: ['Jetstar', 'Air New Zealand'],
  ZA: ['FlySafair', 'Lift', 'Airlink'],
  KE: ['Jambojet'],
};

/** Typical cheap round-trip fare on a distance, USD, for a fare booked a few weeks out. */
export function typicalLowFare(km: number): { low: number; high: number } {
  const oneWayLow = km < 3000 ? 14 + 0.028 * km : 40 + 0.045 * km;
  const oneWayHigh = km < 3000 ? 35 + 0.07 * km : 90 + 0.085 * km;
  return { low: Math.round(oneWayLow * 2), high: Math.round(oneWayHigh * 2) };
}

export interface HintInput {
  km: number;
  fromCc: string;
  toCc: string;
  fromAir?: string;
  toAir?: string;
  fromName: string;
  toName: string;
  fromLat: number; fromLon: number; toLat: number; toLon: number;
  depart: string;
  ret: string;
}

/** Budget airlines around both ends of a route, leaving out one already shown. */
export function budgetAirlines(fromCc: string, toCc: string, except = ''): string[] {
  return [...new Set([...(BUDGET[fromCc] ?? []), ...(BUDGET[toCc] ?? [])])]
    .filter((a) => !except || !a.toLowerCase().startsWith(except.toLowerCase()))
    .slice(0, 6);
}

/** A slightly optimistic "you could probably find this" fare, USD return. */
export function likelyCheapFare(km: number): number {
  const { low, high } = typicalLowFare(km);
  return Math.round(low + (high - low) * 0.2);
}

export function flightHint(h: HintInput, real: Option | undefined): FlightHint | null {
  if (!h.fromAir || !h.toAir || h.fromAir === h.toAir || h.km < 250) return null;
  const { low, high } = typicalLowFare(h.km);
  const realCarrier = real?.carrier?.split(' ')[0] ?? '';
  const airlines = [...new Set([...(BUDGET[h.fromCc] ?? []), ...(BUDGET[h.toCc] ?? [])])]
    .filter((a) => !realCarrier || !a.toLowerCase().startsWith(realCarrier.toLowerCase()))
    .slice(0, 6);
  return {
    low,
    high,
    airlines,
    cheaperLikely: !!real && real.price > low * 1.2,
    noRealFare: !real,
    links: linksFor('flight', { ...h }),
  };
}
