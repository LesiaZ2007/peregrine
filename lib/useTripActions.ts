'use client';
// Star and compare toggles shared by result slips, the trip sheet, the compare screen and the planner.
import { useCallback } from 'react';
import { EMPTY_SAVED, EMPTY_TRIPS, K, MAX_COMPARE, useStored, type SavedTrip } from './store';
import type { Currency, Trip } from './types';

export function useTripActions(currency: Currency) {
  const [starred, setStarred] = useStored<SavedTrip[]>(K.saved, EMPTY_SAVED);
  const [compare, setCompare] = useStored<Trip[]>(K.compare, EMPTY_TRIPS);

  const isStarred = useCallback((t: Trip) => starred.some((s) => s.trip.dest.id === t.dest.id), [starred]);
  const toggleStar = useCallback(
    (t: Trip) =>
      setStarred((list) =>
        list.some((s) => s.trip.dest.id === t.dest.id)
          ? list.filter((s) => s.trip.dest.id !== t.dest.id)
          : [{ key: t.key, savedAt: new Date().toISOString(), trip: t, currency }, ...list],
      ),
    [setStarred, currency],
  );
  const inCompare = useCallback((t: Trip) => compare.some((c) => c.key === t.key), [compare]);
  const toggleCompare = useCallback(
    (t: Trip) =>
      setCompare((list) =>
        list.some((c) => c.key === t.key) ? list.filter((c) => c.key !== t.key) : [...list, t].slice(-MAX_COMPARE),
      ),
    [setCompare],
  );
  return { starred, setStarred, isStarred, toggleStar, compare, setCompare, inCompare, toggleCompare };
}
