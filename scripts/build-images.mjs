// Finds a photo for every catalog place from Wikipedia's lead image (free, Wikimedia Commons).
// Checks the article's coordinates against the place so "Bath" isn't a bathtub.
// Writes lib/data/images.json: { [id]: { src, page } }. Run: npm run data:images
import { readFileSync, writeFileSync } from 'node:fs';

const UA = 'Peregrine trip planner (https://github.com/LesiaZ2007/peregrine)';
const API = 'https://en.wikipedia.org/w/api.php';
const src = readFileSync(new URL('../lib/data/destinations.ts', import.meta.url), 'utf8');
const field = (line, key) => line.match(new RegExp(`${key}: '((?:\\\\'|[^'])*)'`))?.[1]?.replace(/\\'/g, "'");
const places = src.split('\n').filter((l) => l.includes("{ id: '")).map((l) => ({
  id: field(l, 'id'), name: field(l, 'name'), country: field(l, 'country'),
  lat: +l.match(/lat: (-?[\d.]+)/)[1], lon: +l.match(/lon: (-?[\d.]+)/)[1],
}));

const km = (a, b, c, d) => {
  const r = (x) => (x * Math.PI) / 180;
  const h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function lookup(titles) {
  const q = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', redirects: '1', prop: 'pageimages|coordinates',
    piprop: 'thumbnail', pithumbsize: '800', pilicense: 'any', titles: titles.join('|'),
  });
  const res = await fetch(`${API}?${q}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
  const j = await res.json();
  // map requested title -> final page (follow normalisation and redirects)
  const alias = new Map();
  for (const n of j.query?.normalized ?? []) alias.set(n.from, n.to);
  for (const r of j.query?.redirects ?? []) alias.set(r.from, r.to);
  const pages = new Map((j.query?.pages ?? []).map((p) => [p.title, p]));
  return (t) => {
    let k = t;
    for (let i = 0; i < 3 && alias.has(k); i++) k = alias.get(k);
    return pages.get(k);
  };
}

// exact article titles where the plain name is ambiguous or differs
const OVERRIDES = {
  bath: 'Bath, Somerset', keswick: 'Keswick, Cumbria', alghero: 'Alghero', klaipeda: 'Klaipėda', hvar: 'Hvar (town)',
  rhodes: 'Rhodes (city)', 'la-fortuna': 'La Fortuna, San Carlos', 'hoi-an': 'Hội An',
};

const out = {};
const clean = (n) => n.replace(/\s*\(.*\)\s*/g, '').trim();
const candidates = (p) => [...new Set([OVERRIDES[p.id] ?? clean(p.name), `${clean(p.name)}, ${p.country}`, p.name])];

for (let round = 0; round < 3; round++) {
  // rounds use different title guesses; overrides skip the coordinate check
  const todo = places.filter((p) => !out[p.id]).map((p) => ({ p, title: candidates(p)[round] })).filter((x) => x.title);
  for (let i = 0; i < todo.length; i += 40) {
    const batch = todo.slice(i, i + 40);
    const get = await lookup(batch.map((b) => b.title));
    for (const { p, title } of batch) {
      const page = get(title);
      const c = page?.coordinates?.[0];
      if (!page?.thumbnail?.source) continue;
      if (c && km(p.lat, p.lon, c.lat, c.lon) > 60 && !OVERRIDES[p.id]) continue; // wrong place
      out[p.id] = { src: page.thumbnail.source, page: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}` };
    }
    await wait(300);
  }
}

writeFileSync(new URL('../lib/data/images.json', import.meta.url), JSON.stringify(out, null, 0));
const missing = places.filter((p) => !out[p.id]).map((p) => p.id);
console.log(`images for ${Object.keys(out).length}/${places.length}; missing: ${missing.join(', ') || 'none'}`);
