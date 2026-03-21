import { useState, useMemo } from 'react';
import { METALS, formatCurrency } from '../utils/constants';
import { CapybaraSleeping } from './CapybaraMascot';

const TYPE_CONFIG = {
  buy: { label: 'Buy', color: '#4ADE80', bg: 'rgba(74, 222, 128, 0.1)', icon: '+' },
  sell: { label: 'Sell', color: '#FB7185', bg: 'rgba(251, 113, 133, 0.1)', icon: '-' },
  trade: { label: 'Trade', color: '#A78BFA', bg: 'rgba(167, 139, 250, 0.1)', icon: '⇄' },
};

export default function TransactionHistory({ transactions, onClose }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = transactions;
    if (filter !== 'all') list = list.filter((t) => t.type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        t.notes?.toLowerCase().includes(q) ||
        t.items.some((i) =>
          i.holding?.description?.toLowerCase().includes(q) ||
          i.holding?.metal?.toLowerCase().includes(q) ||
          i.holding?.type?.toLowerCase().includes(q)
        )
      );
    }
    return list;
  }, [transactions, filter, search]);

  // Group by month
  const grouped = useMemo(() => {
    const groups = {};
    for (const txn of filtered) {
      const d = new Date(txn.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = { label, items: [] };
      groups[key].items.push(txn);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const counts = useMemo(() => ({
    all: transactions.length,
    buy: transactions.filter((t) => t.type === 'buy').length,
    sell: transactions.filter((t) => t.type === 'sell').length,
    trade: transactions.filter((t) => t.type === 'trade').length,
  }), [transactions]);

  return (
    <div className="history-page">
      {/* Header */}
      <div className="history-header">
        <div className="history-header-left">
          <h1 className="history-title">Transaction History</h1>
          <span className="history-subtitle">{transactions.length} transaction{transactions.length !== 1 ? 's' : ''}</span>
        </div>
        <button className="btn" onClick={onClose}>Back to Portfolio</button>
      </div>

      {/* Filters */}
      <div className="history-filters">
        <div className="history-tabs">
          {[
            { key: 'all', label: 'All' },
            { key: 'buy', label: 'Buys' },
            { key: 'sell', label: 'Sells' },
            { key: 'trade', label: 'Trades' },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`history-tab ${filter === tab.key ? 'active' : ''}`}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
              <span className="history-tab-count">{counts[tab.key]}</span>
            </button>
          ))}
        </div>
        <input
          className="form-input history-search"
          type="text"
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Transaction List */}
      {filtered.length === 0 ? (
        <div className="history-empty">
          <CapybaraSleeping size={90} />
          <p>No transactions found.</p>
        </div>
      ) : (
        <div className="history-list">
          {grouped.map(([key, group]) => (
            <div key={key} className="history-month">
              <h3 className="history-month-label">{group.label}</h3>
              <div className="history-month-items">
                {group.items.map((txn) => {
                  const config = TYPE_CONFIG[txn.type];
                  const outItems = txn.items.filter((i) => i.direction === 'out');
                  const inItems = txn.items.filter((i) => i.direction === 'in');
                  const d = new Date(txn.createdAt);
                  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={txn.id} className="history-item">
                      <div className="history-item-icon" style={{ background: config.bg, color: config.color }}>
                        {config.icon}
                      </div>
                      <div className="history-item-body">
                        <div className="history-item-top">
                          <span className="history-item-type" style={{ color: config.color }}>
                            {config.label}
                          </span>
                          <span className="history-item-date">{date} at {time}</span>
                        </div>

                        {txn.type === 'buy' && inItems.map((item) => (
                          <HistoryHoldingRow key={item.id} item={item} />
                        ))}

                        {txn.type === 'sell' && (
                          <>
                            {outItems.map((item) => (
                              <HistoryHoldingRow key={item.id} item={item} />
                            ))}
                            {txn.cashAmount > 0 && (
                              <div className="history-item-cash positive">
                                Proceeds: {formatCurrency(txn.cashAmount)}
                              </div>
                            )}
                          </>
                        )}

                        {txn.type === 'trade' && (
                          <div className="history-trade-detail">
                            {outItems.length > 0 && (
                              <div className="history-trade-side">
                                <span className="history-trade-label out">Gave</span>
                                {outItems.map((item) => (
                                  <HistoryHoldingRow key={item.id} item={item} compact />
                                ))}
                                {txn.cashAmount > 0 && (
                                  <div className="history-item-cash">
                                    + {formatCurrency(txn.cashAmount)} cash
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="history-trade-arrow">→</div>
                            {inItems.length > 0 && (
                              <div className="history-trade-side">
                                <span className="history-trade-label in">Received</span>
                                {inItems.map((item) => (
                                  <HistoryHoldingRow key={item.id} item={item} compact />
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {txn.notes && (
                          <div className="history-item-notes">"{txn.notes}"</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryHoldingRow({ item, compact }) {
  if (!item.holding) {
    return <div className="history-holding deleted">(deleted holding)</div>;
  }

  const h = item.holding;
  const metal = METALS[h.metal];
  const totalCost = h.quantity * h.costPerOz;

  return (
    <div className={`history-holding ${compact ? 'compact' : ''}`}>
      <span className="history-holding-dot" style={{ background: metal?.color || '#888' }} />
      <span className="history-holding-name">
        {metal?.name || h.metal} {h.description || h.type}
      </span>
      <span className="history-holding-detail">
        {h.quantity} oz · {formatCurrency(totalCost)}
      </span>
    </div>
  );
}
