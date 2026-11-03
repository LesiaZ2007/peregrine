'use client';
import { geoConicConformal, geoGraticule10, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry, MultiLineString } from 'geojson';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import { haversine } from '@/lib/geo';
import type { HomeBase, Mode, Trip } from '@/lib/types';
import { MODE_LABEL, RouteSample, routeStyle } from './icons';

const W = 1000;
const H = 560;

let atlasPromise: Promise<{ land: FeatureCollection | Feature; borders: MultiLineString }> | null = null;
function loadAtlas() {
  atlasPromise ??= import('world-atlas/countries-50m.json').then((m) => {
    const topo = (m.default ?? m) as unknown as Topology<{ countries: GeometryCollection; land: GeometryCollection }>;
    return {
      land: feature(topo, topo.objects.land) as FeatureCollection<Geometry>,
      borders: mesh(topo, topo.objects.countries, (a, b) => a !== b) as MultiLineString,
    };
  });
  return atlasPromise;
}

export type ShapeLeg = { mode: 'train' | 'bus' | 'ferry' | 'local'; coords: [number, number][] };

interface Props {
  origins: HomeBase[];
  trips: Trip[];
  near?: Trip[];
  /** real track shapes for ground journeys, by trip key */
  shapes?: Record<string, ShapeLeg[] | null>;
  hot: string | null;
  setHot: (k: string | null) => void;
  open: (t: Trip) => void;
  title: string;
}

type SegMode = Mode | 'local';
interface Seg { mode: SegMode; d: string }

/** One stretch of a journey in its mode's chart style. */
function Stroke({ seg, hot }: { seg: Seg; hot: boolean }) {
  if (seg.mode === 'local') return <path d={seg.d} fill="none" stroke="var(--ink-3)" strokeWidth={hot ? 1.6 : 1.1} strokeDasharray="1.5 3" />;
  const s = routeStyle(seg.mode);
  const c = `var(--m-${seg.mode})`;
  return (
    <>
      {s.double ? (
        <>
          <path d={seg.d} fill="none" stroke={c} strokeWidth={hot ? 5 : 4} />
          <path d={seg.d} fill="none" stroke="var(--land)" strokeWidth={hot ? 2.4 : 1.8} />
        </>
      ) : (
        <path d={seg.d} fill="none" stroke={c} strokeWidth={s.width + (hot ? 1.2 : 0)} strokeDasharray={s.dash} strokeLinecap={seg.mode === 'ferry' ? 'round' : 'butt'} strokeLinejoin="round" />
      )}
      {s.ties && <path d={seg.d} fill="none" stroke={c} strokeWidth={6} strokeDasharray="1.2 7" />}
    </>
  );
}

