export interface CountryInfo {
  name: string;
  region: import('../types').Region;
  /** Typical budget-traveller USD per day (fallback when a place is not in the catalog). */
  daily: number;
  /** ISO 4217 */
  currency: string;
  /** 3 = dense fast/frequent intercity rail, 0 = effectively none for travellers */
  railScore: 0 | 1 | 2 | 3;
  /** 3 = dense/excellent intercity coach network, 0 = none */
  busScore: 0 | 1 | 2 | 3;
}

export const COUNTRIES: Record<string, CountryInfo> = {
  // Iberia
  ES: { name: 'Spain', region: 'iberia', daily: 75, currency: 'EUR', railScore: 3, busScore: 3 },
  PT: { name: 'Portugal', region: 'iberia', daily: 65, currency: 'EUR', railScore: 2, busScore: 3 },
  AD: { name: 'Andorra', region: 'iberia', daily: 90, currency: 'EUR', railScore: 0, busScore: 2 },

  // France and Benelux
  FR: { name: 'France', region: 'france-benelux', daily: 90, currency: 'EUR', railScore: 3, busScore: 3 },
  BE: { name: 'Belgium', region: 'france-benelux', daily: 90, currency: 'EUR', railScore: 3, busScore: 3 },
  NL: { name: 'Netherlands', region: 'france-benelux', daily: 100, currency: 'EUR', railScore: 3, busScore: 3 },
  LU: { name: 'Luxembourg', region: 'france-benelux', daily: 90, currency: 'EUR', railScore: 2, busScore: 2 },
  MC: { name: 'Monaco', region: 'france-benelux', daily: 120, currency: 'EUR', railScore: 2, busScore: 1 },

  // British Isles
  GB: { name: 'United Kingdom', region: 'british-isles', daily: 105, currency: 'GBP', railScore: 3, busScore: 3 },
  IE: { name: 'Ireland', region: 'british-isles', daily: 95, currency: 'EUR', railScore: 2, busScore: 3 },

  // DACH
  DE: { name: 'Germany', region: 'dach', daily: 85, currency: 'EUR', railScore: 3, busScore: 3 },
  CH: { name: 'Switzerland', region: 'dach', daily: 130, currency: 'CHF', railScore: 3, busScore: 2 },
  AT: { name: 'Austria', region: 'dach', daily: 85, currency: 'EUR', railScore: 3, busScore: 3 },
  LI: { name: 'Liechtenstein', region: 'dach', daily: 120, currency: 'CHF', railScore: 1, busScore: 2 },

  // Italy and Malta
  IT: { name: 'Italy', region: 'italy-malta', daily: 85, currency: 'EUR', railScore: 3, busScore: 3 },
  MT: { name: 'Malta', region: 'italy-malta', daily: 75, currency: 'EUR', railScore: 0, busScore: 2 },
  SM: { name: 'San Marino', region: 'italy-malta', daily: 80, currency: 'EUR', railScore: 0, busScore: 1 },

  // Central Europe
  CZ: { name: 'Czechia', region: 'central-europe', daily: 60, currency: 'CZK', railScore: 2, busScore: 3 },
  PL: { name: 'Poland', region: 'central-europe', daily: 55, currency: 'PLN', railScore: 2, busScore: 3 },
  HU: { name: 'Hungary', region: 'central-europe', daily: 55, currency: 'HUF', railScore: 2, busScore: 3 },
  SK: { name: 'Slovakia', region: 'central-europe', daily: 55, currency: 'EUR', railScore: 2, busScore: 3 },
  SI: { name: 'Slovenia', region: 'central-europe', daily: 70, currency: 'EUR', railScore: 2, busScore: 2 },

  // Nordics
  SE: { name: 'Sweden', region: 'nordics', daily: 100, currency: 'SEK', railScore: 2, busScore: 2 },
  DK: { name: 'Denmark', region: 'nordics', daily: 110, currency: 'DKK', railScore: 2, busScore: 2 },
  NO: { name: 'Norway', region: 'nordics', daily: 125, currency: 'NOK', railScore: 2, busScore: 2 },
  FI: { name: 'Finland', region: 'nordics', daily: 100, currency: 'EUR', railScore: 2, busScore: 2 },
  IS: { name: 'Iceland', region: 'nordics', daily: 140, currency: 'ISK', railScore: 0, busScore: 1 },
  FO: { name: 'Faroe Islands', region: 'nordics', daily: 130, currency: 'DKK', railScore: 0, busScore: 1 },

  // Baltics
  EE: { name: 'Estonia', region: 'baltics', daily: 60, currency: 'EUR', railScore: 1, busScore: 3 },
  LV: { name: 'Latvia', region: 'baltics', daily: 55, currency: 'EUR', railScore: 1, busScore: 3 },
  LT: { name: 'Lithuania', region: 'baltics', daily: 50, currency: 'EUR', railScore: 1, busScore: 3 },

  // Balkans (including Romania and Bulgaria)
  HR: { name: 'Croatia', region: 'balkans', daily: 70, currency: 'EUR', railScore: 1, busScore: 3 },
  BA: { name: 'Bosnia and Herzegovina', region: 'balkans', daily: 40, currency: 'BAM', railScore: 1, busScore: 2 },
  RS: { name: 'Serbia', region: 'balkans', daily: 45, currency: 'RSD', railScore: 1, busScore: 3 },
  ME: { name: 'Montenegro', region: 'balkans', daily: 50, currency: 'EUR', railScore: 1, busScore: 2 },
  AL: { name: 'Albania', region: 'balkans', daily: 40, currency: 'ALL', railScore: 0, busScore: 2 },
  MK: { name: 'North Macedonia', region: 'balkans', daily: 35, currency: 'MKD', railScore: 1, busScore: 2 },
  XK: { name: 'Kosovo', region: 'balkans', daily: 35, currency: 'EUR', railScore: 0, busScore: 2 },
  BG: { name: 'Bulgaria', region: 'balkans', daily: 40, currency: 'EUR', railScore: 1, busScore: 3 },
  RO: { name: 'Romania', region: 'balkans', daily: 45, currency: 'RON', railScore: 1, busScore: 3 },

  // Greece and Cyprus
  GR: { name: 'Greece', region: 'greece-cyprus', daily: 75, currency: 'EUR', railScore: 1, busScore: 2 },
  CY: { name: 'Cyprus', region: 'greece-cyprus', daily: 65, currency: 'EUR', railScore: 0, busScore: 2 },

  // Eastern Europe
  MD: { name: 'Moldova', region: 'eastern-europe', daily: 35, currency: 'MDL', railScore: 1, busScore: 2 },

  // Turkey, Caucasus (Central Asian countries grouped here as the nearest listed region)
  TR: { name: 'Türkiye', region: 'turkey-caucasus', daily: 50, currency: 'TRY', railScore: 1, busScore: 3 },
  GE: { name: 'Georgia', region: 'turkey-caucasus', daily: 40, currency: 'GEL', railScore: 1, busScore: 2 },
  AM: { name: 'Armenia', region: 'turkey-caucasus', daily: 40, currency: 'AMD', railScore: 1, busScore: 2 },
  AZ: { name: 'Azerbaijan', region: 'turkey-caucasus', daily: 50, currency: 'AZN', railScore: 1, busScore: 2 },
  UZ: { name: 'Uzbekistan', region: 'turkey-caucasus', daily: 40, currency: 'UZS', railScore: 2, busScore: 2 },
  KZ: { name: 'Kazakhstan', region: 'turkey-caucasus', daily: 50, currency: 'KZT', railScore: 2, busScore: 2 },
  KG: { name: 'Kyrgyzstan', region: 'turkey-caucasus', daily: 30, currency: 'KGS', railScore: 0, busScore: 2 },

  // North Africa
  MA: { name: 'Morocco', region: 'north-africa', daily: 40, currency: 'MAD', railScore: 1, busScore: 2 },
  TN: { name: 'Tunisia', region: 'north-africa', daily: 30, currency: 'TND', railScore: 1, busScore: 2 },
  EG: { name: 'Egypt', region: 'north-africa', daily: 40, currency: 'EGP', railScore: 1, busScore: 2 },
  DZ: { name: 'Algeria', region: 'north-africa', daily: 40, currency: 'DZD', railScore: 1, busScore: 2 },

  // Middle East
  JO: { name: 'Jordan', region: 'middle-east', daily: 60, currency: 'JOD', railScore: 0, busScore: 2 },
  IL: { name: 'Israel', region: 'middle-east', daily: 110, currency: 'ILS', railScore: 2, busScore: 2 },
  AE: { name: 'United Arab Emirates', region: 'middle-east', daily: 100, currency: 'AED', railScore: 0, busScore: 2 },
  OM: { name: 'Oman', region: 'middle-east', daily: 75, currency: 'OMR', railScore: 0, busScore: 1 },
  QA: { name: 'Qatar', region: 'middle-east', daily: 100, currency: 'QAR', railScore: 0, busScore: 1 },
  SA: { name: 'Saudi Arabia', region: 'middle-east', daily: 80, currency: 'SAR', railScore: 1, busScore: 1 },
  LB: { name: 'Lebanon', region: 'middle-east', daily: 60, currency: 'USD', railScore: 0, busScore: 1 },
  BH: { name: 'Bahrain', region: 'middle-east', daily: 80, currency: 'BHD', railScore: 0, busScore: 1 },

  // Sub-Saharan Africa
  ZA: { name: 'South Africa', region: 'sub-saharan-africa', daily: 55, currency: 'ZAR', railScore: 1, busScore: 2 },
  KE: { name: 'Kenya', region: 'sub-saharan-africa', daily: 60, currency: 'KES', railScore: 1, busScore: 2 },
  TZ: { name: 'Tanzania', region: 'sub-saharan-africa', daily: 55, currency: 'TZS', railScore: 0, busScore: 2 },
  UG: { name: 'Uganda', region: 'sub-saharan-africa', daily: 45, currency: 'UGX', railScore: 0, busScore: 2 },
  RW: { name: 'Rwanda', region: 'sub-saharan-africa', daily: 55, currency: 'RWF', railScore: 0, busScore: 2 },
  ET: { name: 'Ethiopia', region: 'sub-saharan-africa', daily: 40, currency: 'ETB', railScore: 0, busScore: 1 },
  GH: { name: 'Ghana', region: 'sub-saharan-africa', daily: 45, currency: 'GHS', railScore: 0, busScore: 2 },
  SN: { name: 'Senegal', region: 'sub-saharan-africa', daily: 45, currency: 'XOF', railScore: 0, busScore: 2 },
  NA: { name: 'Namibia', region: 'sub-saharan-africa', daily: 60, currency: 'NAD', railScore: 0, busScore: 1 },
  BW: { name: 'Botswana', region: 'sub-saharan-africa', daily: 70, currency: 'BWP', railScore: 0, busScore: 1 },
  ZW: { name: 'Zimbabwe', region: 'sub-saharan-africa', daily: 70, currency: 'USD', railScore: 0, busScore: 1 },
  ZM: { name: 'Zambia', region: 'sub-saharan-africa', daily: 60, currency: 'ZMW', railScore: 0, busScore: 1 },
  MZ: { name: 'Mozambique', region: 'sub-saharan-africa', daily: 50, currency: 'MZN', railScore: 0, busScore: 1 },
  MU: { name: 'Mauritius', region: 'sub-saharan-africa', daily: 80, currency: 'MUR', railScore: 0, busScore: 2 },
  SC: { name: 'Seychelles', region: 'sub-saharan-africa', daily: 150, currency: 'SCR', railScore: 0, busScore: 1 },
  MG: { name: 'Madagascar', region: 'sub-saharan-africa', daily: 40, currency: 'MGA', railScore: 0, busScore: 1 },
  CV: { name: 'Cape Verde', region: 'sub-saharan-africa', daily: 60, currency: 'CVE', railScore: 0, busScore: 1 },

  // North America
  US: { name: 'United States', region: 'north-america', daily: 130, currency: 'USD', railScore: 1, busScore: 2 },
  CA: { name: 'Canada', region: 'north-america', daily: 105, currency: 'CAD', railScore: 1, busScore: 2 },
  MX: { name: 'Mexico', region: 'north-america', daily: 50, currency: 'MXN', railScore: 0, busScore: 3 },

  // Caribbean and Central America
  CU: { name: 'Cuba', region: 'caribbean-central-america', daily: 55, currency: 'CUP', railScore: 0, busScore: 1 },
  DO: { name: 'Dominican Republic', region: 'caribbean-central-america', daily: 65, currency: 'DOP', railScore: 0, busScore: 2 },
  JM: { name: 'Jamaica', region: 'caribbean-central-america', daily: 75, currency: 'JMD', railScore: 0, busScore: 1 },
  PR: { name: 'Puerto Rico', region: 'caribbean-central-america', daily: 100, currency: 'USD', railScore: 0, busScore: 1 },
  BS: { name: 'Bahamas', region: 'caribbean-central-america', daily: 120, currency: 'BSD', railScore: 0, busScore: 0 },
  BB: { name: 'Barbados', region: 'caribbean-central-america', daily: 100, currency: 'BBD', railScore: 0, busScore: 1 },
  CR: { name: 'Costa Rica', region: 'caribbean-central-america', daily: 65, currency: 'CRC', railScore: 0, busScore: 2 },
  PA: { name: 'Panama', region: 'caribbean-central-america', daily: 60, currency: 'USD', railScore: 0, busScore: 2 },
  GT: { name: 'Guatemala', region: 'caribbean-central-america', daily: 40, currency: 'GTQ', railScore: 0, busScore: 2 },
  BZ: { name: 'Belize', region: 'caribbean-central-america', daily: 60, currency: 'BZD', railScore: 0, busScore: 1 },
  SV: { name: 'El Salvador', region: 'caribbean-central-america', daily: 45, currency: 'USD', railScore: 0, busScore: 2 },
  HN: { name: 'Honduras', region: 'caribbean-central-america', daily: 40, currency: 'HNL', railScore: 0, busScore: 2 },
  NI: { name: 'Nicaragua', region: 'caribbean-central-america', daily: 35, currency: 'NIO', railScore: 0, busScore: 2 },

  // South America
  AR: { name: 'Argentina', region: 'south-america', daily: 55, currency: 'ARS', railScore: 0, busScore: 3 },
  BR: { name: 'Brazil', region: 'south-america', daily: 55, currency: 'BRL', railScore: 0, busScore: 3 },
  CL: { name: 'Chile', region: 'south-america', daily: 60, currency: 'CLP', railScore: 0, busScore: 3 },
  PE: { name: 'Peru', region: 'south-america', daily: 45, currency: 'PEN', railScore: 0, busScore: 3 },
  CO: { name: 'Colombia', region: 'south-america', daily: 45, currency: 'COP', railScore: 0, busScore: 3 },
  EC: { name: 'Ecuador', region: 'south-america', daily: 40, currency: 'USD', railScore: 0, busScore: 3 },
  BO: { name: 'Bolivia', region: 'south-america', daily: 35, currency: 'BOB', railScore: 0, busScore: 2 },
  UY: { name: 'Uruguay', region: 'south-america', daily: 65, currency: 'UYU', railScore: 0, busScore: 3 },
  PY: { name: 'Paraguay', region: 'south-america', daily: 40, currency: 'PYG', railScore: 0, busScore: 2 },

  // East Asia
  JP: { name: 'Japan', region: 'east-asia', daily: 85, currency: 'JPY', railScore: 3, busScore: 2 },
  KR: { name: 'South Korea', region: 'east-asia', daily: 70, currency: 'KRW', railScore: 3, busScore: 3 },
  TW: { name: 'Taiwan', region: 'east-asia', daily: 55, currency: 'TWD', railScore: 3, busScore: 2 },
  CN: { name: 'China', region: 'east-asia', daily: 55, currency: 'CNY', railScore: 3, busScore: 3 },
  HK: { name: 'Hong Kong', region: 'east-asia', daily: 90, currency: 'HKD', railScore: 2, busScore: 2 },
  MO: { name: 'Macau', region: 'east-asia', daily: 80, currency: 'MOP', railScore: 0, busScore: 2 },
  MN: { name: 'Mongolia', region: 'east-asia', daily: 40, currency: 'MNT', railScore: 1, busScore: 1 },

  // Southeast Asia
  TH: { name: 'Thailand', region: 'southeast-asia', daily: 40, currency: 'THB', railScore: 1, busScore: 3 },
  VN: { name: 'Vietnam', region: 'southeast-asia', daily: 35, currency: 'VND', railScore: 2, busScore: 3 },
  KH: { name: 'Cambodia', region: 'southeast-asia', daily: 35, currency: 'USD', railScore: 0, busScore: 2 },
  LA: { name: 'Laos', region: 'southeast-asia', daily: 35, currency: 'LAK', railScore: 1, busScore: 2 },
  MY: { name: 'Malaysia', region: 'southeast-asia', daily: 40, currency: 'MYR', railScore: 2, busScore: 3 },
  SG: { name: 'Singapore', region: 'southeast-asia', daily: 85, currency: 'SGD', railScore: 0, busScore: 2 },
  ID: { name: 'Indonesia', region: 'southeast-asia', daily: 40, currency: 'IDR', railScore: 1, busScore: 2 },
  PH: { name: 'Philippines', region: 'southeast-asia', daily: 40, currency: 'PHP', railScore: 0, busScore: 2 },
  MM: { name: 'Myanmar', region: 'southeast-asia', daily: 40, currency: 'MMK', railScore: 1, busScore: 2 },
  BN: { name: 'Brunei', region: 'southeast-asia', daily: 70, currency: 'BND', railScore: 0, busScore: 1 },

  // South Asia
  IN: { name: 'India', region: 'south-asia', daily: 35, currency: 'INR', railScore: 2, busScore: 2 },
  NP: { name: 'Nepal', region: 'south-asia', daily: 30, currency: 'NPR', railScore: 0, busScore: 2 },
  LK: { name: 'Sri Lanka', region: 'south-asia', daily: 35, currency: 'LKR', railScore: 1, busScore: 2 },
  BD: { name: 'Bangladesh', region: 'south-asia', daily: 30, currency: 'BDT', railScore: 1, busScore: 2 },
  PK: { name: 'Pakistan', region: 'south-asia', daily: 30, currency: 'PKR', railScore: 1, busScore: 2 },
  MV: { name: 'Maldives', region: 'south-asia', daily: 120, currency: 'MVR', railScore: 0, busScore: 0 },
  BT: { name: 'Bhutan', region: 'south-asia', daily: 80, currency: 'BTN', railScore: 0, busScore: 1 },

  // Oceania
  AU: { name: 'Australia', region: 'oceania', daily: 110, currency: 'AUD', railScore: 1, busScore: 2 },
  NZ: { name: 'New Zealand', region: 'oceania', daily: 95, currency: 'NZD', railScore: 0, busScore: 2 },
  FJ: { name: 'Fiji', region: 'oceania', daily: 80, currency: 'FJD', railScore: 0, busScore: 1 },
  PF: { name: 'French Polynesia', region: 'oceania', daily: 150, currency: 'XPF', railScore: 0, busScore: 0 },
};
