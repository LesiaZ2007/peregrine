'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, X, Moon } from 'lucide-react';

const DAYS   = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const DURATIONS = [
  { label: 'Weekend',  days: 2  },
  { label: '5 nights', days: 5  },
  { label: '1 week',   days: 7  },
  { label: '10 days',  days: 10 },
  { label: '2 weeks',  days: 14 },
  { label: '3 weeks',  days: 21 },
  { label: '1 month',  days: 30 },
];

function toKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
function sameDay(a, b) {
  return a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate();
}
function inRange(date, start, end) {
  if (!start || !end) return false;
  const d = date.getTime();
  const s = Math.min(start.getTime(), end.getTime());
  const e = Math.max(start.getTime(), end.getTime());
  return d > s && d < e;
}
function fmtShort(d) {
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
}

/**
 * DateRangePicker
 *
 * value shape:
 *   {
 *     earliestDep:  Date | null,   ← "Earliest I can leave"
 *     latestReturn: Date | null,   ← "Latest I can be back" (same as earliestDep = specific trip)
 *     durationDays: number,        ← how long to stay (round-trip / multi-city)
 *     blackouts:    Set<string>,   ← toKey() strings for blacked-out days
 *   }
 *
 * For one-way: earliestDep + latestReturn define the departure window.
 * For round trip: departure window = [earliestDep, latestReturn - durationDays].
 * Peregrine samples across that window and returns cheapest combo.
 */
