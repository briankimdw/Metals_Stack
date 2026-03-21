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
import HoldingDetail from './components/HoldingDetail';
import TransactionHistory from './components/TransactionHistory';
import Login from './components/Login';
import { CapybaraLogo, CapybaraWave, CapybaraSleeping } from './components/CapybaraMascot';

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { holdings, addHolding, removeHolding, editHolding } = usePortfolio(user);
  const { transactions, createBuyTransaction, createSellTransaction, createTradeTransaction } = useTransactions(user);
  const { prices, loading, lastUpdated, fetchPrices } = usePrices();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHolding, setEditingHolding] = useState(null);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [sellHolding, setSellHolding] = useState(null);
  const [detailHolding, setDetailHolding] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sortField, setSortField] = useState('metal');
  const [sortDir, setSortDir] = useState('asc');

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
    const totalOz = vals.reduce((s, m) => s + m.totalOz, 0);
    return { totalValue, totalCost, totalPnl, totalPnlPercent, totalOz };
  }, [metalSummaries]);

  const sortedHoldings = useMemo(() => {
    const list = [...holdings];
    list.sort((a, b) => {
      let va, vb;
      const spotA = prices[a.metal] || METALS[a.metal].defaultPrice;
      const spotB = prices[b.metal] || METALS[b.metal].defaultPrice;
      switch (sortField) {
        case 'metal': va = a.metal; vb = b.metal; break;
        case 'type': va = a.type; vb = b.type; break;
        case 'description': va = a.description || ''; vb = b.description || ''; break;
        case 'quantity': va = a.quantity; vb = b.quantity; break;
        case 'costPerOz': va = a.costPerOz; vb = b.costPerOz; break;
        case 'totalCost': va = a.quantity * a.costPerOz; vb = b.quantity * b.costPerOz; break;
        case 'value': va = a.quantity * spotA; vb = b.quantity * spotB; break;
        case 'pl': va = a.quantity * spotA - a.quantity * a.costPerOz; vb = b.quantity * spotB - b.quantity * b.costPerOz; break;
        case 'date': va = a.purchaseDate || ''; vb = b.purchaseDate || ''; break;
        default: va = a.metal; vb = b.metal;
      }
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return list;
  }, [holdings, sortField, sortDir, prices]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="sort-icon inactive">&#8597;</span>;
    return <span className="sort-icon">{sortDir === 'asc' ? '&#9650;' : '&#9660;'}</span>;
  };

  const handleAddHolding = async (holding) => {
    const created = await addHolding(holding);
    if (created) {
      await createBuyTransaction(created.id);
    }
    setShowAddModal(false);
  };

  const handleAddMultiple = async (items) => {
    for (const item of items) {
      const created = await addHolding(item);
      if (created) {
        await createBuyTransaction(created.id);
      }
    }
    setShowAddModal(false);
  };

  const handleEditHolding = async (updates) => {
    if (!editingHolding) return;
    await editHolding(editingHolding.id, updates);
    setEditingHolding(null);
  };

  const handleDeleteWithConfirm = (holding) => {
    setDeleteConfirm(holding);
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      await removeHolding(deleteConfirm.id);
      setDeleteConfirm(null);
      setDetailHolding(null);
    }
  };

  const handleSell = async (holdingId, sellPrice, notes) => {
    const success = await createSellTransaction(holdingId, sellPrice, notes);
    if (success) {
      setSellHolding(null);
      window.location.reload();
    }
    return success;
  };

  const handleTrade = async (outIds, newHoldings, cashAdded, notes) => {
    const result = await createTradeTransaction(outIds, newHoldings, cashAdded, notes);
    if (result) {
      setShowTradeModal(false);
      window.location.reload();
    }
    return result;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '---';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (authLoading) {
    return (
      <div className="app loading-screen">
        <CapybaraSleeping size={100} />
        <div className="loading-spinner" />
        <p>Waking up your portfolio...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Full-page history view
  if (showHistory) {
    return (
      <div className="app">
        <TransactionHistory
          transactions={transactions}
          onClose={() => setShowHistory(false)}
        />
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <CapybaraLogo size={36} />
          <h1>Metal Stacker</h1>
        </div>
        <nav className="header-nav">
          <div className="price-status">
            <span className={`price-dot ${lastUpdated ? 'live' : 'stale'}`} />
            {loading
              ? 'Fetching prices...'
              : lastUpdated
                ? `Live as of ${new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Default prices'}
          </div>
          <button className="btn btn-ghost" onClick={fetchPrices} disabled={loading} title="Refresh prices">
            <RefreshIcon />
          </button>
          <div className="header-divider" />
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Add
          </button>
          {holdings.length > 0 && (
            <button className="btn btn-accent" onClick={() => setShowTradeModal(true)}>
              Trade
            </button>
          )}
          <button
            className={`btn ${showHistory ? 'btn-active' : 'btn-ghost'}`}
            onClick={() => setShowHistory((v) => !v)}
          >
            History
          </button>
          <div className="header-divider" />
          <div className="header-user">
            <div className="header-avatar">
              {(user.email || '?')[0].toUpperCase()}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign Out</button>
          </div>
        </nav>
      </header>

      {/* Spot Prices Bar — always visible */}
      <div className="spot-bar">
        {Object.entries(metalSummaries).map(([key, s]) => (
          <div key={key} className="spot-item">
            <span className="spot-dot" style={{ background: s.color }} />
            <span className="spot-name">{s.name}</span>
            <span className="spot-price">{formatCurrency(s.spotPrice)}</span>
            <span className="spot-unit">/oz</span>
          </div>
        ))}
      </div>

      {/* Summary Strip */}
      {holdings.length > 0 && (
        <div className="summary-strip">
          <div className="summary-stat">
            <span className="summary-stat-label">Portfolio Value</span>
            <span className="summary-stat-value">{formatCurrency(totals.totalValue)}</span>
          </div>
          <div className="summary-divider" />
          <div className="summary-stat">
            <span className="summary-stat-label">Total Cost</span>
            <span className="summary-stat-value dim">{formatCurrency(totals.totalCost)}</span>
          </div>
          <div className="summary-divider" />
          <div className="summary-stat">
            <span className="summary-stat-label">Unrealized P/L</span>
            <span className={`summary-stat-value ${totals.totalPnl >= 0 ? 'positive' : 'negative'}`}>
              {totals.totalPnl >= 0 ? '+' : ''}{formatCurrency(totals.totalPnl)}
            </span>
            <span className={`summary-stat-pct ${totals.totalPnl >= 0 ? 'positive' : 'negative'}`}>
              {formatPercent(totals.totalPnlPercent)}
            </span>
          </div>
          <div className="summary-divider" />
          <div className="summary-stat">
            <span className="summary-stat-label">Holdings</span>
            <span className="summary-stat-value dim">{holdings.length}</span>
          </div>
          <div className="summary-divider" />
          <div className="summary-stat">
            <span className="summary-stat-label">Total Weight</span>
            <span className="summary-stat-value dim">{totals.totalOz.toFixed(3)} oz</span>
          </div>
        </div>
      )}

      {/* Metal Cards */}
      {holdings.length > 0 && (
        <div className="metal-cards">
          {Object.entries(metalSummaries)
            .filter(([, s]) => s.totalOz > 0)
            .map(([key, s]) => (
            <div key={key} className="metal-card">
              <div className="metal-card-accent" style={{ background: `linear-gradient(135deg, ${s.color}, ${s.darkColor})` }} />
              <div className="metal-card-header">
                <div className="metal-card-title">
                  <span className="metal-card-dot" style={{ background: s.color }} />
                  <span className="metal-card-name">{s.name}</span>
                </div>
                <span className="metal-card-symbol">{s.symbol}</span>
              </div>
              <div className="metal-card-body">
                <div className="metal-card-value">{formatCurrency(s.currentValue)}</div>
                <div className="metal-card-meta">
                  <span>{s.totalOz.toFixed(3)} oz</span>
                  <span className="metal-card-sep">/</span>
                  <span>Spot {formatCurrency(s.spotPrice)}</span>
                </div>
              </div>
              {s.totalCost > 0 && (
                <div className={`metal-card-pnl ${s.pnl >= 0 ? 'positive' : 'negative'}`}>
                  {s.pnl >= 0 ? '+' : ''}{formatCurrency(s.pnl)}
                  <span className="metal-card-pnl-pct">{formatPercent(s.pnlPercent)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <Charts metalSummaries={metalSummaries} totals={totals} />

      {/* Holdings Table */}
      {holdings.length > 0 && (
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">Holdings</h2>
            <span className="section-count">{holdings.length} position{holdings.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="holdings-table-wrap">
            <table className="holdings-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort('metal')} className="th-sortable">
                    Metal <SortIcon field="metal" />
                  </th>
                  <th onClick={() => toggleSort('type')} className="th-sortable">
                    Type <SortIcon field="type" />
                  </th>
                  <th onClick={() => toggleSort('description')} className="th-sortable">
                    Description <SortIcon field="description" />
                  </th>
                  <th onClick={() => toggleSort('date')} className="th-sortable">
                    Acquired <SortIcon field="date" />
                  </th>
                  <th onClick={() => toggleSort('quantity')} className="th-sortable th-right">
                    Qty (oz) <SortIcon field="quantity" />
                  </th>
                  <th onClick={() => toggleSort('costPerOz')} className="th-sortable th-right">
                    Cost/oz <SortIcon field="costPerOz" />
                  </th>
                  <th onClick={() => toggleSort('totalCost')} className="th-sortable th-right">
                    Cost Basis <SortIcon field="totalCost" />
                  </th>
                  <th onClick={() => toggleSort('value')} className="th-sortable th-right">
                    Mkt Value <SortIcon field="value" />
                  </th>
                  <th onClick={() => toggleSort('pl')} className="th-sortable th-right">
                    P/L <SortIcon field="pl" />
                  </th>
                  <th className="th-actions"></th>
                </tr>
              </thead>
              <tbody>
                {sortedHoldings.map((h) => {
                  const metal = METALS[h.metal];
                  const spot = prices[h.metal] || metal.defaultPrice;
                  const tc = h.quantity * h.costPerOz;
                  const cv = h.quantity * spot;
                  const pl = cv - tc;
                  const plPct = tc > 0 ? ((cv - tc) / tc) * 100 : 0;
                  return (
                    <tr key={h.id} className="tr-clickable" onClick={() => setDetailHolding(h)}>
                      <td>
                        <div className="holding-metal">
                          <span className="holding-metal-dot" style={{ background: metal.color }} />
                          {metal.name}
                        </div>
                      </td>
                      <td><span className="holding-type-badge">{h.type}</span></td>
                      <td className="td-desc">{h.description || '---'}</td>
                      <td className="td-date">{formatDate(h.purchaseDate)}</td>
                      <td className="td-right">{h.quantity.toFixed(3)}</td>
                      <td className="td-right">{formatCurrency(h.costPerOz)}</td>
                      <td className="td-right">{formatCurrency(tc)}</td>
                      <td className="td-right">{formatCurrency(cv)}</td>
                      <td className="td-right">
                        <div className="td-pl">
                          <span className={pl >= 0 ? 'positive' : 'negative'}>
                            {pl >= 0 ? '+' : ''}{formatCurrency(pl)}
                          </span>
                          <span className={`td-pl-pct ${pl >= 0 ? 'positive' : 'negative'}`}>
                            {formatPercent(plPct)}
                          </span>
                        </div>
                      </td>
                      <td className="td-actions" onClick={(e) => e.stopPropagation()}>
                        <div className="holding-actions">
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => setEditingHolding(h)}
                            title="Edit"
                          >
                            &#9998;
                          </button>
                          <button className="btn btn-sm btn-sell-sm" onClick={() => setSellHolding(h)}>
                            Sell
                          </button>
                          <button
                            className="btn btn-sm btn-ghost-danger"
                            onClick={() => handleDeleteWithConfirm(h)}
                          >
                            &#10005;
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

      {/* Empty State */}
      {holdings.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <CapybaraWave size={140} />
          </div>
          <h3>Hey there, stacker!</h3>
          <p>Ready to track your precious metals? Add your first coin, bar, or round and watch your stack grow!</p>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => setShowAddModal(true)}
          >
            + Add Your First Holding
          </button>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddHolding}
          onSaveMultiple={handleAddMultiple}
          prices={prices}
        />
      )}

      {/* Edit Modal */}
      {editingHolding && (
        <AddModal
          editing={editingHolding}
          onClose={() => setEditingHolding(null)}
          onSave={handleEditHolding}
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

      {/* Detail Modal */}
      {detailHolding && (
        <HoldingDetail
          holding={detailHolding}
          prices={prices}
          onClose={() => setDetailHolding(null)}
          onSell={setSellHolding}
          onEdit={(h) => { setDetailHolding(null); setEditingHolding(h); }}
          onDelete={handleDeleteWithConfirm}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className="modal confirm-modal">
            <div className="modal-header">
              <h2>Delete Holding</h2>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>&#10005;</button>
            </div>
            <div className="modal-body">
              <p className="confirm-text">
                Are you sure you want to permanently delete this holding?
              </p>
              <div className="confirm-item">
                <span className="confirm-item-dot" style={{ background: METALS[deleteConfirm.metal]?.color }} />
                <div>
                  <strong>{deleteConfirm.description || `${METALS[deleteConfirm.metal]?.name} ${deleteConfirm.type}`}</strong>
                  <span className="confirm-item-detail">
                    {deleteConfirm.quantity} oz &middot; {formatCurrency(deleteConfirm.quantity * deleteConfirm.costPerOz)} cost basis
                  </span>
                </div>
              </div>
              <p className="confirm-warning">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
    </svg>
  );
}

function StackIcon({ large }) {
  const size = large ? 56 : 36;
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
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
