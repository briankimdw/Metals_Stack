import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const LOCAL_STORAGE_KEY = 'metal-stacker-portfolio';
const MIGRATED_KEY = 'metal-stacker-migrated';

export function usePortfolio(user) {
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch holdings from Supabase
  const fetchHoldings = useCallback(async () => {
    if (!user) {
      setHoldings([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('holdings')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setHoldings(
        data.map((row) => ({
          id: row.id,
          metal: row.metal,
          type: row.type,
          description: row.description || '',
          quantity: Number(row.quantity),
          costPerOz: Number(row.cost_per_oz),
          purchaseDate: row.purchase_date,
          notes: row.notes || '',
          status: row.status || 'active',
          folderId: row.folder_id || null,
        })),
      );
    }
    setLoading(false);
  }, [user]);

  // Migrate localStorage holdings to Supabase on first login
  useEffect(() => {
    if (!user) return;

    const alreadyMigrated = localStorage.getItem(MIGRATED_KEY);
    if (alreadyMigrated) {
      fetchHoldings();
      return;
    }

    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const localHoldings = raw ? JSON.parse(raw) : [];

    if (localHoldings.length > 0) {
      const rows = localHoldings.map((h) => ({
        user_id: user.id,
        metal: h.metal,
        type: h.type,
        description: h.description || '',
        quantity: h.quantity,
        cost_per_oz: h.costPerOz,
        purchase_date: h.purchaseDate || null,
      }));

      supabase
        .from('holdings')
        .insert(rows)
        .then(({ error }) => {
          if (!error) {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            localStorage.setItem(MIGRATED_KEY, 'true');
          }
          fetchHoldings();
        });
    } else {
      localStorage.setItem(MIGRATED_KEY, 'true');
      fetchHoldings();
    }
  }, [user, fetchHoldings]);

  const addHolding = async (holding) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('holdings')
      .insert({
        user_id: user.id,
        metal: holding.metal,
        type: holding.type,
        description: holding.description || '',
        quantity: holding.quantity,
        cost_per_oz: holding.costPerOz,
        purchase_date: holding.purchaseDate || null,
        notes: holding.notes || '',
        status: 'active',
        folder_id: holding.folderId || null,
      })
      .select()
      .single();

    if (!error && data) {
      const newHolding = {
        id: data.id,
        metal: data.metal,
        type: data.type,
        description: data.description || '',
        quantity: Number(data.quantity),
        costPerOz: Number(data.cost_per_oz),
        purchaseDate: data.purchase_date,
        notes: data.notes || '',
        status: data.status || 'active',
        folderId: data.folder_id || null,
      };
      setHoldings((prev) => [...prev, newHolding]);
      return newHolding;
    }
    return null;
  };

  const removeHolding = async (id) => {
    if (!user) return;

    const { error } = await supabase.from('holdings').delete().eq('id', id);

    if (!error) {
      setHoldings((prev) => prev.filter((h) => h.id !== id));
    }
  };

  const editHolding = async (id, updates) => {
    if (!user) return;

    const row = {};
    if (updates.metal !== undefined) row.metal = updates.metal;
    if (updates.type !== undefined) row.type = updates.type;
    if (updates.description !== undefined) row.description = updates.description;
    if (updates.quantity !== undefined) row.quantity = updates.quantity;
    if (updates.costPerOz !== undefined) row.cost_per_oz = updates.costPerOz;
    if (updates.purchaseDate !== undefined) row.purchase_date = updates.purchaseDate;
    if (updates.notes !== undefined) row.notes = updates.notes;
    if (updates.folderId !== undefined) row.folder_id = updates.folderId;

    const { error } = await supabase.from('holdings').update(row).eq('id', id);

    if (!error) {
      setHoldings((prev) =>
        prev.map((h) => (h.id === id ? { ...h, ...updates } : h)),
      );
    }
  };

  return { holdings, loading, addHolding, removeHolding, editHolding };
}
