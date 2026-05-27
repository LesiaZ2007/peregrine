'use client';
import { useState } from 'react';
import { Plane, Clock, ArrowRight, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { scoreColor } from '@/lib/heuristics';
import { getLayoverInfo } from '@/lib/destinations';
import PlatformLinks from './PlatformLinks';
import WatchlistButton from './WatchlistButton';
import CostOfStaying from './CostOfStaying';

function fmtTime(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }); }
  catch { return iso; }
}

function fmtDate(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  catch { return ''; }
}

export default function FlightCard({ flight, searchParams, budget, heuristicResult, priceChange, interestingLayovers = new Set(), rank }) {
  const [expanded, setExpanded] = useState(false);

  if (!flight) return null;

  const { price, origin, departure, arrival, durationStr, stops, stopCodes = [], returnFlight, cabin, airline, flightNumber, isRoundTrip } = flight;
  const dest = arrival?.airport;

  // Interesting layover detection
  const layoverBadge = stopCodes.find(code => interestingLayovers.has(code));
  const layoverInfo  = layoverBadge ? getLayoverInfo(layoverBadge) : null;

  // Budget flag
  const overBudget = budget && price > parseFloat(budget);

  // Heuristic color
  const hColors = heuristicResult ? scoreColor(heuristicResult.recommendation) : null;

  // Price change badge color
  const pcColor = priceChange?.direction === 'up' ? 'var(--red)' : priceChange?.direction === 'down' ? 'var(--green)' : null;

  return (
    <div
      className="card card-hover"
      style={{
        borderLeft: layoverBadge ? '4px solid var(--sky)' : overBudget ? '4px solid var(--amber)' : undefined,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Rank badge for top result */}
      {rank === 1 && (
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <span className="pill pill-green" style={{ fontSize: 10 }}>⭐ Best price</span>
        </div>
      )}

      {/* Layover badge */}
      {layoverInfo && (
        <div style={{ padding: '6px 14px', background: 'var(--sky-light)', borderBottom: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#0369a1' }}>
          <Plane size={12} />
          <strong>Layover: {layoverInfo.city}</strong>
          <span style={{ opacity: .7 }}>({layoverInfo.code}) · {layoverInfo.note}</span>
        </div>
      )}

      {/* Over budget flag */}
      {overBudget && (
        <div style={{ padding: '5px 14px', background: 'var(--amber-bg)', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--amber)', fontWeight: 700 }}>
          <AlertTriangle size={12} /> ⚠️ Over your budget (${budget} budget · ${price.toLocaleString()} fare)
        </div>
      )}

      {/* Main row */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>

          {/* Origin badge */}
          {origin && (
            <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', background: 'var(--blue-light)', color: 'var(--blue)', borderRadius: 6, letterSpacing: '.5px' }}>
              from {origin}
            </span>
          )}

          {/* Flight route */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 200 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{fmtTime(departure?.time)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{departure?.airport}</div>
            </div>

            <div style={{ flex: 1, textAlign: 'center', minWidth: 80 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', marginBottom: 2 }}>
                <div style={{ height: 1.5, flex: 1, background: 'var(--border-2)' }} />
                <Plane size={14} color="var(--text-muted)" style={{ transform: 'rotate(90deg)' }} />
                <div style={{ height: 1.5, flex: 1, background: 'var(--border-2)' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                {durationStr}
                {stops > 0 && <span style={{ marginLeft: 4, color: 'var(--amber)', fontWeight: 700 }}>{stops} stop{stops > 1 ? 's' : ''}</span>}
                {stops === 0 && <span style={{ marginLeft: 4, color: 'var(--green)', fontWeight: 700 }}>Nonstop</span>}
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{fmtTime(arrival?.time)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{arrival?.airport}</div>
            </div>
          </div>

          {/* Price + actions */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--text)' }}>
              ${price?.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {isRoundTrip ? 'round trip' : 'one way'} · {cabin || 'Economy'}
            </div>
            {priceChange?.changed && (
              <div style={{ fontSize: 11, fontWeight: 700, color: pcColor, marginTop: 2 }}>
                {priceChange.direction === 'up' ? '↑' : '↓'} {Math.abs(priceChange.pct)}% since last visit
              </div>
            )}
          </div>
        </div>

        {/* Airline + flight number */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          <Plane size={11} />
          <span>{airline} {flightNumber}</span>
          {heuristicResult && (
            <span style={{ marginLeft: 4, padding: '2px 8px', borderRadius: 'var(--r-full)', background: hColors.bg, color: hColors.color, fontWeight: 700, fontSize: 11 }}>
              {heuristicResult.direction} {heuristicResult.recommendation}
            </span>
          )}
          <span style={{ marginLeft: 'auto', color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Less' : 'Details'} {expanded ? <ChevronUp size={11} style={{ verticalAlign: 'middle' }} /> : <ChevronDown size={11} style={{ verticalAlign: 'middle' }} />}
          </span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px', background: 'var(--surface-2)' }}>
          {/* Return flight */}
          {returnFlight && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Return</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontWeight: 700 }}>{fmtTime(returnFlight.departure?.time)}</div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{returnFlight.departure?.airport}</span>
                <ArrowRight size={13} color="var(--text-muted)" />
                <div style={{ fontWeight: 700 }}>{fmtTime(returnFlight.arrival?.time)}</div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{returnFlight.arrival?.airport}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{returnFlight.durationStr} · {returnFlight.stops === 0 ? 'Nonstop' : `${returnFlight.stops} stop`}</span>
              </div>
            </div>
          )}

          {/* Cost of staying */}
          {dest && <CostOfStaying destCode={dest} nights={isRoundTrip && returnFlight ? Math.ceil((new Date(returnFlight.departure?.time) - new Date(arrival?.time)) / (1000 * 60 * 60 * 24)) || 7 : 7} />}

          {/* Platform links */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Book on</div>
            <PlatformLinks
              origin={departure?.airport}
              destination={arrival?.airport}
              start={departure?.time}
              end={returnFlight?.departure?.time}
              adults={searchParams?.adults || 1}
            />
          </div>

          {/* Watchlist */}
          <div style={{ marginTop: 12 }}>
            <WatchlistButton flight={flight} searchParams={searchParams} />
          </div>
        </div>
      )}
    </div>
  );
}
