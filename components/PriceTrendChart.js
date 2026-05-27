'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';

function formatTimestamp(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatPrice(p) {
  return `$${Math.round(p).toLocaleString()}`;
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border-2)', borderRadius: 8, padding: '8px 12px', boxShadow: 'var(--shadow-md)', fontSize: 13 }}>
      <div style={{ fontWeight: 700, color: 'var(--blue)' }}>{formatPrice(d.value)}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{d.payload.dateLabel}</div>
    </div>
  );
};

/**
 * @param {Array<{price, timestamp}>} history - from lib/priceHistory
 * @param {number} currentPrice
 */
export default function PriceTrendChart({ history = [], currentPrice }) {
  if (history.length < 2) {
    return (
      <div style={{ padding: '24px 16px', textAlign: 'center', background: 'var(--bg-2)', borderRadius: 'var(--r)', border: '1.5px dashed var(--border-2)' }}>
        <BarChart2 size={28} color="var(--text-light)" style={{ marginBottom: 8 }} />
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>No price history yet</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Peregrine builds a price trend chart as you revisit this route.<br />
          Come back tomorrow to see if prices changed.
        </div>
      </div>
    );
  }

  const data = history.map(h => ({
    price: h.price,
    timestamp: h.timestamp,
    dateLabel: formatTimestamp(h.timestamp),
  }));

  const prices = data.map(d => d.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const first = data[0].price;
  const last  = data[data.length - 1].price;
  const trendPct = Math.round(((last - first) / first) * 100);
  const isUp = trendPct > 0;

  return (
    <div>
      {/* Trend header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>
          Price trend ({history.length} samples)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: isUp ? 'var(--red)' : 'var(--green)' }}>
          {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {isUp ? '+' : ''}{trendPct}% since first recorded
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 10, fill: 'var(--text-light)' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[minP * 0.97, maxP * 1.03]}
            tickFormatter={v => `$${Math.round(v / 100) * 100}`}
            tick={{ fontSize: 10, fill: 'var(--text-light)' }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          {currentPrice && (
            <ReferenceLine
              y={currentPrice}
              stroke="var(--blue)"
              strokeDasharray="5 3"
              label={{ value: 'Now', fill: 'var(--blue)', fontSize: 10, position: 'insideTopRight' }}
            />
          )}
          <Line
            type="monotone"
            dataKey="price"
            stroke={isUp ? 'var(--red)' : 'var(--green)'}
            strokeWidth={2.5}
            dot={{ r: 3, fill: isUp ? 'var(--red)' : 'var(--green)', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
