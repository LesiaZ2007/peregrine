// Bar charts the chat assistant asks for, drawn in the app's chart style.
// Spec: {"type":"bar","title","unit","labels":[...],"series":[{"name","values":[...]}],"stacked":bool}

export interface ChartSpec {
  type?: 'bar';
  title?: string;
  unit?: string;
  labels: string[];
  series: { name: string; values: number[] }[];
  stacked?: boolean;
}

const INKS = ['var(--m-flight)', 'var(--m-train)', 'var(--m-bus)', 'var(--m-ferry)', 'var(--m-rideshare)', 'var(--m-drive)'];

export function parseChart(raw: string): ChartSpec | null {
  try {
    const c = JSON.parse(raw) as ChartSpec;
    if (!Array.isArray(c.labels) || !Array.isArray(c.series) || !c.series.length) return null;
    c.series = c.series.filter((s) => Array.isArray(s.values)).slice(0, 6).map((s) => ({ name: String(s.name ?? ''), values: s.values.map((v) => (Number.isFinite(+v) ? +v : 0)) }));
    c.labels = c.labels.slice(0, 12).map(String);
    return c.series.length ? c : null;
  } catch {
    return null;
  }
}

export default function MiniChart({ chart }: { chart: ChartSpec }) {
  const { labels, series, stacked = false, unit = '', title } = chart;
  const rowH = stacked || series.length === 1 ? 22 : 12 * series.length + 6;
  const labelW = 92;
  const W = 380;
  const plotW = W - labelW - 54;
  const totals = labels.map((_, i) => (stacked ? series.reduce((s, x) => s + Math.max(0, x.values[i] ?? 0), 0) : Math.max(...series.map((x) => x.values[i] ?? 0))));
  const max = Math.max(1, ...totals);
  const H = labels.length * (rowH + 8) + 8;
  const fmt = (v: number) => `${unit}${Math.round(v).toLocaleString('en-GB')}`;

  return (
    <figure className="mini-chart">
      {title && <figcaption>{title}</figcaption>}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title ?? 'chart'}>
        {labels.map((label, i) => {
          const y = 6 + i * (rowH + 8);
          let x0 = labelW;
          return (
            <g key={label + i}>
              <text x={labelW - 6} y={y + rowH / 2 + 4} textAnchor="end" className="mc-label">{label.length > 14 ? `${label.slice(0, 13)}…` : label}</text>
              {series.map((s, k) => {
                const v = Math.max(0, s.values[i] ?? 0);
                const w = (v / max) * plotW;
                const bar = stacked
                  ? <rect key={k} x={x0} y={y} width={w} height={rowH} fill={INKS[k % INKS.length]} />
                  : <rect key={k} x={labelW} y={y + k * 12} width={w} height={10} fill={INKS[k % INKS.length]} />;
                if (stacked) x0 += w;
                return bar;
              })}
              <text x={(stacked ? x0 : labelW + (totals[i] / max) * plotW) + 5} y={y + rowH / 2 + 4} className="mc-value">{fmt(totals[i])}</text>
            </g>
          );
        })}
        <line x1={labelW} y1={2} x2={labelW} y2={H - 2} stroke="var(--ink)" strokeWidth="1" />
      </svg>
      {series.length > 1 && (
        <div className="mc-legend">
          {series.map((s, k) => <span key={s.name + k}><i style={{ background: INKS[k % INKS.length] }} />{s.name}</span>)}
        </div>
      )}
    </figure>
  );
}
