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
                  imageUrl: ti.holding.image_url || '',
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

    // Get the holding to calculate cash amount
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

      // Mark holding as sold
      await supabase
        .from('holdings')
        .update({ status: 'sold' })
        .eq('id', holdingId);

      fetchTransactions();
    }

    return !error;
  };

  const createTradeTransaction = async (outHoldingIds, newHolding, cashAdded, notes) => {
    if (!user) return null;

    // Create the transaction
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

    // Create "out" items for traded holdings
    const outItems = outHoldingIds.map((hid) => ({
      transaction_id: txn.id,
      holding_id: hid,
      direction: 'out',
    }));
    await supabase.from('transaction_items').insert(outItems);

    // Mark traded holdings as traded
    await supabase
      .from('holdings')
      .update({ status: 'traded' })
      .in('id', outHoldingIds);

    // Insert the new holding
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
        image_url: newHolding.imageUrl || '',
        status: 'active',
      })
      .select()
      .single();

    if (!holdError && newRow) {
      // Create "in" item for new holding
      await supabase
        .from('transaction_items')
        .insert({ transaction_id: txn.id, holding_id: newRow.id, direction: 'in' });
    }

    fetchTransactions();
    return newRow;
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
