'use client';
// Tiny localStorage-backed stores. Everything personal stays on this device.
import { useCallback, useSyncExternalStore } from 'react';
import type { SearchSpec, Trip } from './types';

const listeners = new Map<string, Set<() => void>>();
const memo = new Map<string, { raw: string | null; val: unknown }>();

function read<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return fallback;
  }
  const m = memo.get(key);
  if (m && m.raw === raw) return m.val as T;
  let val: T = fallback;
  try {
    if (raw != null) val = JSON.parse(raw) as T;
  } catch {
    // ignore bad data
  }
  memo.set(key, { raw, val });
  return val;
}

export function write<T>(key: string, val: T) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // storage full or blocked: keep going in memory
    memo.set(key, { raw: JSON.stringify(val), val });
  }
  listeners.get(key)?.forEach((l) => l());
}

export function useStored<T>(key: string, fallback: T): [T, (v: T | ((p: T) => T)) => void] {
  const subscribe = useCallback(
    (cb: () => void) => {
      const set = listeners.get(key) ?? new Set();
      set.add(cb);
      listeners.set(key, set);
      const onStorage = (e: StorageEvent) => e.key === key && cb();
      window.addEventListener('storage', onStorage);
      return () => {
        set.delete(cb);
        window.removeEventListener('storage', onStorage);
      };
    },
    [key],
  );
  const val = useSyncExternalStore(subscribe, () => read(key, fallback), () => fallback);
  const set = useCallback(
    (v: T | ((p: T) => T)) => write(key, typeof v === 'function' ? (v as (p: T) => T)(read(key, fallback)) : v),
    [key, fallback],
  );
  return [val, set];
}

export interface SavedTrip {
  key: string;
  savedAt: string;
  trip: Trip;
  currency: SearchSpec['currency'];
}
export interface SavedPreset {
  id: string;
  name: string;
  spec: SearchSpec;
}

export const K = {
  spec: 'pg:spec',
  saved: 'pg:saved',
  presets: 'pg:presets',
  visited: 'pg:visited',
  wishlist: 'pg:wishlist',
} as const;

export const EMPTY_SAVED: SavedTrip[] = [];
export const EMPTY_PRESETS: SavedPreset[] = [];
export const EMPTY_IDS: string[] = [];
