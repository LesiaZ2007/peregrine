'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function toKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function inRange(date, start, end) {
  if (!start || !end) return false;
  const d = date.getTime();
  const s = Math.min(start.getTime(), end.getTime());
  const e = Math.max(start.getTime(), end.getTime());
  return d > s && d < e;
}

export default function DateRangePicker({ value, onChange }) {
  // value: { start: Date|null, end: Date|null, blackouts: Set<string> }
  const { start = null, end = null, blackouts = new Set() } = value || {};

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [hovered, setHovered] = useState(null);
  const [selecting, setSelecting] = useState('start'); // 'start' | 'end'
  const [open, setOpen] = useState(false);

  const update = (patch) => onChange({ start, end, blackouts: new Set(blackouts), ...patch });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(v => v - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(v => v + 1); }
    else setViewMonth(m => m + 1);
  };

  const getDays = (year, month) => {
    const first = new Date(year, month, 1).getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < first; i++) days.push(null);
    for (let d = 1; d <= total; d++) days.push(new Date(year, month, d));
    return days;
  };

  const handleDayClick = (date, e) => {
    const key = toKey(date);
    const isPast = date < today;
    if (isPast) return;

    if (e.shiftKey) {
      // Blackout a week
      const newBlackouts = new Set(blackouts);
      for (let i = 0; i < 7; i++) {
        const d = new Date(date);
        d.setDate(d.getDate() + i);
        const k = toKey(d);
        if (newBlackouts.has(k)) newBlackouts.delete(k);
        else newBlackouts.add(k);
      }
      update({ blackouts: newBlackouts });
      return;
    }

    // If already in selection range, toggle blackout
    if (start && end && (sameDay(date, start) || sameDay(date, end) || inRange(date, start, end))) {
      const newBlackouts = new Set(blackouts);
      if (newBlackouts.has(key)) newBlackouts.delete(key);
      else newBlackouts.add(key);
      update({ blackouts: newBlackouts });
      return;
    }

    // Selection logic
    if (selecting === 'start' || !start) {
      update({ start: date, end: null, blackouts: new Set(blackouts) });
      setSelecting('end');
    } else {
      if (date < start) {
        update({ start: date, end: start, blackouts: new Set(blackouts) });
      } else {
        update({ start, end: date, blackouts: new Set(blackouts) });
      }
      setSelecting('start');
      setOpen(false);
    }
  };

  const days = getDays(viewYear, viewMonth);

  const formatDate = (d) => d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

  const label = start && end
    ? `${formatDate(start)} → ${formatDate(end)}`
    : start
    ? `${formatDate(start)} → pick end`
    : 'Select travel dates';

  const blackoutCount = blackouts.size;

  return (
    <div style={{ position: 'relative' }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>
        <Calendar size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
        Travel Dates
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
          fontFamily: 'inherit', fontSize: 14, fontWeight: start ? 600 : 400,
          color: start ? 'var(--text)' : 'var(--text-light)',
          transition: 'border-color .15s',
        }}
      >
        <Calendar size={15} color="var(--text-muted)" />
        <span style={{ flex: 1 }}>{label}</span>
        {(start || end) && (
          <span
            onClick={e => { e.stopPropagation(); update({ start: null, end: null, blackouts: new Set() }); setSelecting('start'); }}
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
          zIndex: 300, padding: 20, width: 320,
          animation: 'slide-up .15s var(--ease)',
        }}>
          {/* Helper text */}
          <div style={{ marginBottom: 14, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 'var(--r-sm)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {selecting === 'start' ? '📅 Click start date' : '📅 Click end date'}
            {' · '}Click a date in range to <strong>blackout</strong> it
            {' · '}Shift-click to blackout a week
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

          {/* Days grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {days.map((date, i) => {
              if (!date) return <div key={`empty-${i}`} />;

              const key = toKey(date);
              const isPast = date < today;
              const isStart = start && sameDay(date, start);
              const isEnd = end && sameDay(date, end);
              const isInRange = inRange(date, start, hovered || end);
              const isHovInRange = !end && hovered && start && inRange(date, start, hovered);
              const isBlackout = blackouts.has(key);
              const isSelected = isStart || isEnd;

              let bg = 'transparent';
              let color = isPast ? 'var(--text-light)' : 'var(--text)';
              let border = 'none';
              let borderRadius = 8;

              if (isSelected) { bg = 'var(--blue)'; color = '#fff'; }
              else if (isBlackout) { bg = 'var(--red-bg)'; color = 'var(--red)'; border = '1px solid #fca5a5'; }
              else if (isInRange || isHovInRange) { bg = 'var(--blue-light)'; color = 'var(--blue)'; }

              return (
                <button
                  key={key}
                  onClick={(e) => !isPast && handleDayClick(date, e)}
                  onMouseEnter={() => !isPast && !end && setHovered(date)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    padding: '7px 0', textAlign: 'center', border, borderRadius,
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
                </button>
              );
            })}
          </div>

          {start && end && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--blue-light)', borderRadius: 'var(--r-sm)', fontSize: 13, color: 'var(--blue)', fontWeight: 600 }}>
              ✈️ {formatDate(start)} → {formatDate(end)}
              {blackoutCount > 0 && ` · ${blackoutCount} day${blackoutCount > 1 ? 's' : ''} blacked out`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
