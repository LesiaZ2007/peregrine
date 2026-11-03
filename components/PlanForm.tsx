'use client';
import { useMemo, useState } from 'react';
import { shortDay } from '@/lib/dates';
import { fromUsd, sign, toUsd } from '@/lib/money';
import type { Currency, FoodStyle, Mode, Region, SearchSpec, SortKey, StayStyle, Tag, When } from '@/lib/types';
import { MODES } from '@/lib/types';
import HomeBasePicker from './HomeBasePicker';
import { MODE_HINT, MODE_LABEL, RouteSample } from './icons';

export interface CatalogEntry { id: string; name: string; country: string; cc: string; region: Region }
export interface CountryEntry { cc: string; name: string; region: Region }

export const REGION_LABEL: Record<Region, string> = {
  'iberia': 'Spain & Portugal', 'france-benelux': 'France & Benelux', 'british-isles': 'Britain & Ireland',
  'dach': 'Germany, Austria, Switzerland', 'italy-malta': 'Italy & Malta', 'central-europe': 'Central Europe',
  'nordics': 'Nordics', 'baltics': 'Baltics', 'balkans': 'Balkans', 'greece-cyprus': 'Greece & Cyprus',
  'turkey-caucasus': 'Turkey & Caucasus', 'eastern-europe': 'Eastern Europe', 'north-africa': 'North Africa',
  'middle-east': 'Middle East', 'sub-saharan-africa': 'Sub-Saharan Africa', 'north-america': 'North America',
  'caribbean-central-america': 'Caribbean & Central America', 'south-america': 'South America',
  'east-asia': 'East Asia', 'southeast-asia': 'Southeast Asia', 'south-asia': 'South Asia', 'oceania': 'Oceania',
};
export const TAGS: Tag[] = [
  'old-town', 'food', 'nightlife', 'museums', 'art', 'architecture', 'history', 'castles', 'unesco', 'beach',
  'islands', 'mountains', 'hiking', 'lakes', 'nature', 'ski', 'thermal-baths', 'wine', 'beer', 'festivals',
  'christmas-markets', 'student-city', 'big-city', 'quiet',
];
const tagName = (t: string) => t.replace(/-/g, ' ');
const WEEKEND = [5, 6, 0];
const sameDays = (a: number[], b: number[]) => a.length === b.length && b.every((d) => a.includes(d));
/** longest run of consecutive free weekdays (wrapping round the week) */
const maxRun = (days: number[]) => {
  if (days.length >= 7) return 99;
  let best = 0;
  for (let start = 0; start < 7; start++) {
    let n = 0;
    while (n < 7 && days.includes((start + n) % 7)) n++;
    best = Math.max(best, n);
  }
  return best;
};
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
  spec: SearchSpec;
  set: (patch: Partial<SearchSpec>) => void;
  catalog: CatalogEntry[];
  countries: CountryEntry[];
  quota: { left: number; total: number } | null;
  hasLive: boolean;
}

function Sec({ n, title, sum, open, children }: { n: string; title: string; sum: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details className="sec" open={open}>
      <summary>
        <span className="sec-num">{n}</span>
        <span className="sec-title">{title}</span>
        <span className="sec-sum">{sum}</span>
      </summary>
      <div className="sec-body">{children}</div>
    </details>
  );
}

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

