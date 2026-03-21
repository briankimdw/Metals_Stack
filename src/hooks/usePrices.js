import { useState, useEffect, useCallback } from 'react';
import { METALS } from '../utils/constants';

const CACHE_KEY = 'metal-stacker-prices';
const CACHE_TS_KEY = 'metal-stacker-prices-updated';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const getDefaultPrices = () =>
  Object.fromEntries(
    Object.entries(METALS).map(([key, m]) => [key, m.defaultPrice]),
  );

const getCachedPrices = () => {
  try {
    const saved = localStorage.getItem(CACHE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return getDefaultPrices();
};

const isCacheStale = () => {
  try {
    const ts = localStorage.getItem(CACHE_TS_KEY);
    if (!ts) return true;
    return Date.now() - new Date(ts).getTime() > ONE_DAY_MS;
  } catch {
    return true;
  }
};

export function usePrices() {
  const [prices, setPrices] = useState(getCachedPrices);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(
    () => localStorage.getItem(CACHE_TS_KEY) || null,
  );

  const loadPrices = useCallback(async (force = false) => {
    // Skip if cache is fresh (unless forced)
    if (!force && !isCacheStale()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/prices');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const newPrices = {
        gold: data.gold ?? prices.gold,
        silver: data.silver ?? prices.silver,
        platinum: data.platinum ?? prices.platinum,
        palladium: data.palladium ?? prices.palladium,
      };

      setPrices(newPrices);
      setLastUpdated(data.timestamp);
      localStorage.setItem(CACHE_KEY, JSON.stringify(newPrices));
      localStorage.setItem(CACHE_TS_KEY, data.timestamp);
    } catch (e) {
      console.warn('Failed to fetch live prices, using cached/defaults:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrices();
  }, [loadPrices]);

  // Force refresh (bypasses 24hr cache)
  const fetchPrices = useCallback(() => loadPrices(true), [loadPrices]);

  return { prices, loading, lastUpdated, fetchPrices };
}
