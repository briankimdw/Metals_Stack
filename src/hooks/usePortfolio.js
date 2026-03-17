import { useState, useEffect } from 'react';

const STORAGE_KEY = 'metal-stacker-portfolio';

export function usePortfolio() {
  const [holdings, setHoldings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
  }, [holdings]);

  const addHolding = (holding) => {
    setHoldings((prev) => [...prev, { ...holding, id: crypto.randomUUID() }]);
  };

  const removeHolding = (id) => {
    setHoldings((prev) => prev.filter((h) => h.id !== id));
  };

  const editHolding = (id, updates) => {
    setHoldings((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...updates } : h)),
    );
  };

  return { holdings, addHolding, removeHolding, editHolding };
}
