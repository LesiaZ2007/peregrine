'use client';
import { useState, useEffect } from 'react';
import { Zap, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Loader } from 'lucide-react';
import { scoreColor } from '@/lib/heuristics';

/**
 * AI + heuristics price recommendation card.
 * @param {object} heuristicResult - from lib/heuristics.js scoreFlight()
 * @param {boolean} [fetchAI=true]   - whether to call Groq for AI summary
 */
export default function PeregrineInsight({ heuristicResult, fetchAI = true }) {
  const [aiData, setAiData] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!heuristicResult || !fetchAI) return;
    setLoadingAI(true);
    setAiError(null);
    fetch('/api/ai/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ heuristicResult }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.message || d.error);
        setAiData(d.data);
      })
      .catch(err => setAiError(err.message))
      .finally(() => setLoadingAI(false));
  }, [heuristicResult, fetchAI]);

  if (!heuristicResult) return null;

  const { recommendation, confidence, direction, signals, score } = heuristicResult;
  const colors = scoreColor(recommendation);

  const DirectionIcon = direction === '↑' ? TrendingUp : direction === '↓' ? TrendingDown : Minus;
  const dirColor = direction === '↑' ? 'var(--red)' : direction === '↓' ? 'var(--green)' : 'var(--text-muted)';

  return (
    <div style={{
      border: `1.5px solid ${colors.border}`,
      borderRadius: 'var(--r)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ background: colors.bg, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, background: colors.color + '22', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Zap size={16} color={colors.color} />
        </div>
        <div style={{ flex: 1 }}>
          {/* AI summary or heuristic fallback */}
          {loadingAI && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13 }}>
              <Loader size={13} className="loading" /> Peregrine is analyzing prices…
            </div>
          )}
          {!loadingAI && (aiData?.summary || (
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              Peregrine recommends: <strong style={{ color: colors.color }}>{recommendation}</strong>
            </span>
          ))}
          {aiData?.summary && !loadingAI && (
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{aiData.summary}</div>
          )}
        </div>

        {/* Score pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: colors.color, letterSpacing: '.04em', textTransform: 'uppercase' }}>
              {recommendation}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{confidence}% confidence</div>
          </div>
          <DirectionIcon size={18} color={dirColor} />
        </div>
      </div>

      {/* AI reasoning / expand */}
      {(aiData?.reasoning || aiData?.buyWindow) && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: 'var(--surface)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}
          >
            <span>Why? {aiData.buyWindow && `· ${aiData.buyWindow}`}</span>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {expanded && (
            <div style={{ padding: '0 16px 14px', background: 'var(--surface)' }}>
              {aiData.reasoning && <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>{aiData.reasoning}</p>}
            </div>
          )}
        </>
      )}

      {/* Heuristic signals (always shown as compact list) */}
      <div style={{ padding: '10px 16px', background: 'var(--surface-2)', borderTop: `1px solid ${colors.border}` }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[
            { label: 'Booking window', value: signals?.bookingWindow?.signal?.replace('_', ' ') },
            { label: 'Season', value: signals?.seasonality?.signal?.replace('_', ' ') },
            { label: 'Day of week', value: signals?.dayOfWeek?.reason?.split(' ')[0] + ' flight' },
            signals?.priceTrend?.direction !== 'unknown' && { label: 'Price trend', value: signals?.priceTrend?.direction + (signals?.priceTrend?.pct ? ` ${signals.priceTrend.pct}%` : '') },
          ].filter(Boolean).map(({ label, value }) => value && (
            <div key={label} style={{ fontSize: 11, padding: '3px 8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-full)', color: 'var(--text-muted)' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-2)' }}>{label}:</span> {value}
            </div>
          ))}
        </div>
      </div>

      {aiError && (
        <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
          AI summary unavailable (GROQ_API_KEY needed) · Using heuristic analysis only
        </div>
      )}
    </div>
  );
}
