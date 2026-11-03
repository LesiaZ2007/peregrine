# Peregrine

Find cheap, interesting trips from wherever you are — by train, coach, plane, ferry, shared car or your own car — with every setting yours to change. Built for people without fixed plans: students abroad hunting weekend escapes, anyone travelling on a budget.

## What it does

- **Anywhere search.** ~320 hand-picked places (dense across Europe, plus hubs worldwide), plus anything that turns up in live flight fares.
- **Every mode.** Train, coach, flight, ferry, rideshare and driving, each switchable, with limits on journey length, changes, overnight travel and time on the ground.
- **Flexible dates.** Scan the next N weekends (pick which days you can leave and come back), a date range with a min/max number of nights, or exact dates. Set when you're free and when you must be home, and block out busy days.
- **Budgets.** Travel budget, all-in budget, travellers, where you sleep (friends → hotel), under-26 fares, rail discount cards, checked bags.
- **Your ranking.** Sliders for price, journey time, interests, time there and comfort, or sort by any single one.
- **Interests.** Tap tags once to want them, twice to avoid them; filter by region, country or named places; domestic or abroad only; in-season only; skip places you've been.
- **Date ranges your way.** Any days, weekends only, or picked days (e.g. Thu–Sun): every day of a trip must be a free day.
- **What it really costs.** Travel plus beds, food, getting around and sights, itemised, with settings for where you sleep and how you eat.
- **Multi-mode journeys.** Train to the port + ferry, fly + airport coach, fly to the mainland + ferry to the island: every leg is named and priced, and the legs add up to the total.
- **Cheaper flights?** Each flight route gets the typical cheap fare for its distance, the budget airlines around both ends, and search links.
- **Near misses.** Places just outside your settings are listed with the reason and greyed on the map.
- **The map.** Trains, coaches and ferries drawn along their real lines, flights as arcs between airports; drag, scroll or pinch to move around.
- **Stars, compare, season plan.** Star places, compare up to four side by side, and lay out your upcoming weekends with a real price check for each.
- **Ask Peregrine.** A chat assistant that reads what's on screen, compares options and can suggest settings.
- **Keep things.** Wishlist, been-there places and countries, saved setups, share links, and export (backup/import .json, .csv, calendar .ics). Everything stays in the browser.

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

```
# Chat assistant (Groq free tier): https://console.groq.com
GROQ_API_KEY=
```

Photos are Wikipedia lead images (Wikimedia Commons), refreshed with `npm run data:images`.

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

Timetables: [Transitous](https://transitous.org/sources/). Airports: [OurAirports](https://ourairports.com/data/) (public domain). Map data: Natural Earth via `world-atlas`. Town search: [Open-Meteo](https://open-meteo.com/) geocoding. Photos: Wikipedia / Wikimedia Commons.
