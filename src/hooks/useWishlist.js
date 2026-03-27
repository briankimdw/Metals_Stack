import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { isGuest, guestSelect, guestInsert, guestUpdate, guestDelete } from '../lib/guestStorage';

function mapItem(row) {
  return {
    id: row.id,
    url: row.url,
    name: row.name,
    metal: row.metal || null,
    price: row.price != null ? Number(row.price) : null,
    imageUrl: row.image_url ?? row.imageUrl ?? null,
    notes: row.notes || '',
    createdAt: row.created_at ?? row.createdAt,
  };
}

export function useWishlist(user) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState(false);
  const guest = isGuest(user);

  const fetchItems = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    if (guest) {
      setTableError(false);
      const rows = guestSelect('wishlist_items');
      setItems(rows.reverse().map(mapItem));
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('wishlist_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('fetchWishlist error:', error);
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.code === 'PGRST204') {
        setTableError(true);
      }
    } else if (data) {
      setTableError(false);
      setItems(data.map(mapItem));
    }
    setLoading(false);
  }, [user, guest]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = async (url, name, metal, price, notes, imageUrl) => {
    if (!user) return null;

    if (guest) {
      const row = guestInsert('wishlist_items', { url, name, metal: metal || null, price: price || null, image_url: imageUrl || null, notes: notes || null });
      const newItem = mapItem(row);
      setItems((prev) => [newItem, ...prev]);
      return newItem;
    }

    const { data, error } = await supabase
      .from('wishlist_items')
      .insert({
        user_id: user.id,
        url, name,
        metal: metal || null,
        price: price || null,
        image_url: imageUrl || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('addWishlistItem error:', error);
      return null;
    }

    const newItem = mapItem(data);
    setItems((prev) => [newItem, ...prev]);
    return newItem;
  };

  const updateItem = async (id, updates) => {
    if (!user) return;

    if (guest) {
      guestUpdate('wishlist_items', id, updates);
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
      return;
    }

    const row = {};
    if (updates.url !== undefined) row.url = updates.url;
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.metal !== undefined) row.metal = updates.metal || null;
    if (updates.price !== undefined) row.price = updates.price || null;
    if (updates.imageUrl !== undefined) row.image_url = updates.imageUrl || null;
    if (updates.notes !== undefined) row.notes = updates.notes || null;

    const { error } = await supabase.from('wishlist_items').update(row).eq('id', id);
    if (!error) {
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    }
  };

  const removeItem = async (id) => {
    if (!user) return;

    if (guest) {
      guestDelete('wishlist_items', id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      return;
    }

    const { error } = await supabase.from('wishlist_items').delete().eq('id', id);
    if (!error) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  return { items, loading, tableError, addItem, updateItem, removeItem };
}
