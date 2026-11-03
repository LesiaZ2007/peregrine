// Coach and budget-rail companies by country, so estimates can point past FlixBus.
// Homepages only (their search pages change too often to deep-link reliably).
import type { Link } from './types';

const OP = {
  regiojet: { label: 'RegioJet', url: 'https://regiojet.com/' },
  leo: { label: 'Leo Express', url: 'https://www.leoexpress.com/' },
  alsa: { label: 'ALSA', url: 'https://www.alsa.com/' },
  avanza: { label: 'Avanza', url: 'https://www.avanzabus.com/' },
  rede: { label: 'Rede Expressos', url: 'https://rede-expressos.pt/' },
  blablabus: { label: 'BlaBlaCar Bus', url: 'https://www.blablacar.fr/bus' },
  itabus: { label: 'Itabus', url: 'https://www.itabus.it/' },
  marino: { label: 'MarinoBus', url: 'https://www.marinobus.it/' },
  natex: { label: 'National Express', url: 'https://www.nationalexpress.com/' },
  megabus: { label: 'Megabus', url: 'https://uk.megabus.com/' },
  citylink: { label: 'Scottish Citylink', url: 'https://www.citylink.co.uk/' },
  buseireann: { label: 'Bus Éireann', url: 'https://www.buseireann.ie/' },
  volan: { label: 'Volánbusz', url: 'https://www.volanbusz.hu/' },
  lux: { label: 'Lux Express', url: 'https://luxexpress.eu/' },
  ecolines: { label: 'Ecolines', url: 'https://ecolines.net/' },
  getbybus: { label: 'GetByBus', url: 'https://getbybus.com/' },
  arriva: { label: 'Arriva', url: 'https://www.arriva.com/' },
  vybuss: { label: 'Vy Buss', url: 'https://www.vy.no/' },
  kamilkoc: { label: 'Kamil Koç', url: 'https://www.kamilkoc.com.tr/' },
  pamukkale: { label: 'Pamukkale', url: 'https://www.pamukkale.com.tr/' },
  obilet: { label: 'Obilet', url: 'https://www.obilet.com/' },
  atlassib: { label: 'Atlassib', url: 'https://www.atlassib.ro/' },
  busbud: { label: 'Busbud', url: 'https://www.busbud.com/' },
  ado: { label: 'ADO', url: 'https://www.ado.com.mx/' },
  megabusUs: { label: 'Megabus US', url: 'https://us.megabus.com/' },
  greyhound: { label: 'Greyhound', url: 'https://www.greyhound.com/' },
  ouigo: { label: 'Ouigo', url: 'https://www.ouigo.com/' },
  iryo: { label: 'Iryo', url: 'https://iryo.eu/' },
  italo: { label: 'Italo', url: 'https://www.italotreno.com/' },
  westbahn: { label: 'Westbahn', url: 'https://westbahn.at/' },
  eurostar: { label: 'Eurostar', url: 'https://www.eurostar.com/' },
} satisfies Record<string, Link>;

const COACH: Record<string, Link[]> = {
  CZ: [OP.regiojet, OP.leo], SK: [OP.regiojet, OP.leo], AT: [OP.regiojet], HU: [OP.regiojet, OP.volan], PL: [OP.regiojet, OP.leo],
  DE: [OP.regiojet], ES: [OP.alsa, OP.avanza], PT: [OP.rede, OP.alsa], FR: [OP.blablabus], BE: [OP.blablabus], NL: [OP.blablabus],
  IT: [OP.itabus, OP.marino], GB: [OP.natex, OP.megabus, OP.citylink], IE: [OP.buseireann], EE: [OP.lux, OP.ecolines],
  LV: [OP.lux, OP.ecolines], LT: [OP.lux, OP.ecolines], HR: [OP.getbybus, OP.arriva], SI: [OP.getbybus], BA: [OP.getbybus],
  RS: [OP.getbybus], ME: [OP.getbybus], MK: [OP.getbybus], AL: [OP.getbybus], NO: [OP.vybuss], RO: [OP.atlassib],
  BG: [OP.getbybus], TR: [OP.obilet, OP.kamilkoc, OP.pamukkale], MX: [OP.ado, OP.busbud], US: [OP.megabusUs, OP.greyhound, OP.busbud],
  CA: [OP.busbud],
};
const RAIL: Record<string, Link[]> = {
  CZ: [OP.regiojet, OP.leo], SK: [OP.regiojet], AT: [OP.westbahn, OP.regiojet], FR: [OP.ouigo, OP.eurostar], ES: [OP.ouigo, OP.iryo],
  IT: [OP.italo], GB: [OP.eurostar], BE: [OP.eurostar], NL: [OP.eurostar],
};

const pick = (table: Record<string, Link[]>, ccs: string[]) => {
  const seen = new Set<string>();
  return ccs.flatMap((c) => table[c] ?? []).filter((l) => (seen.has(l.label) ? false : (seen.add(l.label), true)));
};

/** Coach companies worth checking between two countries (beyond FlixBus). */
export const coachOperators = (ccs: string[]) => pick(COACH, ccs);
/** Budget or private rail operators worth checking. */
export const railOperators = (ccs: string[]) => pick(RAIL, ccs);
