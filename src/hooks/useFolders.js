import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const FOLDER_COLORS = [
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

export { FOLDER_COLORS };

export function useFolders(user) {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFolders = useCallback(async () => {
    if (!user) {
      setFolders([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setFolders(
        data.map((row) => ({
          id: row.id,
          name: row.name,
          color: row.color || '#C4956A',
          createdAt: row.created_at,
        }))
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const createFolder = async (name, color) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('folders')
      .insert({
        user_id: user.id,
        name,
        color: color || '#C4956A',
      })
      .select()
      .single();

    if (!error && data) {
      const newFolder = {
        id: data.id,
        name: data.name,
        color: data.color,
        createdAt: data.created_at,
      };
      setFolders((prev) => [...prev, newFolder]);
      return newFolder;
    }
    return null;
  };

  const renameFolder = async (id, name) => {
    if (!user) return;

    const { error } = await supabase
      .from('folders')
      .update({ name })
      .eq('id', id);

    if (!error) {
      setFolders((prev) =>
        prev.map((f) => (f.id === id ? { ...f, name } : f))
      );
    }
  };

  const updateFolderColor = async (id, color) => {
    if (!user) return;

    const { error } = await supabase
      .from('folders')
      .update({ color })
      .eq('id', id);

    if (!error) {
      setFolders((prev) =>
        prev.map((f) => (f.id === id ? { ...f, color } : f))
      );
    }
  };

  const deleteFolder = async (id) => {
    if (!user) return;

    // First, unassign all holdings from this folder
    await supabase
      .from('holdings')
      .update({ folder_id: null })
      .eq('folder_id', id);

    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id);

    if (!error) {
      setFolders((prev) => prev.filter((f) => f.id !== id));
    }
  };

  const assignHoldingToFolder = async (holdingId, folderId) => {
    if (!user) return;

    const { error } = await supabase
      .from('holdings')
      .update({ folder_id: folderId })
      .eq('id', holdingId);

    return !error;
  };

  return {
    folders,
    loading,
    createFolder,
    renameFolder,
    updateFolderColor,
    deleteFolder,
    assignHoldingToFolder,
    fetchFolders,
  };
}
