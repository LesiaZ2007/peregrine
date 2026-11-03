import type { Mode } from '@/lib/types';

/** Peregrine mark: a chart waypoint (hexagon + dot) crossed by a stooping flight line. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M16 3.5 26.8 9.75v12.5L16 28.5 5.2 22.25V9.75Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="16" r="2.6" fill="currentColor" />
      <path d="M3 6.5 13.6 13.9" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
      <path d="M18.4 18.1 29 25.5" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  );
}

export const MODE_LABEL: Record<Mode, string> = {
  flight: 'Fly', train: 'Train', bus: 'Coach', ferry: 'Ferry', rideshare: 'Rideshare', drive: 'Drive',
};
export const MODE_HINT: Record<Mode, string> = {
  flight: 'real fares only',
  train: 'day and night trains',
  bus: 'FlixBus-style coaches',
  ferry: 'boats to islands & across seas',
  rideshare: 'a seat in someone’s car',
  drive: 'you have a car',
};

/** The cartographic line style for each mode, as stroke props. Shared by the chart and legend. */
export function routeStyle(mode: Mode): { dash?: string; width: number; ties?: boolean; double?: boolean } {
  switch (mode) {
    case 'flight': return { dash: '7 4', width: 1.6 };
    case 'train': return { width: 2, ties: true };
    case 'bus': return { width: 2 };
    case 'ferry': return { dash: '1.5 3.5', width: 2.2 };
    case 'rideshare': return { dash: '8 3 2 3', width: 1.8 };
    case 'drive': return { width: 1.2, double: true };
  }
}

/** A short sample of the mode's route line, like a chart legend entry. */
export function RouteSample({ mode, className }: { mode: Mode; className?: string }) {
  const s = routeStyle(mode);
  const c = `var(--m-${mode})`;
  return (
    <svg viewBox="0 0 34 10" className={className ?? 'route'} aria-hidden="true">
      {s.double ? (
        <>
          <line x1="1" y1="3.2" x2="33" y2="3.2" stroke={c} strokeWidth={s.width} />
          <line x1="1" y1="6.8" x2="33" y2="6.8" stroke={c} strokeWidth={s.width} />
        </>
      ) : (
        <line x1="1" y1="5" x2="33" y2="5" stroke={c} strokeWidth={s.width} strokeDasharray={s.dash} strokeLinecap={mode === 'ferry' ? 'round' : 'butt'} />
      )}
      {s.ties && [5, 12, 19, 26].map((x) => <line key={x} x1={x} y1="2" x2={x} y2="8" stroke={c} strokeWidth="1.2" />)}
    </svg>
  );
}

/** Small glyphs for line badges. Drawn in one weight, white on the mode colour. */
export function ModeGlyph({ mode }: { mode: Mode }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      {mode === 'flight' && <path {...p} d="M2 9.5 14 4.5M6.5 7.6 5 3.5h1.6l3.4 2.7M6.6 11.8 8 8.9M3.5 9 2.5 7" />}
      {mode === 'train' && (<><rect {...p} x="4" y="2" width="8" height="9" rx="2" /><path {...p} d="M4 7h8M6 14l1-3M10 14l-1-3" /></>)}
      {mode === 'bus' && (<><rect {...p} x="2.5" y="3" width="11" height="8" rx="1.5" /><path {...p} d="M2.5 7.5h11M5 13v-2M11 13v-2" /></>)}
      {mode === 'ferry' && <path {...p} d="M2 10.5h12l-2 3H4ZM4 10.5V7h8v3.5M7 7V4h3" />}
      {mode === 'rideshare' && (<><circle {...p} cx="5.5" cy="5" r="2" /><circle {...p} cx="10.5" cy="5" r="2" /><path {...p} d="M2 13c.5-2.5 2-3.5 3.5-3.5S8.5 10 9 13M7 13c.5-2.5 2-3.5 3.5-3.5S13.5 10 14 13" /></>)}
      {mode === 'drive' && (<><path {...p} d="M2.5 10V8l1.5-3.5h8L13.5 8v2Z" /><circle {...p} cx="5" cy="11.5" r="1.3" /><circle {...p} cx="11" cy="11.5" r="1.3" /></>)}
    </svg>
  );
}

/** All the kinds of transport a journey uses, in order ("COACH + FLY + COACH"). */
export function ModeChain({ option }: { option: { mode: Mode; legs?: { mode: Mode }[] } }) {
  const seq = (option.legs?.map((l) => l.mode) ?? [option.mode]).filter((m, i, a) => i === 0 || a[i - 1] !== m);
  if (seq.length === 1) return <LineBadge mode={seq[0]} />;
  return (
    <span className="mode-chain" title={seq.map((m) => MODE_LABEL[m]).join(' + ')}>
      {seq.map((m, i) => (
        <span key={i} className="mode-chain-item">
          {i > 0 && <span className="plus" aria-hidden="true">+</span>}
          <LineBadge mode={m} />
        </span>
      ))}
    </span>
  );
}

export function LineBadge({ mode, children }: { mode: Mode; children?: React.ReactNode }) {
  return (
    <span className="line-badge" data-mode={mode}>
      <ModeGlyph mode={mode} />
      {children ?? MODE_LABEL[mode]}
    </span>
  );
}
