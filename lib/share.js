/**
 * share.js
 * Serialize a trip plan (search params + selected flights) into a URL-safe
 * base64 string for shareable links. No database required — the full state
 * is encoded in the URL.
 */

/**
 * Encode a plan object into a URL-safe base64 share ID.
 */
export function encodePlan(plan) {
  try {
    const json = JSON.stringify(plan);
    if (typeof window !== 'undefined') {
      return btoa(unescape(encodeURIComponent(json)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }
    return Buffer.from(json, 'utf8').toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch {
    return null;
  }
}

/**
 * Decode a share ID back into a plan object.
 */
export function decodePlan(id) {
  try {
    const base64 = id.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    let json;
    if (typeof window !== 'undefined') {
      json = decodeURIComponent(escape(atob(padded)));
    } else {
      json = Buffer.from(padded, 'base64').toString('utf8');
    }
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Build a shareable URL for a plan.
 */
export function buildShareUrl(plan) {
  const id = encodePlan(plan);
  if (!id) return null;
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
  return `${base}/share/${id}`;
}

/**
 * Copy a URL to the clipboard (client-side only).
 */
export async function copyToClipboard(text) {
  if (typeof navigator === 'undefined') return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  }
}
