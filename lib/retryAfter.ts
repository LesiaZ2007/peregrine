/** Seconds to wait after a rate-limited reply: the retry-after header, else Groq's
 *  "Please try again in 43.095s" / "1m2.5s" text, else 30. */
export function retryAfterSeconds(header: string | null, message: string): number {
  const h = Number(header);
  if (header && Number.isFinite(h) && h > 0) return h;
  const m = message.match(/try again in\s+(?:(\d+)m)?\s*([\d.]+)s/i);
  return m ? Number(m[1] ?? 0) * 60 + Number(m[2]) : 30;
}
