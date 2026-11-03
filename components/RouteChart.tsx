'use client';
import { geoConicConformal, geoGraticule10, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry, MultiLineString } from 'geojson';
import { useEffect, useMemo, useState } from 'react';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { HomeBase, Trip } from '@/lib/types';
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

interface Props {
  origins: HomeBase[];
  trips: Trip[];
  hot: string | null;
  setHot: (k: string | null) => void;
  open: (t: Trip) => void;
  title: string;
}

export default function RouteChart({ origins, trips, hot, setHot, open, title }: Props) {
  const [atlas, setAtlas] = useState<Awaited<ReturnType<typeof loadAtlas>> | null>(null);
  useEffect(() => {
    let live = true;
    loadAtlas().then((a) => live && setAtlas(a));
    return () => { live = false; };
  }, []);

  const shown = trips.slice(0, 40);
  const { path, project, extent } = useMemo(() => {
    const pts: [number, number][] = [
      ...origins.map((o) => [o.lon, o.lat] as [number, number]),
      ...shown.map((t) => [t.dest.lon, t.dest.lat] as [number, number]),
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
  }, [origins, trips]);

  const grat = useMemo(() => path(geoGraticule10()) ?? '', [path]);
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
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Map of routes to the results">
        <defs>
          <clipPath id="frame"><rect x="0" y="0" width={W} height={H} /></clipPath>
        </defs>
        <g clipPath="url(#frame)">
          {atlas && <path className="land" d={path(atlas.land as Feature) ?? ''} />}
          {atlas && <path className="borders" d={path(atlas.borders) ?? ''} />}
          <path className="graticule" d={grat} />

          {/* routes, drawn back to front so the best ones sit on top */}
          {[...shown].reverse().map((t) => {
            const s = routeStyle(t.best.mode);
            const d = path({ type: 'LineString', coordinates: [[t.originLon, t.originLat], [t.dest.lon, t.dest.lat]] }) ?? '';
            const c = `var(--m-${t.best.mode})`;
            const isHot = hot === t.key;
            const op = hot && !isHot ? 0.25 : 0.9;
            return (
              <g key={t.key} opacity={op} data-mode={t.best.mode}>
                {s.double ? (
                  <>
                    <path d={d} fill="none" stroke={c} strokeWidth={isHot ? 5 : 4} />
                    <path d={d} fill="none" stroke="var(--land)" strokeWidth={isHot ? 2.4 : 1.8} />
                  </>
                ) : (
                  <path d={d} fill="none" stroke={c} strokeWidth={s.width + (isHot ? 1.2 : 0)} strokeDasharray={s.dash} strokeLinecap={t.best.mode === 'ferry' ? 'round' : 'butt'} />
                )}
                {s.ties && <path d={d} fill="none" stroke={c} strokeWidth={6} strokeDasharray="1.2 7" />}
              </g>
            );
          })}

          {/* destinations */}
          {shown.map((t, i) => {
            const [x, y] = project(t.dest.lon, t.dest.lat);
            const isHot = hot === t.key;
            const showLabel = labelled.has(t.key) || isHot;
            return (
              <g
                key={t.key}
                transform={`translate(${x},${y})`}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHot(t.key)}
                onMouseLeave={() => setHot(null)}
                onClick={() => open(t)}
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
              <g key={o.label} transform={`translate(${x},${y})`}>
                <path d="M0 -11 9.5 -5.5 9.5 5.5 0 11 -9.5 5.5 -9.5 -5.5Z" fill="var(--ink)" stroke="var(--paper-2)" strokeWidth="2" />
                <circle r="3" fill="var(--paper-2)" />
                <text x={14} y={-8} style={{ font: '800 14px var(--f-sans)', fontStretch: '115%', textTransform: 'uppercase', letterSpacing: '0.06em', fill: 'var(--ink)', paintOrder: 'stroke', stroke: 'var(--sea)', strokeWidth: 4 }}>
                  {o.label}
                </text>
              </g>
            );
          })}
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
