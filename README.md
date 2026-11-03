# Peregrine

Find cheap, interesting trips from wherever you are — by train, coach, plane, ferry, shared car or your own car — with every setting yours to change. Built for people without fixed plans: students abroad hunting weekend escapes, anyone travelling on a budget.

## What it does

- **Anywhere search.** ~320 hand-picked places (dense across Europe, plus hubs worldwide), plus anything that turns up in live flight fares.
- **Every mode.** Train, coach, flight, ferry, rideshare and driving, each switchable, with limits on journey length, changes, overnight travel and time on the ground.
- **Flexible dates.** Scan the next N weekends (pick which days you can leave and come back), a date range with a min/max number of nights, or exact dates. Set when you're free and when you must be home, and block out busy days.
- **Budgets.** Travel budget, all-in budget, travellers, where you sleep (friends → hotel), under-26 fares, rail discount cards, checked bags.
- **Your ranking.** Sliders for price, journey time, interests, time there and comfort, or sort by any single one.
- **Interests.** Tap tags once to want them, twice to avoid them; filter by region, country or named places; domestic or abroad only; in-season only; skip places you've been.
- **Keep things.** Save trips, keep a wishlist and a been-there list, save named setups, share a search as a link. Everything stays in the browser.

## Prices: real or estimated, always labelled

| Mode | Prices | Source |
|---|---|---|
| Flight | **Always real.** No real fare → no flight listed (links offered instead). | Ryanair fare finder (free, no key); Google Flights via SerpApi's free plan (optional) |
| Coach | Real for the leading results and on demand; estimated otherwise | FlixBus (free, no key) |
| Train | Estimated, with real timetables on demand | Transitous (free, open data) for timetables |
| Ferry, rideshare, drive | Estimated | Links to Ferryhopper, BlaBlaCar, Google Maps, Rome2rio |

Every price carries a `live` or `est.` stamp, and estimates link to where the real price lives.

## Running it

```bash
npm install
npm run dev        # http://localhost:3001
```

Optional `.env.local`:

```
# Google Flights fares for airlines beyond Ryanair. Free plan: https://serpapi.com
SERPAPI_KEY=
```

Without a key, Ryanair and FlixBus fares still work.

## Checks

```bash
npm run check      # typecheck, tests, production build
npm run data:airports   # rebuild lib/data/airports.json from OurAirports
```

## How it's built

- Next.js (App Router), TypeScript, plain CSS. No UI framework.
- `lib/search.ts` is the engine: pure, tested, takes live fares as input.
- `lib/estimate.ts` models ground and sea fares; `lib/providers/*` fetch live data; `lib/live.ts` gathers it.
- `components/RouteChart.tsx` draws the map with d3-geo in a Lambert conformal projection, the one aeronautical charts use.

## Credits

Timetables: [Transitous](https://transitous.org/sources/). Airports: [OurAirports](https://ourairports.com/data/) (public domain). Map data: Natural Earth via `world-atlas`. Town search: [Open-Meteo](https://open-meteo.com/) geocoding.
