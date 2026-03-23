import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const TUBE_COLORS = [
  '#C4956A', // capy brown
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

export function useTubes(user) {
  const [tubes, setTubes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTubes = useCallback(async () => {
    if (!user) {
      setTubes([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('tubes')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setTubes(
        data.map((row) => ({
          id: row.id,
          name: row.name,
          color: row.color || '#C4956A',
          capacity: row.capacity || 20,
          createdAt: row.created_at,
        }))
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTubes();
  }, [fetchTubes]);

  const createTube = async (name, color, capacity) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('tubes')
      .insert({
        user_id: user.id,
        name,
        color: color || '#C4956A',
        capacity: capacity || 20,
      })
      .select()
      .single();

    if (!error && data) {
      const newTube = {
        id: data.id,
        name: data.name,
        color: data.color,
        capacity: data.capacity || 20,
        createdAt: data.created_at,
      };
      setTubes((prev) => [...prev, newTube]);
      return newTube;
    }
    return null;
  };

  const renameTube = async (id, name) => {
    if (!user) return;

    const { error } = await supabase
      .from('tubes')
      .update({ name })
      .eq('id', id);

    if (!error) {
      setTubes((prev) =>
        prev.map((t) => (t.id === id ? { ...t, name } : t))
      );
    }
  };

  const updateTubeColor = async (id, color) => {
    if (!user) return;

    const { error } = await supabase
      .from('tubes')
      .update({ color })
      .eq('id', id);

    if (!error) {
      setTubes((prev) =>
        prev.map((t) => (t.id === id ? { ...t, color } : t))
      );
    }
  };

  const updateTubeCapacity = async (id, capacity) => {
    if (!user) return;

    const { error } = await supabase
      .from('tubes')
      .update({ capacity })
      .eq('id', id);

    if (!error) {
      setTubes((prev) =>
        prev.map((t) => (t.id === id ? { ...t, capacity } : t))
      );
    }
  };

  const deleteTube = async (id) => {
    if (!user) return;

    // First, unassign all holdings from this tube
    await supabase
      .from('holdings')
      .update({ tube_id: null })
      .eq('tube_id', id);

    const { error } = await supabase
      .from('tubes')
      .delete()
      .eq('id', id);

    if (!error) {
      setTubes((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const assignHoldingToTube = async (holdingId, tubeId) => {
    if (!user) return;

    const { error } = await supabase
      .from('holdings')
      .update({ tube_id: tubeId })
      .eq('id', holdingId);

    return !error;
  };

  return {
    tubes,
    loading,
    createTube,
    renameTube,
    updateTubeColor,
    updateTubeCapacity,
    deleteTube,
    assignHoldingToTube,
    fetchTubes,
  };
}
