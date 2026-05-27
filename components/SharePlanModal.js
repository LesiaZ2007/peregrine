'use client';
import { useState } from 'react';
import { Share2, Copy, Check, X, ExternalLink } from 'lucide-react';
import { buildShareUrl } from '@/lib/share';

export default function SharePlanModal({ plan, onClose }) {
  const [copied, setCopied] = useState(false);
  const url = buildShareUrl(plan);

  const copyUrl = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: 'var(--blue-light)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Share2 size={17} color="var(--blue)" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: 16 }}>Share this trip plan</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Anyone with the link can view this search</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: 6 }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20 }}>
          {/* Plan summary */}
          {plan?.destinations && (
            <div style={{ padding: '10px 14px', background: 'var(--bg-2)', borderRadius: 'var(--r-sm)', marginBottom: 16, fontSize: 13 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                {plan.origins?.join(', ') || '?'} → {plan.destinations?.join(', ') || '?'}
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
                {plan.tripType} · {plan.start ? new Date(plan.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '?'}
                {plan.end ? ` → ${new Date(plan.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
              </div>
            </div>
          )}

          {/* URL display */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <div style={{
              flex: 1, padding: '10px 12px', background: 'var(--bg-2)',
              border: '1.5px solid var(--border-2)', borderRadius: 8,
              fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {url || 'Generating link…'}
            </div>
            <button
              onClick={copyUrl}
              className="btn btn-primary"
              style={{ flexShrink: 0, gap: 5, whiteSpace: 'nowrap' }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Open link */}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <ExternalLink size={14} />
              Open share page
            </a>
          )}

          <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 14, textAlign: 'center' }}>
            The link contains your full search — no account needed to view it
          </p>
        </div>
      </div>
    </div>
  );
}
