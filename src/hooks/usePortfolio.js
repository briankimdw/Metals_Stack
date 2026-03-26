import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { isGuest, guestSelect, guestInsert, guestUpdate, guestDelete } from '../lib/guestStorage';

const LOCAL_STORAGE_KEY = 'metal-stacker-portfolio';
const MIGRATED_KEY = 'metal-stacker-migrated';

function mapRow(row) {
  return {
    id: row.id,
    metal: row.metal,
    type: row.type,
    description: row.description || '',
    quantity: Number(row.quantity),
    costPerOz: Number(row.cost_per_oz ?? row.costPerOz ?? 0),
    purchaseDate: row.purchase_date ?? row.purchaseDate ?? null,
    imageUrl: row.image_url ?? row.imageUrl ?? '',
    notes: row.notes || '',
    status: row.status || 'active',
    tubeId: row.tube_id ?? row.tubeId ?? null,
  };
}

export function usePortfolio(user) {
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const guest = isGuest(user);

  const fetchHoldings = useCallback(async () => {
    if (!user) {
      setHoldings([]);
      setLoading(false);
      return;
    }

    if (guest) {
      const rows = guestSelect('holdings');
      setHoldings(
        rows
          .filter((r) => !r.status || r.status === 'active')
          .map(mapRow)
      );
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('holdings')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('fetchHoldings error:', error);
    } else if (data) {
      setHoldings(
        data
          .filter((row) => !row.status || row.status === 'active')
          .map(mapRow),
      );
    }
    setLoading(false);
  }, [user, guest]);

  useEffect(() => {
    if (!user) return;
    if (guest) {
      fetchHoldings();
      return;
    }

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
  }, [user, guest, fetchHoldings]);

  const addHolding = async (holding) => {
    if (!user) return null;

    if (guest) {
      const row = guestInsert('holdings', {
        metal: holding.metal,
        type: holding.type,
        description: holding.description || '',
        quantity: holding.quantity,
        costPerOz: holding.costPerOz,
        purchaseDate: holding.purchaseDate || null,
        notes: holding.notes || '',
        status: 'active',
        tubeId: holding.tubeId || null,
      });
      const newHolding = mapRow(row);
      setHoldings((prev) => [...prev, newHolding]);
      return newHolding;
    }

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
        tube_id: holding.tubeId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('addHolding error:', error);
    }
    if (!error && data) {
      const newHolding = mapRow(data);
      setHoldings((prev) => [...prev, newHolding]);
      return newHolding;
    }
    return null;
  };

  const removeHolding = async (id) => {
    if (!user) return;

    if (guest) {
      guestDelete('holdings', id);
      setHoldings((prev) => prev.filter((h) => h.id !== id));
      return;
    }

    const { error } = await supabase.from('holdings').delete().eq('id', id);
    if (!error) {
      setHoldings((prev) => prev.filter((h) => h.id !== id));
    }
  };

  const editHolding = async (id, updates) => {
    if (!user) return;

    if (guest) {
      guestUpdate('holdings', id, updates);
      setHoldings((prev) =>
        prev.map((h) => (h.id === id ? { ...h, ...updates } : h)),
      );
      return;
    }

    const row = {};
    if (updates.metal !== undefined) row.metal = updates.metal;
    if (updates.type !== undefined) row.type = updates.type;
    if (updates.description !== undefined) row.description = updates.description;
    if (updates.quantity !== undefined) row.quantity = updates.quantity;
    if (updates.costPerOz !== undefined) row.cost_per_oz = updates.costPerOz;
    if (updates.purchaseDate !== undefined) row.purchase_date = updates.purchaseDate;
    if (updates.notes !== undefined) row.notes = updates.notes;
    if (updates.tubeId !== undefined) row.tube_id = updates.tubeId;

    const { error } = await supabase.from('holdings').update(row).eq('id', id);
    if (!error) {
      setHoldings((prev) =>
        prev.map((h) => (h.id === id ? { ...h, ...updates } : h)),
      );
    }
  };

  return { holdings, loading, addHolding, removeHolding, editHolding };
}