export default function DateRangePicker({ value, onChange, tripType = 'roundtrip' }) {
  const {
    earliestDep  = null,
    latestReturn = null,
    durationDays = 7,
    blackouts    = new Set(),
  } = value || {};

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [hovered,   setHovered]   = useState(null);
  const [selecting, setSelecting] = useState('earliest'); // 'earliest' | 'latest'
  const [open,      setOpen]      = useState(false);
  const [showCustomDur, setShowCustomDur] = useState(false);
  const [customDur,     setCustomDur]     = useState('');

  const update = (patch) => onChange({
    earliestDep, latestReturn, durationDays, blackouts: new Set(blackouts), ...patch,
  });

  // ── Month nav ─────────────────────────────────────────────────────────────
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(v => v - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(v => v + 1); }
    else setViewMonth(m => m + 1);
  };

  // ── Build calendar days ───────────────────────────────────────────────────
  const getDays = (year, month) => {
    const first = new Date(year, month, 1).getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const days  = [];
    for (let i = 0; i < first; i++) days.push(null);
    for (let d = 1; d <= total; d++) days.push(new Date(year, month, d));
    return days;
  };

  // ── Click handler ─────────────────────────────────────────────────────────
  const handleDayClick = (date, e) => {
    const key    = toKey(date);
    const isPast = date < today;
    if (isPast) return;

    // Shift-click: blackout/un-blackout a whole week
    if (e.shiftKey) {
      const nb = new Set(blackouts);
      for (let i = 0; i < 7; i++) {
        const d = new Date(date);
        d.setDate(d.getDate() + i);
        const k = toKey(d);
        nb.has(k) ? nb.delete(k) : nb.add(k);
      }
      update({ blackouts: nb });
      return;
    }

    // If date is within selected window → toggle blackout
    if (earliestDep && latestReturn &&
        (sameDay(date, earliestDep) || sameDay(date, latestReturn) || inRange(date, earliestDep, latestReturn))) {
      const nb = new Set(blackouts);
      nb.has(key) ? nb.delete(key) : nb.add(key);
      update({ blackouts: nb });
      return;
    }

    // Window selection: first click = earliest departure, second = latest return
    if (selecting === 'earliest' || !earliestDep) {
      update({ earliestDep: date, latestReturn: null, blackouts: new Set() });
      setSelecting('latest');
    } else {
      if (date < earliestDep) {
        update({ earliestDep: date, latestReturn: earliestDep, blackouts: new Set() });
      } else {
        update({ earliestDep, latestReturn: date, blackouts: new Set(blackouts) });
      }
      setSelecting('earliest');
      setOpen(false);
    }
  };

  const days = getDays(viewYear, viewMonth);

  // ── Trigger button label ──────────────────────────────────────────────────
  const durLabel = DURATIONS.find(d => d.days === durationDays)?.label || `${durationDays} nights`;
  const isRange  = earliestDep && latestReturn && !sameDay(earliestDep, latestReturn);
  const isPoint  = earliestDep && (!latestReturn || sameDay(earliestDep, latestReturn));

  let label, sublabel;
  if (!earliestDep) {
    label    = 'Select when you can travel';
    sublabel = null;
  } else if (selecting === 'latest' && !latestReturn) {
    label    = `Leave from ${fmtShort(earliestDep)} → pick latest return`;
    sublabel = null;
  } else if (isRange) {
    label    = `${fmtShort(earliestDep)} – ${fmtShort(latestReturn)}`;
    sublabel = tripType !== 'oneway' ? durLabel : null;
  } else {
    label    = fmtShort(earliestDep);
    sublabel = tripType !== 'oneway' ? durLabel : null;
  }

  const blackoutCount = blackouts.size;

  return (
    <div style={{ position: 'relative' }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>
        <Calendar size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
        When can you travel?
        {blackoutCount > 0 && (
          <span style={{ marginLeft: 8, padding: '2px 8px', background: 'var(--red-bg)', color: 'var(--red)', borderRadius: 'var(--r-full)', fontSize: 11, fontWeight: 700, textTransform: 'none' }}>
            {blackoutCount} blacked out
          </span>
        )}
      </label>

      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--border-2)',
          background: 'var(--surface)', cursor: 'pointer', textAlign: 'left',
          fontFamily: 'inherit', fontSize: 14, fontWeight: earliestDep ? 600 : 400,
          color: earliestDep ? 'var(--text)' : 'var(--text-light)',
          transition: 'border-color .15s',
        }}
      >
        <Calendar size={15} color="var(--text-muted)" />
        <span style={{ flex: 1 }}>
          {label}
          {sublabel && (
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 6 }}>
              · {sublabel}
            </span>
          )}
        </span>
        {earliestDep && (
          <span
            onClick={e => {
              e.stopPropagation();
              update({ earliestDep: null, latestReturn: null, blackouts: new Set() });
              setSelecting('earliest');
            }}
            style={{ color: 'var(--text-light)', cursor: 'pointer', display: 'flex' }}
          >
            <X size={14} />
          </span>
        )}
      </button>

      {/* Calendar dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0,
          background: 'var(--surface)', border: '1.5px solid var(--border-2)',
          borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-lg)',
          zIndex: 300, padding: 20, width: 340,
          animation: 'slide-up .15s var(--ease)',
        }}>
          {/* Helper */}
          <div style={{ marginBottom: 14, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 'var(--r-sm)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {selecting === 'earliest'
              ? '📅 Click the earliest date you can leave'
              : '📅 Click the latest date you can be back (return date)'}
            {earliestDep && latestReturn && (
              <span> · Click a date in the window to <strong>blackout</strong> it · Shift-click to block a week</span>
            )}
          </div>

          {/* Month navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <button onClick={prevMonth} className="btn btn-ghost" style={{ padding: 6 }}><ChevronLeft size={16} /></button>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{MONTHS[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} className="btn btn-ghost" style={{ padding: 6 }}><ChevronRight size={16} /></button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-light)', padding: '4px 0' }}>{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {days.map((date, i) => {
              if (!date) return <div key={`e-${i}`} />;
              const key         = toKey(date);
              const isPast      = date < today;
              const isEarliest  = earliestDep && sameDay(date, earliestDep);
              const isLatest    = latestReturn   && sameDay(date, latestReturn);
              const isInRange   = inRange(date, earliestDep, hovered || latestReturn);
              const isHovRange  = !latestReturn && hovered && earliestDep && inRange(date, earliestDep, hovered);
              const isBlackout  = blackouts.has(key);
              const isSelected  = isEarliest || isLatest;

              let bg = 'transparent', color = isPast ? 'var(--text-light)' : 'var(--text)', border = 'none';
              if (isSelected)                { bg = 'var(--blue)'; color = '#fff'; }
              else if (isBlackout)           { bg = 'var(--red-bg)'; color = 'var(--red)'; border = '1px solid #fca5a5'; }
              else if (isInRange || isHovRange) { bg = 'var(--blue-light)'; color = 'var(--blue)'; }

              return (
                <button
                  key={key}
                  onClick={e => !isPast && handleDayClick(date, e)}
                  onMouseEnter={() => !isPast && setHovered(date)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    padding: '7px 0', textAlign: 'center', border, borderRadius: 8,
                    background: bg, color,
                    fontSize: 13, fontWeight: isSelected ? 700 : 500,
                    cursor: isPast ? 'not-allowed' : 'pointer',
                    opacity: isPast ? .35 : 1,
                    fontFamily: 'inherit',
                    position: 'relative',
                    transition: 'background .1s, color .1s',
                  }}
                >
                  {date.getDate()}
                  {isBlackout && (
                    <span style={{ position: 'absolute', top: 1, right: 2, fontSize: 8, color: 'var(--red)' }}>✕</span>
                  )}
                  {isEarliest && !isLatest && (
                    <span style={{ position: 'absolute', bottom: 1, left: '50%', transform: 'translateX(-50%)', fontSize: 7, color: '#fff', fontWeight: 800 }}>FROM</span>
                  )}
                  {isLatest && !sameDay(earliestDep, latestReturn) && (
                    <span style={{ position: 'absolute', bottom: 1, left: '50%', transform: 'translateX(-50%)', fontSize: 7, color: '#fff', fontWeight: 800 }}>TO</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Summary within calendar */}
          {earliestDep && latestReturn && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--blue-light)', borderRadius: 'var(--r-sm)', fontSize: 13, color: 'var(--blue)', fontWeight: 600 }}>
              {sameDay(earliestDep, latestReturn)
                ? `✈️ Departing ${fmtShort(earliestDep)}`
                : `✈️ Window: ${fmtShort(earliestDep)} – ${fmtShort(latestReturn)}`}
              {blackoutCount > 0 && ` · ${blackoutCount} day${blackoutCount > 1 ? 's' : ''} blacked out`}
              {isRange && tripType !== 'oneway' && (
                <span style={{ display: 'block', fontSize: 11, fontWeight: 400, opacity: .75, marginTop: 2 }}>
                  Peregrine will search across this window to find the cheapest {durLabel}
                </span>
              )}
            </div>
          )}

          {/* Duration chips — round trip + multi-city only */}
          {tripType !== 'oneway' && (
            <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Moon size={10} /> How long do you want to stay?
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {DURATIONS.map(d => {
                  const active = durationDays === d.days && !showCustomDur;
                  return (
                    <button
                      key={d.days}
                      onClick={() => { update({ durationDays: d.days }); setShowCustomDur(false); }}
                      style={{
                        padding: '4px 11px', borderRadius: 'var(--r-full)', fontFamily: 'inherit',
                        border: active ? '2px solid var(--blue)' : '1.5px solid var(--border-2)',
                        background: active ? 'var(--blue-light)' : 'var(--surface)',
                        color: active ? 'var(--blue)' : 'var(--text-2)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .12s',
                      }}
                    >
                      {d.label}
                    </button>
                  );
                })}
                <button
                  onClick={() => setShowCustomDur(s => !s)}
                  style={{
                    padding: '4px 11px', borderRadius: 'var(--r-full)', fontFamily: 'inherit',
                    border: showCustomDur ? '2px solid var(--blue)' : '1.5px solid var(--border-2)',
                    background: showCustomDur ? 'var(--blue-light)' : 'var(--surface)',
                    color: showCustomDur ? 'var(--blue)' : 'var(--text-2)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .12s',
                  }}
                >
                  Custom
                </button>
              </div>
              {showCustomDur && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number"
                    className="field"
                    min={1}
                    max={90}
                    value={customDur}
                    placeholder="e.g. 12"
                    onChange={e => setCustomDur(e.target.value)}
                    style={{ width: 70, fontSize: 12 }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>nights</span>
                  <button
                    onClick={() => {
                      const n = parseInt(customDur);
                      if (n > 0 && n <= 90) { update({ durationDays: n }); setShowCustomDur(false); setCustomDur(''); }
                    }}
                    className="btn btn-primary"
                    style={{ fontSize: 12, padding: '5px 12px' }}
                  >Set</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
