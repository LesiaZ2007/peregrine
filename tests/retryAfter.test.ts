import { describe, expect, it } from 'vitest';
import { retryAfterSeconds } from '@/lib/retryAfter';

describe('retryAfterSeconds', () => {
  it('reads Groq’s seconds message', () => {
    const msg = 'Rate limit reached for model `openai/gpt-oss-120b` on tokens per minute (TPM): Limit 8000, Used 7651, Requested 6095. Please try again in 43.095s. Need more tokens?';
    expect(retryAfterSeconds(null, msg)).toBeCloseTo(43.095);
  });
  it('reads minutes and seconds', () => {
    expect(retryAfterSeconds(null, 'Please try again in 1m2.5s.')).toBeCloseTo(62.5);
  });
  it('prefers the retry-after header', () => {
    expect(retryAfterSeconds('12', 'Please try again in 43s')).toBe(12);
  });
  it('falls back to 30 seconds', () => {
    expect(retryAfterSeconds(null, 'busy')).toBe(30);
    expect(retryAfterSeconds('', 'busy')).toBe(30);
  });
});
