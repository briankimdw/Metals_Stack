import { useState, useMemo } from 'react';
import { useAuth } from './context/AuthContext';
import { usePortfolio } from './hooks/usePortfolio';
import { useTransactions } from './hooks/useTransactions';
import { usePrices } from './hooks/usePrices';
import { METALS, formatCurrency, formatPercent } from './utils/constants';
import Charts from './components/Charts';
import AddModal from './components/AddModal';
import SellModal from './components/SellModal';
import TradeModal from './components/TradeModal';
import TransactionHistory from './components/TransactionHistory';
import Login from './components/Login';

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { holdings, addHolding, removeHolding, editHolding } = usePortfolio(user);
  const { transactions, createBuyTransaction, createSellTransaction, createTradeTransaction, fetchTransactions } = useTransactions(user);
  const { prices, loading, lastUpdated, fetchPrices } = usePrices();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [sellHolding, setSellHolding] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const metalSummaries = useMemo(() => {
    const summaries = {};
    for (const [key, metal] of Object.entries(METALS)) {
      const metalHoldings = holdings.filter((h) => h.metal === key);
      const totalOz = metalHoldings.reduce((s, h) => s + h.quantity, 0);
      const totalCost = metalHoldings.reduce((s, h) => s + h.quantity * h.costPerOz, 0);
      const spotPrice = prices[key] || metal.defaultPrice;
      const currentValue = totalOz * spotPrice;
      const pnl = currentValue - totalCost;
      const pnlPercent = totalCost > 0 ? ((currentValue - totalCost) / totalCost) * 100 : 0;
      summaries[key] = {
        ...metal, key, totalOz, totalCost, spotPrice,
        currentValue, pnl, pnlPercent, holdings: metalHoldings,
      };
    }
    return summaries;
  }, [holdings, prices]);

  const totals = useMemo(() => {
    const vals = Object.values(metalSummaries);
    const totalValue = vals.reduce((s, m) => s + m.currentValue, 0);
    const totalCost = vals.reduce((s, m) => s + m.totalCost, 0);
    const totalPnl = totalValue - totalCost;
    const totalPnlPercent = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
    return { totalValue, totalCost, totalPnl, totalPnlPercent };
  }, [metalSummaries]);

  const handleAddHolding = async (holding) => {
    const created = await addHolding(holding);
    if (created) {
      await createBuyTransaction(created.id);
    }
    setShowAddModal(false);
  };

  const handleSell = async (holdingId, sellPrice, notes) => {
    const success = await createSellTransaction(holdingId, sellPrice, notes);
    if (success) {
      // Refresh holdings to remove the sold item
      setSellHolding(null);
      // Force re-fetch by reloading
      window.location.reload();
    }
    return success;
  };

  const handleTrade = async (outIds, newHolding, cashAdded, notes) => {
    const result = await createTradeTransaction(outIds, newHolding, cashAdded, notes);
    if (result) {
      setShowTradeModal(false);
      window.location.reload();
    }
    return result;
  };

  if (authLoading) {
    return (
      <div className="app" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <StackIcon />
          <h1>Metal Stacker</h1>
        </div>
        <div className="header-actions">
          <div className="price-status">
            <span className={`price-dot ${lastUpdated ? '' : 'stale'}`} />
            {loading
              ? 'Updating prices...'
              : lastUpdated
                ? `Updated ${new Date(lastUpdated).toLocaleTimeString()}`
                : 'Using default prices'}
          </div>
          <button className="btn" onClick={fetchPrices} disabled={loading}>
            ↻ Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Add
          </button>
          {holdings.length > 0 && (
            <>
              <button className="btn btn-trade-btn" onClick={() => setShowTradeModal(true)}>
                ⇄ Trade
              </button>
            </>
          )}
          <button className="btn" onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? 'Hide History' : 'History'}
          </button>
          <div className="header-user">
            <span className="header-email">{user.email}</span>
            <button className="btn btn-sm" onClick={signOut}>Sign Out</button>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      {holdings.length > 0 && (
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-card-label">Total Value</div>
            <div className="summary-card-value">{formatCurrency(totals.totalValue)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-label">Total Cost</div>
            <div className="summary-card-value">{formatCurrency(totals.totalCost)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-label">Total Profit / Loss</div>
            <div className={`summary-card-value ${totals.totalPnl >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(totals.totalPnl)}
            </div>
            <div className="summary-card-sub">{formatPercent(totals.totalPnlPercent)}</div>
          </div>
        </div>
      )}

      {/* Metal Breakdown Cards */}
      <div className="metal-cards">
        {Object.entries(metalSummaries).map(([key, s]) => (
          <div key={key} className={`metal-card ${key}`}>
            <div className="metal-card-header">
              <span className="metal-card-name">{s.name}</span>
              <span className="metal-card-symbol">{s.symbol}</span>
            </div>
            <div className="metal-card-spot">
              Spot: <strong>{formatCurrency(s.spotPrice)}</strong>
            </div>
            <div className="metal-card-holdings">{formatCurrency(s.currentValue)}</div>
            <div className="metal-card-qty">{s.totalOz.toFixed(3)} troy oz</div>
            {s.totalCost > 0 && (
              <span className={`metal-card-pnl ${s.pnl >= 0 ? 'positive' : 'negative'}`}>
                {s.pnl >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(s.pnl))} ({formatPercent(s.pnlPercent)})
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Charts */}
      <Charts metalSummaries={metalSummaries} totals={totals} />

      {/* Holdings Table */}
      {holdings.length > 0 && (
        <div className="section">
          <h2 className="section-title">All Holdings</h2>
          <div className="holdings-table-wrap">
            <table className="holdings-table">
              <thead>
                <tr>
                  <th>Metal</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Cost / oz</th>
                  <th>Total Cost</th>
                  <th>Current Value</th>
                  <th>P/L</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => {
                  const metal = METALS[h.metal];
                  const spot = prices[h.metal] || metal.defaultPrice;
                  const tc = h.quantity * h.costPerOz;
                  const cv = h.quantity * spot;
                  const pl = cv - tc;
                  return (
                    <tr key={h.id}>
                      <td>
                        <div className="holding-metal">
                          <span className="holding-metal-dot" style={{ background: `var(--${h.metal})` }} />
                          {metal.name}
                        </div>
                      </td>
                      <td><span className="holding-type">{h.type}</span></td>
                      <td>{h.description || '—'}</td>
                      <td>{h.quantity} oz</td>
                      <td>{formatCurrency(h.costPerOz)}</td>
                      <td>{formatCurrency(tc)}</td>
                      <td>{formatCurrency(cv)}</td>
                      <td>
                        <span className={`metal-card-pnl ${pl >= 0 ? 'positive' : 'negative'}`}>
                          {formatCurrency(pl)}
                        </span>
                      </td>
                      <td>
                        <div className="holding-actions">
                          <button className="btn btn-sm btn-sell-sm" onClick={() => setSellHolding(h)}>
                            Sell
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => removeHolding(h.id)}>
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction History */}
      {showHistory && (
        <TransactionHistory
          transactions={transactions}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Empty State */}
      {holdings.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🪙</div>
          <h3>No investments yet</h3>
          <p>Add your first precious metal investment to see your stack grow!</p>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
            style={{ marginTop: 20 }}
          >
            + Add Your First Investment
          </button>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddHolding}
          prices={prices}
        />
      )}

      {/* Sell Modal */}
      {sellHolding && (
        <SellModal
          holding={sellHolding}
          prices={prices}
          onClose={() => setSellHolding(null)}
          onSell={handleSell}
        />
      )}

      {/* Trade Modal */}
      {showTradeModal && (
        <TradeModal
          holdings={holdings}
          prices={prices}
          onClose={() => setShowTradeModal(false)}
          onTrade={handleTrade}
        />
      )}
    </div>
  );
}

function StackIcon() {
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="22" width="28" height="6" rx="2" fill="url(#hg1)" />
      <rect x="6" y="15" width="24" height="6" rx="2" fill="url(#hg2)" />
      <rect x="8" y="8" width="20" height="6" rx="2" fill="url(#hg3)" />
      <defs>
        <linearGradient id="hg1" x1="4" y1="22" x2="32" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD700" /><stop offset="1" stopColor="#B8860B" />
        </linearGradient>
        <linearGradient id="hg2" x1="6" y1="15" x2="30" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE44D" /><stop offset="1" stopColor="#DAA520" />
        </linearGradient>
        <linearGradient id="hg3" x1="8" y1="8" x2="28" y2="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF8DC" /><stop offset="1" stopColor="#FFD700" />
        </linearGradient>
      </defs>
    </svg>
  );
}
