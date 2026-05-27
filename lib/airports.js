/**
 * airports.js
 * Curated destination + airport data. Plain JS — safe to import from
 * both Server Components and Client Components.
 */

export const DESTINATIONS = [
  // East Asia
  { code: 'TYO', iata: 'NRT', name: 'Narita Intl', city: 'Tokyo', country: 'Japan', emoji: '🇯🇵', region: 'East Asia' },
  { code: 'OSA', iata: 'KIX', name: 'Kansai Intl', city: 'Osaka', country: 'Japan', emoji: '🇯🇵', region: 'East Asia' },
  { code: 'ICN', iata: 'ICN', name: 'Incheon Intl', city: 'Seoul', country: 'South Korea', emoji: '🇰🇷', region: 'East Asia' },
  { code: 'PEK', iata: 'PEK', name: 'Capital Intl', city: 'Beijing', country: 'China', emoji: '🇨🇳', region: 'East Asia' },
  { code: 'PVG', iata: 'PVG', name: 'Pudong Intl', city: 'Shanghai', country: 'China', emoji: '🇨🇳', region: 'East Asia' },
  { code: 'HKG', iata: 'HKG', name: 'Chek Lap Kok', city: 'Hong Kong', country: 'HK', emoji: '🇭🇰', region: 'East Asia' },
  { code: 'TPE', iata: 'TPE', name: 'Taoyuan Intl', city: 'Taipei', country: 'Taiwan', emoji: '🇹🇼', region: 'East Asia' },
  // Southeast Asia
  { code: 'SIN', iata: 'SIN', name: 'Changi', city: 'Singapore', country: 'Singapore', emoji: '🇸🇬', region: 'SE Asia' },
  { code: 'BKK', iata: 'BKK', name: 'Suvarnabhumi', city: 'Bangkok', country: 'Thailand', emoji: '🇹🇭', region: 'SE Asia' },
  { code: 'HAN', iata: 'HAN', name: 'Noi Bai Intl', city: 'Hanoi', country: 'Vietnam', emoji: '🇻🇳', region: 'SE Asia' },
  { code: 'SGN', iata: 'SGN', name: 'Tan Son Nhat', city: 'Ho Chi Minh City', country: 'Vietnam', emoji: '🇻🇳', region: 'SE Asia' },
  { code: 'KUL', iata: 'KUL', name: 'Kuala Lumpur Intl', city: 'Kuala Lumpur', country: 'Malaysia', emoji: '🇲🇾', region: 'SE Asia' },
  { code: 'MNL', iata: 'MNL', name: 'Ninoy Aquino', city: 'Manila', country: 'Philippines', emoji: '🇵🇭', region: 'SE Asia' },
  { code: 'CGK', iata: 'CGK', name: 'Soekarno-Hatta', city: 'Jakarta', country: 'Indonesia', emoji: '🇮🇩', region: 'SE Asia' },
  { code: 'DPS', iata: 'DPS', name: 'Ngurah Rai', city: 'Bali', country: 'Indonesia', emoji: '🇮🇩', region: 'SE Asia' },
  // Europe
  { code: 'LHR', iata: 'LHR', name: 'Heathrow', city: 'London', country: 'UK', emoji: '🇬🇧', region: 'Europe' },
  { code: 'CDG', iata: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France', emoji: '🇫🇷', region: 'Europe' },
  { code: 'AMS', iata: 'AMS', name: 'Schiphol', city: 'Amsterdam', country: 'Netherlands', emoji: '🇳🇱', region: 'Europe' },
  { code: 'FCO', iata: 'FCO', name: 'Fiumicino', city: 'Rome', country: 'Italy', emoji: '🇮🇹', region: 'Europe' },
  { code: 'BCN', iata: 'BCN', name: 'El Prat', city: 'Barcelona', country: 'Spain', emoji: '🇪🇸', region: 'Europe' },
  { code: 'FRA', iata: 'FRA', name: 'Frankfurt', city: 'Frankfurt', country: 'Germany', emoji: '🇩🇪', region: 'Europe' },
  { code: 'IST', iata: 'IST', name: 'Istanbul Intl', city: 'Istanbul', country: 'Turkey', emoji: '🇹🇷', region: 'Europe' },
  { code: 'ATH', iata: 'ATH', name: 'Eleftherios Venizelos', city: 'Athens', country: 'Greece', emoji: '🇬🇷', region: 'Europe' },
  // Middle East / Africa
  { code: 'DXB', iata: 'DXB', name: 'Dubai Intl', city: 'Dubai', country: 'UAE', emoji: '🇦🇪', region: 'Middle East' },
  { code: 'DOH', iata: 'DOH', name: 'Hamad Intl', city: 'Doha', country: 'Qatar', emoji: '🇶🇦', region: 'Middle East' },
  { code: 'CAI', iata: 'CAI', name: 'Cairo Intl', city: 'Cairo', country: 'Egypt', emoji: '🇪🇬', region: 'Africa' },
  { code: 'JNB', iata: 'JNB', name: 'OR Tambo Intl', city: 'Johannesburg', country: 'South Africa', emoji: '🇿🇦', region: 'Africa' },
  // Americas
  { code: 'CUN', iata: 'CUN', name: 'Cancun Intl', city: 'Cancún', country: 'Mexico', emoji: '🇲🇽', region: 'Americas' },
  { code: 'GRU', iata: 'GRU', name: 'Guarulhos', city: 'São Paulo', country: 'Brazil', emoji: '🇧🇷', region: 'Americas' },
  // South Asia / Oceania
  { code: 'DEL', iata: 'DEL', name: 'Indira Gandhi', city: 'Delhi', country: 'India', emoji: '🇮🇳', region: 'South Asia' },
  { code: 'BOM', iata: 'BOM', name: 'Chhatrapati Shivaji', city: 'Mumbai', country: 'India', emoji: '🇮🇳', region: 'South Asia' },
  { code: 'SYD', iata: 'SYD', name: 'Kingsford Smith', city: 'Sydney', country: 'Australia', emoji: '🇦🇺', region: 'Oceania' },
];

// Similarity map: if user picks X, suggest these
export const SIMILAR_DESTINATIONS = {
  TYO: ['OSA', 'ICN', 'PVG', 'TPE', 'SIN'],
  OSA: ['TYO', 'ICN', 'TPE', 'HKG', 'SIN'],
  ICN: ['TYO', 'PEK', 'PVG', 'HKG', 'SIN'],
  PEK: ['PVG', 'ICN', 'TYO', 'HKG', 'TPE'],
  PVG: ['PEK', 'ICN', 'TYO', 'HKG', 'SIN'],
  SIN: ['BKK', 'KUL', 'HAN', 'DPS', 'ICN'],
  BKK: ['SIN', 'KUL', 'HAN', 'DPS', 'SGN'],
  LHR: ['CDG', 'AMS', 'FCO', 'BCN', 'FRA'],
  CDG: ['LHR', 'AMS', 'FCO', 'BCN', 'ATH'],
  DXB: ['DOH', 'IST', 'SIN', 'BKK', 'DEL'],
};

export function findDestination(code) {
  return DESTINATIONS.find(d => d.code === code || d.iata === code) || null;
}