function Tick({ checked, onChange, children, hint }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode; hint?: string }) {
  return (
    <label className="tick">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {children}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

function Num({ label, value, onChange, min = 0, max, step = 1, suffix, placeholder }: {
  label: string; value: number | null; onChange: (v: number | null) => void; min?: number; max?: number; step?: number; suffix?: string; placeholder?: string;
}) {
  return (
    <div className="field">
      <label>{label}{suffix ? ` (${suffix})` : ''}</label>
      <input
        className="input mono" type="number" inputMode="numeric" min={min} max={max} step={step} placeholder={placeholder ?? 'any'}
        value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      />
    </div>
  );
}

function DayPicks({ days, options, onChange, label }: { days: number[]; options: number[]; onChange: (d: number[]) => void; label: string }) {
  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="tags">
        {options.map((d) => (
          <button key={d} type="button" className="tag" aria-pressed={days.includes(d)} onClick={() => onChange(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])}>
            {WD[d]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Pick ids from a long list by typing. */
function MultiPick({ items, value, onChange, placeholder }: { items: { id: string; label: string; detail?: string }[]; value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [q, setQ] = useState('');
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const hits = q.trim().length < 1 ? [] : items.filter((i) => !value.includes(i.id) && i.label.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  return (
    <div className="field">
      {value.length > 0 && (
        <div className="tags">
          {value.map((id) => (
            <button key={id} type="button" className="tag" aria-pressed="true" onClick={() => onChange(value.filter((v) => v !== id))}>
              {byId.get(id)?.label ?? id}<span className="x" aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}
      <div className="suggest">
        <input className="input" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
        {hits.length > 0 && (
          <ul>
            {hits.map((h) => (
              <li key={h.id}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange([...value, h.id]); setQ(''); }}>
                  <span>{h.label}</span>
                  {h.detail && <small>{h.detail}</small>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function PlanForm({ spec, set, catalog, countries, quota, hasLive }: Props) {
  const w = spec.when;
  const setWhen = (p: Partial<When>) => set({ when: { ...w, ...p } });
  const cur = spec.currency;
  const [blackout, setBlackout] = useState('');

  const placeItems = useMemo(() => catalog.map((c) => ({ id: c.id, label: c.name, detail: c.country })), [catalog]);
  const countryItems = useMemo(() => countries.map((c) => ({ id: c.cc, label: c.name, detail: REGION_LABEL[c.region] })), [countries]);
  const regions = Object.keys(REGION_LABEL) as Region[];

  const tagState = (t: Tag) => (spec.tagsAny.includes(t) ? 'yes' : spec.tagsNone.includes(t) ? 'no' : 'any');
  const cycleTag = (t: Tag) => {
    const s = tagState(t);
    if (s === 'any') set({ tagsAny: [...spec.tagsAny, t] });
    else if (s === 'yes') set({ tagsAny: spec.tagsAny.filter((x) => x !== t), tagsNone: [...spec.tagsNone, t] });
    else set({ tagsNone: spec.tagsNone.filter((x) => x !== t) });
  };

  const modesOn = MODES.filter((m) => spec.modes[m]);
  const whenSum =
    w.kind === 'weekends' ? `next ${w.weekendsAhead} weekends` : w.kind === 'window' ? `${w.nightsMin}–${w.nightsMax} nights` : w.depart ? shortDay(w.depart) : 'pick dates';
  const whereSum =
    spec.scope === 'anywhere' ? (spec.tagsAny.length ? `anywhere · ${spec.tagsAny.length} likes` : 'anywhere') :
    spec.scope === 'regions' ? `${spec.regions.length} regions` : spec.scope === 'countries' ? `${spec.countries.length} countries` : `${spec.places.length} places`;
  const moneyIn = (v: number | null) => (v == null ? null : fromUsd(v, cur));
  const moneyOut = (v: number | null) => (v == null ? null : Math.round(toUsd(v, cur)));

  return (
    <>
      <Sec n="01" title="From" sum={spec.origins.map((o) => o.label).join(' · ') || 'add a home base'} open>
        <HomeBasePicker value={spec.origins} onChange={(origins) => set({ origins })} />
        <div className="field">
          <label>Fly from airports within ({spec.airportRadiusKm} km)</label>
          <input type="range" min={30} max={300} step={10} value={spec.airportRadiusKm} onChange={(e) => set({ airportRadiusKm: Number(e.target.value) })} />
        </div>
      </Sec>

      <Sec n="02" title="Where to" sum={whereSum} open>
        <Seg label="Scope" value={spec.scope} onChange={(scope) => set({ scope })} options={[['anywhere', 'Anywhere'], ['regions', 'Regions'], ['countries', 'Countries'], ['places', 'Places']]} />
        {spec.scope === 'regions' && (
          <div className="tags">
            {regions.map((r) => (
              <button key={r} type="button" className="tag" aria-pressed={spec.regions.includes(r)} onClick={() => set({ regions: spec.regions.includes(r) ? spec.regions.filter((x) => x !== r) : [...spec.regions, r] })}>
                {REGION_LABEL[r]}
              </button>
            ))}
          </div>
        )}
        {spec.scope === 'countries' && <MultiPick items={countryItems} value={spec.countries} onChange={(countries) => set({ countries })} placeholder="Type a country…" />}
        {spec.scope === 'places' && <MultiPick items={placeItems} value={spec.places} onChange={(places) => set({ places })} placeholder="Type a city or town…" />}

        <div className="field">
          <span className="label">What you’re into · tap once to want, twice to avoid</span>
          <div className="tags">
            {TAGS.map((t) => {
              const s = tagState(t);
              return (
                <button key={t} type="button" className="tag" aria-pressed={s === 'yes'} data-state={s} onClick={() => cycleTag(t)}>
                  {tagName(t)}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid2">
          <Num label="Min distance" suffix="km" value={spec.minDistanceKm || null} onChange={(v) => set({ minDistanceKm: v ?? 0 })} placeholder="0" />
          <Num label="Max distance" suffix="km" value={spec.maxDistanceKm || null} onChange={(v) => set({ maxDistanceKm: v ?? 0 })} />
        </div>
        <Seg label="Borders" value={spec.abroad} onChange={(abroad) => set({ abroad })} options={[['any', 'Anywhere'], ['only', 'Abroad only'], ['domestic', 'Same country']]} />
        <Tick checked={spec.inSeasonOnly} onChange={(inSeasonOnly) => set({ inSeasonOnly })} hint="hide places outside their best months">In season only</Tick>
        <Tick checked={spec.skipVisited} onChange={(skipVisited) => set({ skipVisited })} hint="places you’ve marked as been there">Skip where I’ve been</Tick>
        {spec.exclude.length > 0 && (
          <div className="field">
            <span className="label">Hidden ({spec.exclude.length}) · tap to bring back</span>
            <div className="tags">
              {spec.exclude.map((id) => (
                <button key={id} type="button" className="tag" onClick={() => set({ exclude: spec.exclude.filter((x) => x !== id) })}>
                  {catalog.find((c) => c.id === id)?.name ?? countries.find((c) => c.cc === id)?.name ?? id}<span className="x">×</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Sec>

      <Sec n="03" title="When" sum={whenSum}>
        <Seg label="Dates" value={w.kind} onChange={(kind) => setWhen({ kind })} options={[['weekends', 'Weekends'], ['window', 'Date range'], ['exact', 'Exact dates']]} />
        {w.kind === 'weekends' && (
          <>
            <div className="field">
              <label>Scan the next {w.weekendsAhead} weekend{w.weekendsAhead > 1 ? 's' : ''}</label>
              <input type="range" min={1} max={12} value={w.weekendsAhead} onChange={(e) => setWhen({ weekendsAhead: Number(e.target.value) })} />
            </div>
            <div className="grid2">
              <DayPicks label="Leave on" days={w.departDays} options={[3, 4, 5, 6]} onChange={(departDays) => setWhen({ departDays })} />
              <DayPicks label="Come back on" days={w.returnDays} options={[6, 0, 1, 2]} onChange={(returnDays) => setWhen({ returnDays })} />
            </div>
          </>
        )}
        {w.kind === 'window' && (
          <>
            <div className="grid2">
              <div className="field"><label>Earliest out</label><input className="input mono" type="date" value={w.from} onChange={(e) => setWhen({ from: e.target.value })} /></div>
              <div className="field"><label>Latest back</label><input className="input mono" type="date" value={w.to} onChange={(e) => setWhen({ to: e.target.value })} /></div>
            </div>
            <div className="grid2">
              <Num label="Nights, at least" value={w.nightsMin} onChange={(v) => setWhen({ nightsMin: v ?? 0 })} />
              <Num label="Nights, at most" value={w.nightsMax} onChange={(v) => setWhen({ nightsMax: v ?? w.nightsMin })} />
            </div>
            <div className="field">
              <span className="label">Days you’re free</span>
              <Seg
                label="Days you're free"
                value={!w.freeDays.length ? 'any' : sameDays(w.freeDays, WEEKEND) ? 'weekend' : 'pick'}
                onChange={(v) => setWhen({ freeDays: v === 'any' ? [] : v === 'weekend' ? WEEKEND : w.freeDays.length && !sameDays(w.freeDays, WEEKEND) ? w.freeDays : [4, 5, 6, 0] })}
                options={[['any', 'Any day'], ['weekend', 'Weekends only'], ['pick', 'Pick days']]}
              />
              {w.freeDays.length > 0 && !sameDays(w.freeDays, WEEKEND) && (
                <DayPicks label="Every day of the trip must be one of" days={w.freeDays} options={[1, 2, 3, 4, 5, 6, 0]} onChange={(freeDays) => setWhen({ freeDays })} />
              )}
              {w.freeDays.length > 0 && w.nightsMin > maxRun(w.freeDays) - 1 && (
                <small className="muted">Your free days allow at most {Math.max(0, maxRun(w.freeDays) - 1)} nights in a row; lower “nights, at least”.</small>
              )}
            </div>
          </>
        )}
        {w.kind === 'exact' && (
          <div className="grid2">
            <div className="field"><label>Out</label><input className="input mono" type="date" value={w.depart} onChange={(e) => setWhen({ depart: e.target.value })} /></div>
            <div className="field"><label>Back</label><input className="input mono" type="date" value={w.ret} onChange={(e) => setWhen({ ret: e.target.value })} /></div>
          </div>
        )}
        <div className="grid2">
          <div className="field"><label>Free from</label><input className="input mono" type="time" value={w.leaveAfter} onChange={(e) => setWhen({ leaveAfter: e.target.value })} /></div>
          <div className="field"><label>Home by</label><input className="input mono" type="time" value={w.backBy} onChange={(e) => setWhen({ backBy: e.target.value })} /></div>
        </div>
        <div className="field">
          <label>Busy days (exams, plans)</label>
          <div className="row">
            <input className="input mono" style={{ flex: 1 }} type="date" value={blackout} onChange={(e) => setBlackout(e.target.value)} />
            <button type="button" className="btn small" disabled={!blackout} onClick={() => { setWhen({ blackouts: [...new Set([...w.blackouts, blackout])].sort() }); setBlackout(''); }}>Block</button>
          </div>
          {w.blackouts.length > 0 && (
            <div className="tags">
              {w.blackouts.map((d) => (
                <button key={d} type="button" className="tag" onClick={() => setWhen({ blackouts: w.blackouts.filter((x) => x !== d) })}>
                  {shortDay(d)}<span className="x">×</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Sec>

      <Sec n="04" title="Getting there" sum={modesOn.map((m) => MODE_LABEL[m]).join(' · ') || 'no modes'}>
        <div className="modes">
          {MODES.map((m: Mode) => (
            <button key={m} type="button" className="mode-tog" data-mode={m} aria-pressed={spec.modes[m]} onClick={() => set({ modes: { ...spec.modes, [m]: !spec.modes[m] } })} title={MODE_HINT[m]}>
              <RouteSample mode={m} />
              <span><b>{MODE_LABEL[m]}</b></span>
            </button>
          ))}
        </div>
        <div className="field">
          <label>Longest one-way journey: {spec.maxLegHours} h</label>
          <input type="range" min={1} max={30} value={spec.maxLegHours} onChange={(e) => set({ maxLegHours: Number(e.target.value) })} />
        </div>
        <div className="field">
          <label>Time at the destination, at least: {spec.minHoursThere} h</label>
          <input type="range" min={0} max={120} step={2} value={spec.minHoursThere} onChange={(e) => set({ minHoursThere: Number(e.target.value) })} />
        </div>
        <div className="grid2">
          <Num label="Max changes" value={spec.maxTransfers} onChange={(v) => set({ maxTransfers: v ?? 9 })} max={9} />
          <Num label="Travellers" value={spec.travellers} min={1} max={9} onChange={(v) => set({ travellers: Math.max(1, v ?? 1) })} />
        </div>
        <Tick checked={spec.overnight} onChange={(overnight) => set({ overnight })} hint="night trains, coaches and ferries; saves a bed">Travel overnight</Tick>
      </Sec>

      <Sec n="05" title="Money" sum={spec.budgetTotal != null ? `≤ ${sign(cur)}${moneyIn(spec.budgetTotal)} all in` : spec.budgetTransport != null ? `≤ ${sign(cur)}${moneyIn(spec.budgetTransport)} travel` : 'no limit'}>
        <Seg<Currency> label="Currency" value={cur} onChange={(currency) => set({ currency })} options={[['EUR', '€ EUR'], ['GBP', '£ GBP'], ['USD', '$ USD']]} />
        <div className="grid2">
          <Num label="Travel budget" suffix={`${sign(cur)} return`} value={moneyIn(spec.budgetTransport)} onChange={(v) => set({ budgetTransport: moneyOut(v) })} />
          <Num label="All-in budget" suffix={`${sign(cur)} per person`} value={moneyIn(spec.budgetTotal)} onChange={(v) => set({ budgetTotal: moneyOut(v) })} />
        </div>
        <div className="field">
          <span className="label">Where you sleep</span>
          <Seg<StayStyle> label="Stay" value={spec.stayStyle} onChange={(stayStyle) => set({ stayStyle })} options={[['free', 'Friends'], ['hostel', 'Hostel'], ['budget', 'Budget room'], ['mid', 'Hotel']]} />
        </div>
        <div className="field">
          <span className="label">How you eat</span>
          <Seg<FoodStyle> label="Food" value={spec.foodStyle} onChange={(foodStyle) => set({ foodStyle })} options={[['self', 'Self-cater'], ['cheap', 'Cheap eats'], ['restaurants', 'Restaurants']]} />
        </div>
        <Tick checked={spec.includeSights} onChange={(includeSights) => set({ includeSights })} hint="a museum, tour or entry fee each day">Count sights & activities</Tick>
        <Tick checked={spec.under26} onChange={(under26) => set({ under26 })} hint="youth fares on most European railways">Under 26</Tick>
        <Tick checked={spec.railcard} onChange={(railcard) => set({ railcard })} hint="Railcard, BahnCard, Carta Freccia, etc.">I have a rail discount card</Tick>
        <Tick checked={spec.checkedBag} onChange={(checkedBag) => set({ checkedBag })} hint="otherwise flights assume a free under-seat bag">Checked bag on flights</Tick>
      </Sec>

      <Sec n="06" title="What matters" sum={`sort by ${spec.sort === 'score' ? 'best match' : spec.sort}`}>
        {([
          ['price', 'Low price'],
          ['time', 'Short journeys'],
          ['interest', 'Matches my interests'],
          ['hoursThere', 'More time there'],
          ['comfort', 'Fewer changes'],
        ] as [keyof SearchSpec['weights'], string][]).map(([k, label]) => (
          <div className="field" key={k}>
            <label>{label} <span className="mono muted">{spec.weights[k]}</span></label>
            <input type="range" min={0} max={10} value={spec.weights[k]} onChange={(e) => set({ weights: { ...spec.weights, [k]: Number(e.target.value) } })} />
          </div>
        ))}
        <div className="field">
          <label>Sort results by</label>
          <select className="input" value={spec.sort} onChange={(e) => set({ sort: e.target.value as SortKey })}>
            <option value="score">Best match (the sliders above)</option>
            <option value="total">Cheapest all in</option>
            <option value="price">Cheapest travel</option>
            <option value="time">Shortest journey</option>
            <option value="hoursThere">Most time there</option>
            <option value="distance">Nearest first</option>
          </select>
        </div>
        <Tick
          checked={spec.live && hasLive}
          onChange={(live) => set({ live })}
          hint={hasLive ? (quota ? `more airlines via Google · ${quota.left} of ${quota.total} free lookups left this month` : 'more airlines via Google’s fares') : 'needs a free SerpApi key on the server; Ryanair fares work without it'}
        >
          Google flight fares too
        </Tick>
      </Sec>
    </>
  );
}
