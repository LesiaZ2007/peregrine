'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState, useEffect, useCallback } from 'react';
import { ArrowLeft, SlidersHorizontal, Share2, RefreshCw, Key } from 'lucide-react';
import FlightCard from '@/components/FlightCard';
import CompareBar from '@/components/CompareBar';
import PeregrineInsight from '@/components/PeregrineInsight';
import PriceTrendChart from '@/components/PriceTrendChart';
import SharePlanModal from '@/components/SharePlanModal';
import { scoreFlight } from '@/lib/heuristics';
import { recordPrice, getHistory, getPriceChange } from '@/lib/priceHistory';
import { DESTINATIONS } from '@/components/DestinationPicker';

// ── Mock data for when API keys are not configured ────────────────────────
function generateMockFlights(origin, destination, departureDate, returnDate) {
  const airlines = [
    { code: 'JL', name: 'Japan Airlines' },
    { code: 'NH', name: 'ANA' },
    { code: 'UA', name: 'United Airlines' },
    { code: 'AA', name: 'American Airlines' },
    { code: 'QR', name: 'Qatar Airways' },
    { code: 'EK', name: 'Emirates' },
  ];
  const basePrice = 700 + Math.floor(Math.random() * 600);
  return airlines.slice(0, 4).map((al, i) => ({
    id: `mock-${origin}-${destination}-${i}`,
    price: basePrice + i * 80 + Math.floor(Math.random() * 120),
    currency: 'USD',
    airline: al.code,
    airlineName: al.name,
    flightNumber: `${al.code}${Math.floor(Math.random() * 900) + 100}`,
    origin,
    stops: i === 0 ? 0 : 1,
    stopCodes: i === 1 ? ['ICN'] : i === 2 ? ['DXB'] : [],
    cabin: 'ECONOMY',
    departure: { airport: origin, time: new Date(`${departureDate}T10:${String(i * 15).padStart(2,'0')}:00`).toISOString() },
    arrival: { airport: destination, time: new Date(`${departureDate}T${14 + i * 2}:30:00`).toISOString() },
    durationStr: `${13 + i}h ${30 + i * 10}m`,
    durationMins: (13 + i) * 60 + 30 + i * 10,
    isRoundTrip: !!returnDate,
    returnFlight: returnDate ? {
      departure: { airport: destination, time: new Date(`${returnDate}T09:00:00`).toISOString() },
      arrival: { airport: origin, time: new Date(`${returnDate}T22:00:00`).toISOString() },
      durationStr: `${13 + i}h`,
      stops: i === 0 ? 0 : 1,
    } : null,
    isMock: true,
  }));
}

