// Builds lib/data/airports.json from OurAirports (public domain).
// Keeps airports with an IATA code and scheduled passenger service.
// Run: npm run data:airports
import { writeFileSync } from 'node:fs';

const SRC = 'https://davidmegginson.github.io/ourairports-data/airports.csv';

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const res = await fetch(SRC);
if (!res.ok) throw new Error(`download failed: ${res.status}`);
const [head, ...rows] = parseCsv(await res.text());
const col = Object.fromEntries(head.map((h, i) => [h, i]));

const out = [];
for (const r of rows) {
  const type = r[col.type];
  if (!['large_airport', 'medium_airport', 'small_airport'].includes(type)) continue;
  if (r[col.scheduled_service] !== 'yes') continue;
  const iata = r[col.iata_code];
  if (!/^[A-Z]{3}$/.test(iata)) continue;
  out.push({
    c: iata,
    n: r[col.name].replace(/ (International )?Airport$/, ''),
    t: r[col.municipality],
    cc: r[col.iso_country],
    la: Math.round(+r[col.latitude_deg] * 1e4) / 1e4,
    lo: Math.round(+r[col.longitude_deg] * 1e4) / 1e4,
    l: type === 'large_airport' ? 2 : type === 'medium_airport' ? 1 : 0,
  });
}
out.sort((a, b) => a.c.localeCompare(b.c));
writeFileSync(new URL('../lib/data/airports.json', import.meta.url), JSON.stringify(out));
console.log(`wrote ${out.length} airports`);
