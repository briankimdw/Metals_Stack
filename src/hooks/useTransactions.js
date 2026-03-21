import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useTransactions(user) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        transaction_items (
          *,
          holding:holdings (*)
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTransactions(
        data.map((t) => ({
          id: t.id,
          type: t.type,
          notes: t.notes || '',
          cashAmount: Number(t.cash_amount || 0),
          createdAt: t.created_at,
          items: (t.transaction_items || []).map((ti) => ({
            id: ti.id,
            holdingId: ti.holding_id,
            direction: ti.direction,
            holding: ti.holding
              ? {
                  id: ti.holding.id,
                  metal: ti.holding.metal,
                  type: ti.holding.type,
                  description: ti.holding.description || '',
                  quantity: Number(ti.holding.quantity),
                  costPerOz: Number(ti.holding.cost_per_oz),
                  purchaseDate: ti.holding.purchase_date,
                  status: ti.holding.status || 'active',
                }
              : null,
          })),
        })),
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const createBuyTransaction = async (holdingId) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('transactions')
      .insert({ user_id: user.id, type: 'buy' })
      .select()
      .single();

    if (!error && data) {
      await supabase
        .from('transaction_items')
        .insert({ transaction_id: data.id, holding_id: holdingId, direction: 'in' });
      fetchTransactions();
    }
  };

  const createSellTransaction = async (holdingId, sellPrice, notes) => {
    if (!user) return;

    const { data: holding } = await supabase
      .from('holdings')
      .select('quantity')
      .eq('id', holdingId)
      .single();

    const cashAmount = holding ? Number(holding.quantity) * sellPrice : 0;

    const { data: txn, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'sell',
        notes: notes || '',
        cash_amount: cashAmount,
      })
      .select()
      .single();

    if (!error && txn) {
      await supabase
        .from('transaction_items')
        .insert({ transaction_id: txn.id, holding_id: holdingId, direction: 'out' });

      await supabase
        .from('holdings')
        .update({ status: 'sold' })
        .eq('id', holdingId);

      fetchTransactions();
    }

    return !error;
  };

  // Now accepts an array of newHoldings instead of a single one
  const createTradeTransaction = async (outHoldingIds, newHoldings, cashAdded, notes) => {
    if (!user) return null;

    // Normalize: support both single object and array
    const holdingsArray = Array.isArray(newHoldings) ? newHoldings : [newHoldings];

    const { data: txn, error: txnError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'trade',
        notes: notes || '',
        cash_amount: cashAdded || 0,
      })
      .select()
      .single();

    if (txnError || !txn) return null;

    // Create "out" items
    const outItems = outHoldingIds.map((hid) => ({
      transaction_id: txn.id,
      holding_id: hid,
      direction: 'out',
    }));
    await supabase.from('transaction_items').insert(outItems);

    // Mark traded holdings
    await supabase
      .from('holdings')
      .update({ status: 'traded' })
      .in('id', outHoldingIds);

    // Insert all new holdings
    const createdHoldings = [];
    for (const newHolding of holdingsArray) {
      const { data: newRow, error: holdError } = await supabase
        .from('holdings')
        .insert({
          user_id: user.id,
          metal: newHolding.metal,
          type: newHolding.type,
          description: newHolding.description || '',
          quantity: newHolding.quantity,
          cost_per_oz: newHolding.costPerOz,
          purchase_date: newHolding.purchaseDate || null,
          notes: newHolding.notes || '',
          status: 'active',
        })
        .select()
        .single();

      if (!holdError && newRow) {
        await supabase
          .from('transaction_items')
          .insert({ transaction_id: txn.id, holding_id: newRow.id, direction: 'in' });
        createdHoldings.push(newRow);
      }
    }

    fetchTransactions();
    return createdHoldings.length > 0 ? createdHoldings : null;
  };

  return {
    transactions,
    loading,
    fetchTransactions,
    createBuyTransaction,
    createSellTransaction,
    createTradeTransaction,
  };
}
