import { useState, useEffect, useCallback } from 'react';
import { METALS } from '../utils/constants';

const CACHE_KEY = 'metal-stacker-prices';
const CACHE_TS_KEY = 'metal-stacker-prices-updated';

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

export function usePrices() {
  const [prices, setPrices] = useState(getCachedPrices);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(
    () => localStorage.getItem(CACHE_TS_KEY) || null,
  );

  const loadPrices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/prices.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.latest) {
        const { timestamp, ...metalPrices } = data.latest;
        setPrices(metalPrices);
        setLastUpdated(timestamp);
        localStorage.setItem(CACHE_KEY, JSON.stringify(metalPrices));
        localStorage.setItem(CACHE_TS_KEY, timestamp);
      }

      if (data.history) {
        setHistory(data.history);
      }
    } catch (e) {
      console.warn('Failed to load prices.json, using cached/defaults:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrices();
  }, [loadPrices]);

  return { prices, history, loading, lastUpdated, fetchPrices: loadPrices };
}
