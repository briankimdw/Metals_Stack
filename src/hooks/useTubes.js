import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { isGuest, guestSelect, guestInsert, guestUpdate, guestDelete, guestUpdateWhere } from '../lib/guestStorage';

const TUBE_COLORS = [
  '#D4AF37', // gold
  '#FFD700', // gold
  '#C0C0C0', // silver
  '#A78BFA', // purple
  '#4ADE80', // green
  '#FB7185', // pink
  '#38BDF8', // sky blue
  '#F97316', // orange
  '#E879F9', // magenta
  '#FACC15', // yellow
];

export { TUBE_COLORS };

function mapTube(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color || '#C4956A',
    capacity: row.capacity || 20,
    createdAt: row.created_at,
  };
}

export function useTubes(user) {
  const [tubes, setTubes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState(false);
  const guest = isGuest(user);

  const fetchTubes = useCallback(async () => {
    if (!user) {
      setTubes([]);
      setLoading(false);
      return;
    }

    if (guest) {
      setTableError(false);
      setTubes(guestSelect('tubes').map(mapTube));
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('tubes')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('fetchTubes error:', error);
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.code === 'PGRST204') {
        setTableError(true);
      }
    } else if (data) {
      setTableError(false);
      setTubes(data.map(mapTube));
    }
    setLoading(false);
  }, [user, guest]);

  useEffect(() => {
    fetchTubes();
  }, [fetchTubes]);

  const createTube = async (name, color, capacity) => {
    if (!user) return null;

    if (guest) {
      const row = guestInsert('tubes', { name, color: color || '#C4956A', capacity: capacity || 20 });
      const newTube = mapTube(row);
      setTubes((prev) => [...prev, newTube]);
      return newTube;
    }

    const { data, error } = await supabase
      .from('tubes')
      .insert({ user_id: user.id, name, color: color || '#C4956A', capacity: capacity || 20 })
      .select()
      .single();

    if (!error && data) {
      const newTube = mapTube(data);
      setTubes((prev) => [...prev, newTube]);
      return newTube;
    }
    return null;
  };

  const renameTube = async (id, name) => {
    if (!user) return;
    if (guest) { guestUpdate('tubes', id, { name }); }
    else {
      const { error } = await supabase.from('tubes').update({ name }).eq('id', id);
      if (error) return;
    }
    setTubes((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
  };

  const updateTubeColor = async (id, color) => {
    if (!user) return;
    if (guest) { guestUpdate('tubes', id, { color }); }
    else {
      const { error } = await supabase.from('tubes').update({ color }).eq('id', id);
      if (error) return;
    }
    setTubes((prev) => prev.map((t) => (t.id === id ? { ...t, color } : t)));
  };

  const updateTubeCapacity = async (id, capacity) => {
    if (!user) return;
    if (guest) { guestUpdate('tubes', id, { capacity }); }
    else {
      const { error } = await supabase.from('tubes').update({ capacity }).eq('id', id);
      if (error) return;
    }
    setTubes((prev) => prev.map((t) => (t.id === id ? { ...t, capacity } : t)));
  };

  const deleteTube = async (id) => {
    if (!user) return;
    if (guest) {
      guestUpdateWhere('holdings', 'tubeId', id, { tubeId: null });
      guestDelete('tubes', id);
    } else {
      await supabase.from('holdings').update({ tube_id: null }).eq('tube_id', id);
      const { error } = await supabase.from('tubes').delete().eq('id', id);
      if (error) return;
    }
    setTubes((prev) => prev.filter((t) => t.id !== id));
  };

  const assignHoldingToTube = async (holdingId, tubeId) => {
    if (!user) return false;
    if (guest) {
      guestUpdate('holdings', holdingId, { tubeId });
      return true;
    }
    const { error } = await supabase.from('holdings').update({ tube_id: tubeId }).eq('id', holdingId);
    return !error;
  };

  return {
    tubes, loading, tableError,
    createTube, renameTube, updateTubeColor, updateTubeCapacity,
    deleteTube, assignHoldingToTube, fetchTubes,
  };
}
