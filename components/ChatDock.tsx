'use client';
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_SPEC } from '@/lib/spec';
import { K, useStored } from '@/lib/store';
import type { SearchSpec } from '@/lib/types';
import MiniMarkdown from './MiniMarkdown';

interface Msg { role: 'user' | 'assistant'; content: string; patch?: Partial<SearchSpec> | null; used?: string[] }
const EMPTY: Msg[] = [];

/** Floating assistant. `context` is rebuilt by each page from what's on screen. */
export default function ChatDock({ context, prompts, onApply }: { context: () => string; prompts: string[]; onApply?: (patch: Partial<SearchSpec>) => void }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useStored<Msg[]>('pg:chat', EMPTY);
  const [spec] = useStored<SearchSpec>(K.spec, DEFAULT_SPEC);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs, open, busy]);

  async function ask(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next = [...msgs, { role: 'user' as const, content }].slice(-30);
    setMsgs(next);
    setQ('');
    setBusy(true);
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next.map(({ role, content: c }) => ({ role, content: c })), context: context(), spec }),
      });
      const j = await r.json();
      setMsgs([...next, { role: 'assistant', content: r.ok ? j.reply || '(no answer)' : j.message ?? 'Something went wrong.', patch: r.ok ? j.patch : null, used: r.ok ? j.used : undefined }]);
    } catch {
      setMsgs([...next, { role: 'assistant', content: 'Could not reach the assistant.' }]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="chat-fab" onClick={() => setOpen(true)} aria-label="Ask Peregrine">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4h14v9H8l-4 3v-3H3Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
        Ask
      </button>
    );
  }
  return (
    <section className="chat" aria-label="Trip assistant">
      <header>
        <b>Ask Peregrine</b>
        <span className="muted">compares what’s on screen</span>
        <button className="btn small ghost" onClick={() => setMsgs([])} title="Clear the conversation">Clear</button>
        <button className="btn small" onClick={() => setOpen(false)}>Close</button>
      </header>
      <div className="chat-log">
        {!msgs.length && (
          <div className="chat-empty">
            <p>Ask about your results, stars or compare list. For example:</p>
            <div className="chat-prompts">
              {prompts.map((p) => <button key={p} className="tag" onClick={() => ask(p)}>{p}</button>)}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            {m.used?.length ? <div className="chat-used">{m.used.join(' · ')}</div> : null}
            {m.role === 'assistant' ? <MiniMarkdown text={m.content} /> : <p>{m.content}</p>}
            {m.patch && (
              <div className="chat-patch">
                <code>{JSON.stringify(m.patch)}</code>
                {onApply ? (
                  <button className="btn small primary" onClick={() => onApply(m.patch!)}>Apply these settings</button>
                ) : (
                  <span className="muted">Open the planner to apply settings.</span>
                )}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="chat-msg assistant muted">Looking things up…</div>}
        <div ref={end} />
      </div>
      <form className="chat-in" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Which is better value, Porto or Seville?" aria-label="Message" />
        <button className="btn primary" disabled={busy || !q.trim()}>Send</button>
      </form>
      <p className="chat-foot muted">Answers come from an AI model (free Groq tier) reading your results. Check prices before booking.</p>
    </section>
  );
}
