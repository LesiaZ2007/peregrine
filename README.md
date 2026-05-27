# 🦅 Peregrine

**Smart vacation flight planner** — find the cheapest flights with price predictions, multi-destination comparison, flexible date ranges with blackout days, and layover discovery.

## Features

- **Multi-origin search** — compare fares from BOS, NYC, and more in one search
- **Multi-destination comparison** — up to 5 destinations side-by-side with similar-country suggestions  
- **Flexible dates with blackout days** — set a travel window, block out camps/trips/events (shift-click for whole weeks)
- **Round trip / One-way / Multi-city** — with roundtrip discount detection
- **Price predictions** — heuristic scoring + Groq AI "buy now / wait / monitor" recommendations
- **Price trend charts** — self-built price history accumulated over repeat visits
- **Interesting layover explorer** — opt-in to embrace 20h+ layovers in Dubai, Amsterdam, Tokyo, etc.
- **Watchlist & price alerts** — saved routes with price change detection on return
- **Platform comparison** — deep links to Expedia, Booking.com, Google Flights, Kayak
- **Budget flags** — set a budget; over-budget flights are flagged, never hidden
- **Cost of staying** — estimated hotel, meals, and excursion costs per destination
- **Shareable trip plans** — generate a public link for any search or set of flights

## Tech Stack

| | |
|---|---|
| Framework | Next.js App Router (16.x) |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Flight data | Amadeus Self-Service API (free tier) |
| AI predictions | Groq SDK — `llama-3.3-70b-versatile` |
| Charts | Recharts |
| Icons | lucide-react |
| Hosting | Vercel (auto-deploy from `main`) |

## Getting Started

### API Keys Needed

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

| Key | Source | Cost |
|---|---|---|
| `AMADEUS_CLIENT_ID` + `AMADEUS_CLIENT_SECRET` | [developers.amadeus.com](https://developers.amadeus.com) | Free (2,000 calls/month) |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) | Free tier |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3001` locally | — |

### Run Dev Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