export default function RouteChart({ origins, trips, near = [], shapes = {}, hot, setHot, open, title }: Props) {
  const [atlas, setAtlas] = useState<Awaited<ReturnType<typeof loadAtlas>> | null>(null);
  useEffect(() => {
    let live = true;
    loadAtlas().then((a) => live && setAtlas(a));
    return () => { live = false; };
  }, []);

  // ── pan & zoom: a transform on the map group; strokes and markers keep their size ──
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const drag = useRef<{ id: number; sx: number; sy: number; vx: number; vy: number; moved: boolean } | null>(null);
  const pinch = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ d: number; k: number; cx: number; cy: number; vx: number; vy: number } | null>(null);
  const suppressClick = useRef(false);
  const toSvg = useCallback((cx: number, cy: number) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return { x: ((cx - r.left) / r.width) * W, y: ((cy - r.top) / r.height) * H };
  }, []);
  const zoomAt = useCallback((px: number, py: number, factor: number) => {
    setView((v) => {
      const k = Math.min(24, Math.max(1, v.k * factor));
      const f = k / v.k;
      const x = px - (px - v.x) * f;
      const y = py - (py - v.y) * f;
      return k === 1 ? { k: 1, x: 0, y: 0 } : { k, x, y };
    });
  }, []);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = toSvg(e.clientX, e.clientY);
      zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [toSvg, zoomAt]);
  // a new set of results starts from the full view
  const tripsKey = trips.map((t) => t.key).join(',');
  const [lastKey, setLastKey] = useState(tripsKey);
  if (lastKey !== tripsKey) { setLastKey(tripsKey); setView({ k: 1, x: 0, y: 0 }); }

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current.size === 2) {
      const [a, b] = [...pinch.current.values()];
      const c = toSvg((a.x + b.x) / 2, (a.y + b.y) / 2);
      pinchStart.current = { d: Math.hypot(a.x - b.x, a.y - b.y), k: view.k, cx: c.x, cy: c.y, vx: view.x, vy: view.y };
      drag.current = null;
      return;
    }
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false };
    suppressClick.current = false;
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (pinch.current.has(e.pointerId)) pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pinch.current.values()];
      const ps = pinchStart.current;
      const k = Math.min(24, Math.max(1, ps.k * (Math.hypot(a.x - b.x, a.y - b.y) / ps.d)));
      const f = k / ps.k;
      setView(k === 1 ? { k: 1, x: 0, y: 0 } : { k, x: ps.cx - (ps.cx - ps.vx) * f, y: ps.cy - (ps.cy - ps.vy) * f });
      suppressClick.current = true;
      return;
    }
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const r = svgRef.current!.getBoundingClientRect();
    const dx = ((e.clientX - d.sx) / r.width) * W;
    const dy = ((e.clientY - d.sy) / r.height) * H;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 4) {
      d.moved = true;
      svgRef.current?.setPointerCapture(e.pointerId);
    }
    if (d.moved && view.k > 1) setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }));
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pinch.current.delete(e.pointerId);
    if (pinch.current.size < 2) pinchStart.current = null;
    if (drag.current?.moved) suppressClick.current = true;
    drag.current = null;
  };
  /** marker transform that cancels the zoom so dots and labels stay the same size */
  const pin = (x: number, y: number) => `translate(${x},${y}) scale(${1 / view.k})`;
  const guard = (fn: () => void) => () => { if (suppressClick.current) { suppressClick.current = false; return; } fn(); };

  const shown = trips.slice(0, 40);
  const { path, project, extent } = useMemo(() => {
    const pts: [number, number][] = [
      ...origins.map((o) => [o.lon, o.lat] as [number, number]),
      ...shown.map((t) => [t.dest.lon, t.dest.lat] as [number, number]),
      ...near.slice(0, 25).map((t) => [t.dest.lon, t.dest.lat] as [number, number]),
    ];
    if (!pts.length) pts.push([10, 48], [-5, 40], [25, 58]);
    if (pts.length === 1) pts.push([pts[0][0] + 4, pts[0][1] + 3], [pts[0][0] - 4, pts[0][1] - 3]);
    const lats = pts.map((p) => p[1]);
    const lons = pts.map((p) => p[0]);
    const lat0 = Math.min(...lats);
    const lat1 = Math.max(...lats);
    const lonC = (Math.min(...lons) + Math.max(...lons)) / 2;
    const p1 = lat0 + (lat1 - lat0) / 6;
    const p2 = lat1 - (lat1 - lat0) / 6;
    const proj = geoConicConformal()
      .rotate([-lonC, 0])
      .parallels([p1 === p2 ? p1 - 1 : p1, p1 === p2 ? p2 + 1 : p2])
      .fitExtent([[60, 60], [W - 60, H - 60]], { type: 'MultiPoint', coordinates: pts });
    return {
      path: geoPath(proj),
      project: (lon: number, lat: number) => proj([lon, lat]) ?? [0, 0],
      extent: { lat0, lat1 },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origins, trips, near]);

  const grat = useMemo(() => path(geoGraticule10()) ?? '', [path]);
  const line = (coords: [number, number][]) => path({ type: 'LineString', coordinates: coords }) ?? '';
  /** a flight as a gentle arc between two airports, bowing away from the equator like a great circle */
  const arc = (a: [number, number], b: [number, number]) => {
    const [ax, ay] = project(a[0], a[1]);
    const [bx, by] = project(b[0], b[1]);
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const len = Math.hypot(bx - ax, by - ay);
    let nx = -(by - ay) / (len || 1);
    let ny = (bx - ax) / (len || 1);
    if (ny > 0) { nx = -nx; ny = -ny; } // bow upwards (north on the chart)
    const bend = Math.min(90, len * 0.18);
    return `M${ax},${ay} Q${mx + nx * bend},${my + ny * bend} ${bx},${by}`;
  };
  /** How to draw one trip: real tracks if we have them, arcs for flights, straight lines otherwise. */
  const segmentsFor = (t: Trip): Seg[] => {
    const b = t.best;
    const shape = shapes[t.key];
    if (shape?.length && (b.mode === 'train' || b.mode === 'bus' || b.mode === 'ferry')) {
      return shape.map((l) => ({ mode: l.mode as SegMode, d: line(l.coords) }));
    }
    if (b.mode === 'flight' && b.path && b.path.length >= 4) {
      const pts = b.path;
      const ground = (b.legs?.find((l) => l.mode === 'train' || l.mode === 'bus')?.mode ?? 'bus') as SegMode;
      const lastIsFerry = b.legs?.[b.legs.length - 1]?.mode === 'ferry';
      const segs: Seg[] = [];
      for (let k = 0; k < pts.length - 1; k++) {
        const a = pts[k];
        const z = pts[k + 1];
        if (k === 1) segs.push({ mode: 'flight', d: arc(a, z) });
        else if (lastIsFerry && k === pts.length - 2) segs.push({ mode: 'ferry', d: line([a, z]) });
        else segs.push({ mode: haversine(a[1], a[0], z[1], z[0]) > 25 ? ground : 'local', d: line([a, z]) });
      }
      return segs;
    }
    return [{ mode: b.mode, d: line([[t.originLon, t.originLat], [t.dest.lon, t.dest.lat]]) }];
  };
  const modesShown = [...new Set(shown.map((t) => t.best.mode))];
  // label the best results, skipping any label that would collide with one already placed
  const labelled = useMemo(() => {
    const boxes: [number, number, number, number][] = origins.map((o) => {
      const [x, y] = project(o.lon, o.lat);
      return [x - 12, y - 24, x + 14 + o.label.length * 10, y + 12];
    });
    const keep = new Set<string>();
    for (const t of shown.slice(0, 16)) {
      if (keep.size >= 10) break;
      const [x, y] = project(t.dest.lon, t.dest.lat);
      const box: [number, number, number, number] = [x - 6, y - 10, x + 30 + t.dest.name.length * 7.4, y + 8];
      if (boxes.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
      boxes.push(box);
      keep.add(t.key);
    }
    return keep;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, trips, origins]);

  return (
    <div className="chart-frame">
      <svg
        ref={svgRef}
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Map of routes to the results. Scroll to zoom, drag to move."
        data-zoomed={view.k > 1}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={(e) => { const p = toSvg(e.clientX, e.clientY); zoomAt(p.x, p.y, 2); }}
      >
        <defs>
          <clipPath id="frame"><rect x="0" y="0" width={W} height={H} /></clipPath>
        </defs>
        <g clipPath="url(#frame)">
        <g className="zoomable" transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          {atlas && <path className="land" d={path(atlas.land as Feature) ?? ''} />}
          {atlas && <path className="borders" d={path(atlas.borders) ?? ''} />}
          <path className="graticule" d={grat} />

          {/* near misses: greyed, behind everything */}
          {near.slice(0, 25).map((t) => {
            const d = path({ type: 'LineString', coordinates: [[t.originLon, t.originLat], [t.dest.lon, t.dest.lat]] }) ?? '';
            const [x, y] = project(t.dest.lon, t.dest.lat);
            const isHot = hot === t.key;
            return (
              <g key={`n-${t.key}`} opacity={isHot ? 0.95 : 0.4} style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHot(t.key)} onMouseLeave={() => setHot(null)} onClick={guard(() => open(t))}>
                <path d={d} fill="none" stroke="var(--rule-2)" strokeWidth={isHot ? 2 : 1.2} strokeDasharray="3 4" />
                <g transform={pin(x, y)}>
                  <circle r={isHot ? 6.5 : 4.5} fill="var(--paper-3)" stroke="var(--rule-2)" strokeWidth={1.6} />
                  {isHot && (
                    <text x={10} y={4} style={{ font: '600 13px var(--f-sans)', fill: 'var(--ink-2)', paintOrder: 'stroke', stroke: 'var(--sea)', strokeWidth: 4 }}>
                      {t.dest.name} · just outside
                    </text>
                  )}
                </g>
              </g>
            );
          })}

          {/* routes, drawn back to front so the best ones sit on top */}
          {[...shown].reverse().map((t) => {
            const isHot = hot === t.key;
            const op = hot && !isHot ? 0.22 : 0.92;
            return (
              <g key={t.key} opacity={op} data-mode={t.best.mode}>
                {segmentsFor(t).map((seg, k) => <Stroke key={k} seg={seg} hot={isHot} />)}
              </g>
            );
          })}

          {/* destinations */}
          {shown.map((t, i) => {
            const [x, y] = project(t.dest.lon, t.dest.lat);
            const isHot = hot === t.key;
            const showLabel = labelled.has(t.key) || isHot || view.k >= 2.5;
            return (
              <g
                key={t.key}
                transform={pin(x, y)}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHot(t.key)}
                onMouseLeave={() => setHot(null)}
                onClick={guard(() => open(t))}
              >
                <circle r={isHot ? 8 : 5.5} fill="var(--paper-2)" stroke={`var(--m-${t.best.mode})`} strokeWidth={isHot ? 3 : 2.2} />
                {showLabel && (
                  <text x={10} y={4} className="chart-label" style={{ font: `${isHot ? 700 : 600} ${isHot ? 15 : 12.5}px var(--f-sans)`, fill: 'var(--ink)', paintOrder: 'stroke', stroke: 'var(--sea)', strokeWidth: 4, strokeLinejoin: 'round' }}>
                    <tspan style={{ fontFamily: 'var(--f-mono)', fill: 'var(--accent)', fontSize: 11 }}>{String(i + 1).padStart(2, '0')} </tspan>
                    {t.dest.name}
                  </text>
                )}
              </g>
            );
          })}

          {/* home bases: chart waypoint symbol */}
          {origins.map((o) => {
            const [x, y] = project(o.lon, o.lat);
            return (
              <g key={o.label} transform={pin(x, y)}>
                <path d="M0 -11 9.5 -5.5 9.5 5.5 0 11 -9.5 5.5 -9.5 -5.5Z" fill="var(--ink)" stroke="var(--paper-2)" strokeWidth="2" />
                <circle r="3" fill="var(--paper-2)" />
                <text x={14} y={-8} style={{ font: '800 14px var(--f-sans)', fontStretch: '115%', textTransform: 'uppercase', letterSpacing: '0.06em', fill: 'var(--ink)', paintOrder: 'stroke', stroke: 'var(--sea)', strokeWidth: 4 }}>
                  {o.label}
                </text>
              </g>
            );
          })}
        </g>
        </g>
        {/* neatline ticks every 50 px, like a chart border */}
        <g className="ticks">
          {Array.from({ length: W / 50 - 1 }, (_, i) => (i + 1) * 50).map((x) => (
            <g key={`t${x}`}><line x1={x} y1={0} x2={x} y2={x % 250 ? 5 : 10} /><line x1={x} y1={H} x2={x} y2={H - (x % 250 ? 5 : 10)} /></g>
          ))}
          {Array.from({ length: Math.floor(H / 50) }, (_, i) => (i + 1) * 50).map((y) => (
            <g key={`l${y}`}><line x1={0} y1={y} x2={y % 250 ? 5 : 10} y2={y} /><line x1={W} y1={y} x2={W - (y % 250 ? 5 : 10)} y2={y} /></g>
          ))}
        </g>
      </svg>
      <div className="chart-zoom" role="group" aria-label="Map zoom">
        <button type="button" onClick={() => zoomAt(W / 2, H / 2, 1.6)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoomAt(W / 2, H / 2, 1 / 1.6)} aria-label="Zoom out">−</button>
        <button type="button" onClick={() => setView({ k: 1, x: 0, y: 0 })} aria-label="Reset map" disabled={view.k === 1}>⟲</button>
      </div>
      <div className="chart-title">
        <b>{title}</b>
        <span>LAMBERT CONFORMAL · {Math.round(extent.lat0)}°–{Math.round(extent.lat1)}°</span>
      </div>
      {modesShown.length > 0 && (
        <div className="chart-legend" aria-label="Legend">
          {modesShown.map((m) => (
            <div key={m} data-mode={m}><RouteSample mode={m} /> {MODE_LABEL[m]}</div>
          ))}
        </div>
      )}
    </div>
  );
}