function ResultsContent() {
  const params = useSearchParams();
  const router = useRouter();

  const origins      = params.get('origins')?.split(',').filter(Boolean) || [];
  const destCodes    = params.get('destinations')?.split(',').filter(Boolean) || [];
  const tripType     = params.get('tripType') || 'roundtrip';
  const earliestDep  = params.get('earliestDep') || params.get('start') || '';
  const latestReturn = params.get('latestReturn') || params.get('end') || earliestDep;
  const duration     = parseInt(params.get('duration') || '7');
  const blackouts    = params.get('blackouts') || '';
  // Flexible = different earliest/latest; single-date = same or only one set
  const isFlexible   = !!(earliestDep && latestReturn && earliestDep !== latestReturn);
  const adults       = parseInt(params.get('adults') || '1');
  const cabin        = params.get('cabin') || 'Economy';
  const budget       = params.get('budget') || '';
  const layoversStr  = params.get('layovers') || '';
  const interestingLayovers = new Set(layoversStr.split(',').filter(Boolean));

  const destinations = DESTINATIONS.filter(d => destCodes.includes(d.code));

  const [flights, setFlights] = useState({});         // { destCode: Flight[] }
  const [loading, setLoading] = useState(true);
  const [apiMissing, setApiMissing] = useState(false);
  const [bestDates, setBestDates] = useState(null);  // { departureDate, returnDate } for flexible
  const [filterAirlines, setFilterAirlines] = useState(new Set());
  const [selectedAirlines, setSelectedAirlines] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [activeTab, setActiveTab] = useState(destCodes[0] || '');

  const fetchFlights = useCallback(async () => {
    setLoading(true);
    const allFlights = {};
    let overallBestDates = null;

    await Promise.allSettled(
      destCodes.map(async (dest) => {
        try {
          let res, json;

          if (isFlexible) {
            // Flexible date search
            const qs = new URLSearchParams({
              origins:      origins.join(','),
              destination:  dest,
              earliestDep,
              latestReturn,
              duration,
              adults,
              cabin:    cabin.toUpperCase().replace(' ', '_'),
              blackouts,
            });
            res  = await fetch(`/api/flights/flexible?${qs}`);
            json = await res.json();
          } else {
            // Fixed date search
            const depDate = earliestDep;
            const retDate = tripType !== 'oneway' ? latestReturn : '';
            const qs = new URLSearchParams({
              origins:      origins.join(','),
              destination:  dest,
              departureDate: depDate,
              ...(retDate ? { returnDate: retDate } : {}),
              adults,
              cabin: cabin.toUpperCase().replace(' ', '_'),
              max: 15,
            });
            res  = await fetch(`/api/flights/search?${qs}`);
            json = await res.json();
          }

          if (json.error === 'api_keys_missing') {
            setApiMissing(true);
            const dep = earliestDep;
            const ret = tripType !== 'oneway' ? latestReturn : '';
            const mockAll = origins.flatMap(o => generateMockFlights(o, dest, dep, ret));
            mockAll.sort((a, b) => a.price - b.price);
            allFlights[dest] = mockAll;
            mockAll.slice(0, 3).forEach(f => recordPrice(f.origin, dest, f.price, tripType, dep));
          } else if (json.data) {
            allFlights[dest] = json.data;
            if (json.bestDepartureDate && !overallBestDates) {
              overallBestDates = { departureDate: json.bestDepartureDate, returnDate: json.bestReturnDate };
            }
            const depDate = json.data[0]?.flexDepartureDate || earliestDep;
            json.data.slice(0, 3).forEach(f =>
              recordPrice(f.origin || origins[0], dest, f.price, tripType, depDate)
            );
          }
        } catch {
          const dep = earliestDep;
          const ret = tripType !== 'oneway' ? latestReturn : '';
          const mockAll = origins.flatMap(o => generateMockFlights(o, dest, dep, ret));
          mockAll.sort((a, b) => a.price - b.price);
          allFlights[dest] = mockAll;
          setApiMissing(true);
        }
      })
    );

    setFlights(allFlights);
    setBestDates(overallBestDates);
    const airlines = new Set(Object.values(allFlights).flat().map(f => f.airline).filter(Boolean));
    setFilterAirlines(airlines);
    setLoading(false);
  }, [origins.join(','), destCodes.join(','), earliestDep, latestReturn, duration, adults, cabin, tripType, isFlexible]);

  useEffect(() => { fetchFlights(); }, [fetchFlights]);

  // Cheapest per destination for CompareBar
  const cheapestByDest = {};
  destCodes.forEach(code => {
    const list = flights[code] || [];
    const filtered = list.filter(f => selectedAirlines.size === 0 || selectedAirlines.has(f.airline));
    if (filtered.length > 0) cheapestByDest[code] = filtered[0];
  });

  const activeFlights = (flights[activeTab] || []).filter(f => selectedAirlines.size === 0 || selectedAirlines.has(f.airline));
  // Use best dates from flexible search if available, otherwise fall back to the search window
  const effectiveDepDate = bestDates?.departureDate || earliestDep;
  const departureDate = effectiveDepDate ? new Date(effectiveDepDate) : null;

  const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const sharePlan = {
    origins, destinations: destCodes, tripType,
    earliestDep, latestReturn, duration,
    adults, cabin, budget,
    layovers: [...interestingLayovers],
    searchedAt: new Date().toISOString(),
  };

  return (
    <div>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
          <button onClick={() => router.back()} className="btn btn-secondary" style={{ padding: '7px 12px', flexShrink: 0 }}>
            <ArrowLeft size={15} />
          </button>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px' }}>
              {origins.join(', ')} → {destCodes.join(', ')}
            </h1>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {isFlexible
                ? <>Flexible window: {formatDate(earliestDep)} – {formatDate(latestReturn)} · {duration} night{duration !== 1 ? 's' : ''}</>
                : <>{formatDate(earliestDep)}{latestReturn && latestReturn !== earliestDep ? ` → ${formatDate(latestReturn)}` : ''}</>
              }
              {' '}· {adults} adult{adults > 1 ? 's' : ''} · {cabin}
              {tripType === 'roundtrip' ? ' · Round trip' : tripType === 'oneway' ? ' · One way' : ' · Multi-city'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => setShowFilters(!showFilters)} className="btn btn-secondary" style={{ gap: 5 }}>
              <SlidersHorizontal size={14} />
              Filters {selectedAirlines.size > 0 && `(${selectedAirlines.size})`}
            </button>
            <button onClick={() => setShowShare(true)} className="btn btn-secondary" style={{ gap: 5 }}>
              <Share2 size={14} />
              Share
            </button>
            <button onClick={fetchFlights} className="btn btn-secondary" style={{ padding: '7px 10px' }}>
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* CompareBar — inside content area so it doesn't overlap nav */}
        <CompareBar destinations={destinations} cheapestByDest={cheapestByDest} />

        {/* Best dates banner — shown when flexible search finds a cheapest window */}
        {!loading && isFlexible && bestDates && (
          <div style={{ padding: '12px 16px', background: 'var(--green-bg)', border: '1.5px solid rgba(16,185,129,.3)', borderRadius: 'var(--r)', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18 }}>✈️</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--green)' }}>Cheapest window found: </span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                Depart {formatDate(bestDates.departureDate)}
                {bestDates.returnDate ? ` → Return ${formatDate(bestDates.returnDate)}` : ''}
              </span>
            </div>
            {cheapestByDest[activeTab] && (
              <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--green)' }}>
                from ${cheapestByDest[activeTab].price?.toLocaleString()}
              </span>
            )}
          </div>
        )}

        {/* API key notice */}
        {apiMissing && (
          <div style={{ padding: '12px 16px', background: 'var(--amber-bg)', border: '1.5px solid #fde68a', borderRadius: 'var(--r)', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Key size={16} color="var(--amber)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--amber)' }}>Showing demo data — SerpAPI key needed for real flights</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Copy <code style={{ background: 'var(--bg-2)', padding: '1px 5px', borderRadius: 4 }}>.env.local.example</code> to <code style={{ background: 'var(--bg-2)', padding: '1px 5px', borderRadius: 4 }}>.env.local</code> and add your <code style={{ background: 'var(--bg-2)', padding: '1px 5px', borderRadius: 4 }}>SERPAPI_KEY</code>. See README for instructions.
              </div>
            </div>
          </div>
        )}

        {/* Filter panel */}
        {showFilters && filterAirlines.size > 0 && (
          <div className="card" style={{ padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
              Filter by airline
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[...filterAirlines].map(code => {
                const active = selectedAirlines.has(code);
                return (
                  <button
                    key={code}
                    onClick={() => {
                      const next = new Set(selectedAirlines);
                      if (active) next.delete(code); else next.add(code);
                      setSelectedAirlines(next);
                    }}
                    style={{ padding: '5px 12px', borderRadius: 'var(--r-full)', border: `1.5px solid ${active ? 'var(--blue)' : 'var(--border-2)'}`, background: active ? 'var(--blue-light)' : 'var(--surface)', color: active ? 'var(--blue)' : 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s' }}
                  >
                    {code}
                  </button>
                );
              })}
              {selectedAirlines.size > 0 && (
                <button onClick={() => setSelectedAirlines(new Set())} style={{ padding: '5px 12px', borderRadius: 'var(--r-full)', border: '1.5px solid var(--border-2)', background: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-muted)' }}>
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Destination tabs */}
        {destCodes.length > 1 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
            {destinations.map(dest => {
              const active = activeTab === dest.code;
              const cheapest = cheapestByDest[dest.code];
              return (
                <button
                  key={dest.code}
                  onClick={() => setActiveTab(dest.code)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '8px 16px', borderRadius: 'var(--r)',
                    border: `1.5px solid ${active ? 'var(--blue)' : 'var(--border-2)'}`,
                    background: active ? 'var(--blue-light)' : 'var(--surface)',
                    cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 14,
                    color: active ? 'var(--blue)' : 'var(--text)', transition: 'all .12s',
                  }}
                >
                  {dest.emoji} {dest.city}
                  {cheapest && <span style={{ fontSize: 12, fontWeight: 700, color: active ? 'var(--blue)' : 'var(--text-muted)' }}>${cheapest.price?.toLocaleString()}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Main content */}
        <div style={{ display: 'grid', gridTemplateColumns: activeFlights.length > 0 ? '1fr 300px' : '1fr', gap: 24, alignItems: 'start' }}>
          {/* Flight list */}
          <div>
            {loading && (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>✈️</div>
                <div style={{ fontWeight: 700 }}>Searching flights…</div>
              </div>
            )}

            {!loading && activeFlights.length === 0 && (
              <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>🔍</div>
                <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No flights found</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Try different dates or remove airline filters.</div>
              </div>
            )}

            {!loading && activeFlights.map((flight, i) => {
              const dest = flight.arrival?.airport;
              const origin = flight.origin || origins[0];
              const history = getHistory(origin, dest, tripType);
              const priceChange = getPriceChange(origin, dest, flight.price, tripType);
              const heuristic = dest && departureDate ? scoreFlight({
                destCode: activeTab,
                departureDate: effectiveDepDate,
                currentPrice: flight.price,
                priceHistory: history,
              }) : null;

              return (
                <div key={flight.id} style={{ marginBottom: 12 }}>
                  <FlightCard
                    flight={flight}
                    searchParams={{ origins, destinations: destCodes, tripType, earliestDep, latestReturn, duration, adults, cabin, passengers: { adults } }}
                    budget={budget}
                    heuristicResult={heuristic}
                    priceChange={priceChange}
                    interestingLayovers={interestingLayovers}
                    rank={i + 1}
                  />
                </div>
              );
            })}
          </div>

          {/* Sidebar: insights + trend */}
          {!loading && activeFlights.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Peregrine Insight */}
              {activeFlights[0] && (() => {
                const dest = activeFlights[0].arrival?.airport;
                const origin = activeFlights[0].origin || origins[0];
                const history = getHistory(origin, dest, tripType);
                const heuristic = dest ? scoreFlight({
                  destCode: activeTab,
                  departureDate: effectiveDepDate,
                  currentPrice: activeFlights[0].price,
                  priceHistory: history,
                }) : null;
                return heuristic ? <PeregrineInsight heuristicResult={heuristic} fetchAI={!apiMissing} /> : null;
              })()}

              {/* Price trend chart */}
              {(() => {
                const dest = activeFlights[0]?.arrival?.airport;
                const origin = activeFlights[0]?.origin || origins[0];
                const history = dest ? getHistory(origin, dest, tripType) : [];
                return (
                  <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Price history</div>
                    <PriceTrendChart history={history} currentPrice={activeFlights[0]?.price} />
                  </div>
                );
              })()}

              {/* Budget info */}
              {budget && (
                <div className="card" style={{ padding: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Your budget</div>
                  <div style={{ fontWeight: 800, fontSize: 20 }}>${parseFloat(budget).toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {activeFlights.filter(f => f.price <= parseFloat(budget)).length} of {activeFlights.length} flights within budget
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Share modal */}
      {showShare && <SharePlanModal plan={sharePlan} onClose={() => setShowShare(false)} />}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✈️</div>
        <div style={{ fontWeight: 700 }}>Loading results…</div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
