import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { usePortfolio } from './hooks/usePortfolio';
import { useTransactions } from './hooks/useTransactions';
import { usePrices } from './hooks/usePrices';
import { useTubes } from './hooks/useTubes';
import { useWishlist } from './hooks/useWishlist';
import { METALS, formatCurrency, formatPercent } from './utils/constants';
import { filterHoldings } from './utils/coinData';
import { useToast } from './components/Toast';
import Charts from './components/Charts';
import AddModal from './components/AddModal';
import SellModal from './components/SellModal';
import TradeModal from './components/TradeModal';
import HoldingDetail from './components/HoldingDetail';
import TransactionHistory from './components/TransactionHistory';
import TubeManager from './components/TubeManager';
import SearchDealers from './components/SearchDealers';
import Wishlist from './components/Wishlist';
import ThemePicker from './components/ThemePicker';
import Login from './components/Login';
import { CapybaraLogo, CapybaraWave, CapybaraSleeping } from './components/CapybaraMascot';

// Animated number component using Framer Motion spring
function AnimatedNumber({ value, format = formatCurrency, className }) {
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => format(v));
  const [text, setText] = useState(format(value));

  useEffect(() => {
    spring.set(value);
    const unsub = display.on('change', setText);
    return unsub;
  }, [value, spring, display]);

  return <span className={className}>{text}</span>;
}

// Page transition variants
const pageTransition = { duration: 0.2, ease: 'easeOut' };

// Modal backdrop + content variants
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};
const modalVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { holdings, addHolding, removeHolding, editHolding, fetchHoldings } = usePortfolio(user);
  const { transactions, createBuyTransaction, createSellTransaction, createTradeTransaction } = useTransactions(user);
  const { prices, loading, lastUpdated, fetchPrices } = usePrices();
  const {
    tubes, createTube, renameTube, updateTubeColor, updateTubeCapacity,
    deleteTube, assignHoldingToTube, tableError: tubeTableError,
  } = useTubes(user);
  const {
    items: wishlistItems, addItem: addWishlistItem,
    updateItem: updateWishlistItem, removeItem: removeWishlistItem,
    tableError: wishlistTableError,
  } = useWishlist(user);
  const toast = useToast();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHolding, setEditingHolding] = useState(null);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [sellHolding, setSellHolding] = useState(null);
  const [detailHolding, setDetailHolding] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sortField, setSortField] = useState('metal');
  const [sortDir, setSortDir] = useState('asc');
  const [showTubeManager, setShowTubeManager] = useState(false);
  const [activeTube, setActiveTube] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragHoldingId, setDragHoldingId] = useState(null);
  const [dragOverTube, setDragOverTube] = useState(null);
  // Page state: 'portfolio' | 'history' | 'search' | 'wishlist'
  const [page, setPage] = useState('portfolio');

  // Spot price flash tracking
  const prevPricesRef = useRef({});
  const [priceFlash, setPriceFlash] = useState({});

  useEffect(() => {
    const prev = prevPricesRef.current;
    const flashes = {};
    let hasFlash = false;
    for (const [key, val] of Object.entries(prices)) {
      if (prev[key] && prev[key] !== val) {
        flashes[key] = val > prev[key] ? 'up' : 'down';
        hasFlash = true;
      }
    }
    prevPricesRef.current = { ...prices };
    if (hasFlash) {
      setPriceFlash(flashes);
      setTimeout(() => setPriceFlash({}), 1200);
    }
  }, [prices]);

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const navigateTo = useCallback((p) => setPage(p), []);

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

  const filteredHoldings = useMemo(() => {
    let list = holdings;
    if (activeTube === 'loose') list = list.filter((h) => !h.tubeId);
    else if (activeTube !== null) list = list.filter((h) => h.tubeId === activeTube);
    if (searchQuery.trim()) list = filterHoldings(list, searchQuery);
    return list;
  }, [holdings, activeTube, searchQuery]);

  const sortedHoldings = useMemo(() => {
    const list = [...filteredHoldings];
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
  }, [filteredHoldings, sortField, sortDir, prices]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronsUpDown size={12} className="sort-icon inactive" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="sort-icon" />
      : <ChevronDown size={12} className="sort-icon" />;
  };

  const handleAddHolding = async (holding) => {
    const created = await addHolding(holding);
    if (created) {
      await createBuyTransaction(created.id);
      toast?.success(`Added ${holding.description || METALS[holding.metal]?.name + ' ' + holding.type}`);
    }
    setShowAddModal(false);
  };

  const handleAddMultiple = async (items) => {
    for (const item of items) {
      const created = await addHolding(item);
      if (created) await createBuyTransaction(created.id);
    }
    toast?.success(`Added ${items.length} holding${items.length > 1 ? 's' : ''}`);
    setShowAddModal(false);
  };

  const handleEditHolding = async (updates) => {
    if (!editingHolding) return;
    await editHolding(editingHolding.id, updates);
    toast?.success('Holding updated');
    setEditingHolding(null);
  };

  const handleDeleteWithConfirm = (holding) => {
    setDeleteConfirm(holding);
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      const name = deleteConfirm.description || `${METALS[deleteConfirm.metal]?.name} ${deleteConfirm.type}`;
      await removeHolding(deleteConfirm.id);
      toast?.success(`Deleted ${name}`);
      setDeleteConfirm(null);
      setDetailHolding(null);
    }
  };

  const handleMoveToTube = async (holdingId, tubeId) => {
    await assignHoldingToTube(holdingId, tubeId);
    await editHolding(holdingId, { tubeId });
  };

  const handleDragStart = (e, holdingId) => {
    setDragHoldingId(holdingId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', holdingId);
  };
  const handleDragEnd = () => {
    setDragHoldingId(null);
    setDragOverTube(null);
  };
  const handleTubeDragOver = (e, tubeId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTube(tubeId);
  };
  const handleTubeDragLeave = () => {
    setDragOverTube(null);
  };
  const handleTubeDrop = async (e, tubeId) => {
    e.preventDefault();
    setDragOverTube(null);
    if (!dragHoldingId) return;
    const targetTubeId = tubeId === 'loose' ? null : tubeId;
    await handleMoveToTube(dragHoldingId, targetTubeId);
    setDragHoldingId(null);
  };

  const handleSell = async (holdingId, sellPrice, notes) => {
    const success = await createSellTransaction(holdingId, sellPrice, notes);
    if (success) {
      toast?.success(`Sold for ${formatCurrency(sellPrice)}`);
      setSellHolding(null);
      await fetchHoldings();
    }
    return success;
  };

  const handleTrade = async (outIds, newHoldings, cashAdded, notes) => {
    const result = await createTradeTransaction(outIds, newHoldings, cashAdded, notes);
    if (result) {
      toast?.success('Trade completed');
      setShowTradeModal(false);
      await fetchHoldings();
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

  // Compute total allocation for metal cards
  const totalPortfolioValue = totals.totalValue || 1;

  const renderPage = () => {
    switch (page) {
      case 'history':
        return (
          <div key="history" className="page-transition">
            <TransactionHistory transactions={transactions} onClose={() => navigateTo('portfolio')} />
          </div>
        );
      case 'search':
        return (
          <div key="search" className="page-transition">
            <SearchDealers prices={prices} onClose={() => navigateTo('portfolio')} />
          </div>
        );
      case 'wishlist':
        return (
          <div key="wishlist" className="page-transition">
            <Wishlist
              items={wishlistItems}
              tableError={wishlistTableError}
              onClose={() => navigateTo('portfolio')}
              onAdd={addWishlistItem}
              onRemove={removeWishlistItem}
              onUpdate={updateWishlistItem}
            />
          </div>
        );
      default:
        return (
          <div key="portfolio" className="page-transition">
            {/* Tube Table Missing Banner */}
            {tubeTableError && (
              <div className="setup-banner">
                <div className="setup-banner-icon">&#9888;</div>
                <div className="setup-banner-content">
                  <strong>Tubes table not found</strong>
                  <p>Run the SQL migration in your Supabase SQL Editor to enable tubes. Copy the contents of <code>sql/006_tubes.sql</code> and run it.</p>
                </div>
              </div>
            )}

            {/* Summary Strip */}
            {holdings.length > 0 && (
              <div className="summary-strip">
                <div className="summary-stat">
                  <span className="summary-stat-label">Portfolio Value</span>
                  <AnimatedNumber value={totals.totalValue} className="summary-stat-value" />
                </div>
                <div className="summary-divider" />
                <div className="summary-stat">
                  <span className="summary-stat-label">Total Cost</span>
                  <AnimatedNumber value={totals.totalCost} className="summary-stat-value dim" />
                </div>
                <div className="summary-divider" />
                <div className="summary-stat">
                  <span className="summary-stat-label">Unrealized P/L</span>
                  <AnimatedNumber
                    value={totals.totalPnl}
                    format={(v) => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`}
                    className={`summary-stat-value ${totals.totalPnl >= 0 ? 'positive' : 'negative'}`}
                  />
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
                  .map(([key, s]) => {
                    const allocationPct = (s.currentValue / totalPortfolioValue) * 100;
                    return (
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
                          <AnimatedNumber value={s.currentValue} className="metal-card-value" />
                          <div className="metal-card-meta">
                            <span>{s.totalOz.toFixed(3)} oz</span>
                            <span className="metal-card-sep">/</span>
                            <span>Spot {formatCurrency(s.spotPrice)}</span>
                          </div>
                        </div>
                        {/* Allocation bar */}
                        <div className="metal-card-alloc">
                          <div className="metal-card-alloc-bar">
                            <div className="metal-card-alloc-fill" style={{ width: `${allocationPct}%`, background: s.color }} />
                          </div>
                          <span className="metal-card-alloc-pct">{allocationPct.toFixed(1)}%</span>
                        </div>
                        {s.totalCost > 0 && (
                          <div className={`metal-card-pnl ${s.pnl >= 0 ? 'positive' : 'negative'}`}>
                            {s.pnl >= 0 ? '+' : ''}{formatCurrency(s.pnl)}
                            <span className="metal-card-pnl-pct">{formatPercent(s.pnlPercent)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Charts */}
            <Charts metalSummaries={metalSummaries} totals={totals} />

            {/* Tube Stack Visual */}
            {holdings.length > 0 && !tubeTableError && (
              <div className="section">
                <div className="section-header">
                  <h2 className="section-title">Your Tubes</h2>
                  <div className="section-header-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowTubeManager(true)}>
                      <TubeIcon /> Manage Tubes
                    </button>
                  </div>
                </div>

                {tubes.length === 0 ? (
                  <div className="tube-empty-state">
                    <TubeIcon />
                    <p>Organize your coins into tubes — just like real coin storage!</p>
                    <p className="tube-empty-hint">Click <strong>Manage Tubes</strong> above to create your first tube, then drag holdings into it.</p>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowTubeManager(true)}>
                      + Create Your First Tube
                    </button>
                  </div>
                ) : (
                  <div className="tube-stack-grid">
                    {tubes.map((t) => {
                      const tubeHoldings = holdings.filter((h) => h.tubeId === t.id);
                      const count = tubeHoldings.length;
                      const fillPct = Math.min((count / t.capacity) * 100, 100);
                      const totalValue = tubeHoldings.reduce((sum, h) => {
                        const spot = prices[h.metal] || METALS[h.metal].defaultPrice;
                        return sum + h.quantity * spot;
                      }, 0);
                      const totalCost = tubeHoldings.reduce((sum, h) => sum + h.quantity * h.costPerOz, 0);
                      const pnl = totalValue - totalCost;
                      return (
                        <div
                          key={t.id}
                          className={`tube-stack-card ${dragOverTube === t.id ? 'drag-over' : ''}`}
                          onDragOver={(e) => handleTubeDragOver(e, t.id)}
                          onDragLeave={handleTubeDragLeave}
                          onDrop={(e) => handleTubeDrop(e, t.id)}
                          onClick={() => setActiveTube(t.id)}
                        >
                          <div className="tube-stack-visual">
                            <div className="tube-stack-cylinder" style={{ '--tube-color': t.color }}>
                              <div className="tube-stack-cylinder-fill" style={{ height: `${fillPct}%` }} />
                              {Array.from({ length: Math.min(count, 10) }).map((_, i) => (
                                <div
                                  key={i}
                                  className="tube-stack-coin"
                                  style={{
                                    bottom: `${(i / t.capacity) * 100}%`,
                                    background: METALS[tubeHoldings[i]?.metal]?.color || t.color,
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="tube-stack-info">
                            <div className="tube-stack-name" style={{ color: t.color }}>{t.name}</div>
                            <div className="tube-stack-fill-text">{count} / {t.capacity}</div>
                            <div className="tube-stack-bar">
                              <div className="tube-stack-bar-fill" style={{ width: `${fillPct}%`, background: t.color }} />
                            </div>
                            <div className="tube-stack-value">
                              {totalValue > 0 ? formatCurrency(totalValue) : '$0.00'}
                            </div>
                            {totalCost > 0 && (
                              <div className={`tube-stack-pnl ${pnl >= 0 ? 'positive' : 'negative'}`}>
                                {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                              </div>
                            )}
                          </div>
                          {count < t.capacity && dragHoldingId && (
                            <div className="tube-stack-drop-hint">Drop here</div>
                          )}
                        </div>
                      );
                    })}
                    {/* Loose pile card */}
                    {(() => {
                      const looseHoldings = holdings.filter((h) => !h.tubeId);
                      const looseValue = looseHoldings.reduce((sum, h) => {
                        const spot = prices[h.metal] || METALS[h.metal].defaultPrice;
                        return sum + h.quantity * spot;
                      }, 0);
                      return looseHoldings.length > 0 && (
                        <div
                          className={`tube-stack-card tube-stack-loose ${dragOverTube === 'loose' ? 'drag-over' : ''}`}
                          onDragOver={(e) => handleTubeDragOver(e, 'loose')}
                          onDragLeave={handleTubeDragLeave}
                          onDrop={(e) => handleTubeDrop(e, 'loose')}
                          onClick={() => setActiveTube('loose')}
                        >
                          <div className="tube-stack-visual">
                            <div className="tube-stack-loose-pile">
                              {looseHoldings.slice(0, 5).map((h, i) => (
                                <div
                                  key={h.id}
                                  className="tube-stack-loose-coin"
                                  style={{
                                    background: METALS[h.metal]?.color || '#888',
                                    transform: `rotate(${(i - 2) * 8}deg) translateY(${i * -3}px)`,
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="tube-stack-info">
                            <div className="tube-stack-name" style={{ color: '#888' }}>Loose</div>
                            <div className="tube-stack-fill-text">{looseHoldings.length} items</div>
                            <div className="tube-stack-value">{formatCurrency(looseValue)}</div>
                          </div>
                        </div>
                      );
                    })()}
                    {/* Quick add tube card */}
                    <div className="tube-stack-card tube-stack-add" onClick={() => setShowTubeManager(true)}>
                      <div className="tube-stack-add-icon">+</div>
                      <div className="tube-stack-add-text">Add Tube</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Holdings Table */}
            {holdings.length > 0 && (
              <div className="section">
                <div className="section-header">
                  <h2 className="section-title">Holdings</h2>
                  <span className="section-count">{filteredHoldings.length} position{filteredHoldings.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Search Bar */}
                <div className="holdings-search">
                  <SearchIcon />
                  <input
                    className="holdings-search-input"
                    type="text"
                    placeholder='Search... e.g. "gold eagles", "silver bars over 5oz", "2024 maple"'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button className="holdings-search-clear" onClick={() => setSearchQuery('')}>
                      &#10005;
                    </button>
                  )}
                </div>

                {/* Tube Tabs */}
                {tubes.length > 0 && (
                  <div className="tube-tabs">
                    <button
                      className={`tube-tab ${activeTube === null ? 'active' : ''}`}
                      onClick={() => setActiveTube(null)}
                    >
                      All
                      <span className="tube-tab-count">{holdings.length}</span>
                    </button>
                    {tubes.map((t) => {
                      const count = holdings.filter((h) => h.tubeId === t.id).length;
                      const fillPct = Math.min((count / t.capacity) * 100, 100);
                      return (
                        <button
                          key={t.id}
                          className={`tube-tab ${activeTube === t.id ? 'active' : ''} ${dragOverTube === t.id ? 'drag-over' : ''}`}
                          onClick={() => setActiveTube(t.id)}
                          onDragOver={(e) => handleTubeDragOver(e, t.id)}
                          onDragLeave={handleTubeDragLeave}
                          onDrop={(e) => handleTubeDrop(e, t.id)}
                        >
                          <span className="tube-tab-indicator" style={{ '--tube-color': t.color }}>
                            <span className="tube-tab-fill" style={{ height: `${fillPct}%` }} />
                          </span>
                          {t.name}
                          <span className="tube-tab-count">{count}/{t.capacity}</span>
                        </button>
                      );
                    })}
                    <button
                      className={`tube-tab ${activeTube === 'loose' ? 'active' : ''} ${dragOverTube === 'loose' ? 'drag-over' : ''}`}
                      onClick={() => setActiveTube('loose')}
                      onDragOver={(e) => handleTubeDragOver(e, 'loose')}
                      onDragLeave={handleTubeDragLeave}
                      onDrop={(e) => handleTubeDrop(e, 'loose')}
                    >
                      Loose
                      <span className="tube-tab-count">{holdings.filter((h) => !h.tubeId).length}</span>
                    </button>
                  </div>
                )}
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
                          <tr
                            key={h.id}
                            className={`tr-clickable ${dragHoldingId === h.id ? 'tr-dragging' : ''}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, h.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => setDetailHolding(h)}
                          >
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
                                {tubes.length > 0 && (
                                  <TubeDropdown
                                    tubes={tubes}
                                    holdings={holdings}
                                    currentTubeId={h.tubeId}
                                    onMove={(tubeId) => handleMoveToTube(h.id, tubeId)}
                                  />
                                )}
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
          </div>
        );
    }
  };

  return (
    <div className="app">
      {/* Header — always visible */}
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
            <RefreshIcon spinning={loading} />
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
            className={`btn ${page === 'search' ? 'btn-active' : 'btn-ghost'}`}
            onClick={() => navigateTo(page === 'search' ? 'portfolio' : 'search')}
            title="Search dealers"
          >
            <DealerSearchIcon /> Search
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => setShowTubeManager(true)}
            title="Manage Tubes"
          >
            <TubeIcon /> Tubes
          </button>
          <button
            className={`btn ${page === 'wishlist' ? 'btn-active' : 'btn-ghost'}`}
            onClick={() => navigateTo(page === 'wishlist' ? 'portfolio' : 'wishlist')}
            title="Wishlist"
          >
            <WishlistIcon /> Wishlist
            {wishlistItems.length > 0 && (
              <span className="nav-badge">{wishlistItems.length}</span>
            )}
          </button>
          <button
            className={`btn ${page === 'history' ? 'btn-active' : 'btn-ghost'}`}
            onClick={() => navigateTo(page === 'history' ? 'portfolio' : 'history')}
          >
            History
          </button>
          <div className="header-divider" />
          <div className="header-user">
            <ThemePicker onSignOut={signOut} signOutLabel={user.isGuest ? 'Exit' : 'Sign Out'}>
              <div className="header-avatar">
                {user.isGuest ? '?' : (user.email || '?')[0].toUpperCase()}
              </div>
            </ThemePicker>
            {user.isGuest && <span className="guest-label">Guest</span>}
          </div>
        </nav>
      </header>

      {/* Spot Prices Bar — always visible */}
      <div className="spot-bar">
        {Object.entries(metalSummaries).map(([key, s]) => (
          <div key={key} className={`spot-item ${priceFlash[key] ? 'flash-' + priceFlash[key] : ''}`}>
            <span className="spot-dot" style={{ background: s.color }} />
            <span className="spot-name">{s.name}</span>
            <span className="spot-price">{formatCurrency(s.spotPrice)}</span>
            <span className="spot-unit">/oz</span>
          </div>
        ))}
      </div>

      {/* Page Content */}
      {renderPage()}

      {/* Modals — rendered with AnimatePresence */}
      <AnimatePresence>
        {showAddModal && (
          <AddModal
            key="add-modal"
            onClose={() => setShowAddModal(false)}
            onSave={handleAddHolding}
            onSaveMultiple={handleAddMultiple}
            prices={prices}
            tubes={tubes}
            holdings={holdings}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingHolding && (
          <AddModal
            key="edit-modal"
            editing={editingHolding}
            onClose={() => setEditingHolding(null)}
            onSave={handleEditHolding}
            prices={prices}
            tubes={tubes}
            holdings={holdings}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sellHolding && (
          <SellModal
            key="sell-modal"
            holding={sellHolding}
            prices={prices}
            onClose={() => setSellHolding(null)}
            onSell={handleSell}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTradeModal && (
          <TradeModal
            key="trade-modal"
            holdings={holdings}
            prices={prices}
            onClose={() => setShowTradeModal(false)}
            onTrade={handleTrade}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailHolding && (
          <HoldingDetail
            key="detail-modal"
            holding={detailHolding}
            prices={prices}
            tubes={tubes}
            holdings={holdings}
            onClose={() => setDetailHolding(null)}
            onSell={setSellHolding}
            onEdit={(h) => { setDetailHolding(null); setEditingHolding(h); }}
            onDelete={handleDeleteWithConfirm}
            onMoveToTube={(tubeId) => handleMoveToTube(detailHolding.id, tubeId)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTubeManager && (
          <TubeManager
            key="tube-modal"
            tubes={tubes}
            holdings={holdings}
            onCreate={createTube}
            onRename={renameTube}
            onUpdateColor={updateTubeColor}
            onUpdateCapacity={updateTubeCapacity}
            onDelete={deleteTube}
            onClose={() => setShowTubeManager(false)}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            key="delete-overlay"
            className="modal-overlay"
            onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className="modal confirm-modal"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RefreshIcon({ spinning }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={spinning ? 'spin-icon' : ''}
    >
      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
    </svg>
  );
}

function DealerSearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function TubeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="2" width="10" height="20" rx="3" />
      <line x1="7" y1="6" x2="17" y2="6" />
      <line x1="7" y1="18" x2="17" y2="18" />
    </svg>
  );
}

function WishlistIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function TubeDropdown({ tubes, holdings, currentTubeId, onMove }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const getCount = (tubeId) => holdings.filter((h) => h.tubeId === tubeId).length;

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        left: Math.min(rect.left, window.innerWidth - 200),
      });
    }
  }, [open]);

  return (
    <div className="tube-dropdown-wrap">
      <button
        ref={triggerRef}
        className="btn btn-sm btn-ghost tube-dropdown-trigger"
        onClick={() => setOpen(!open)}
        title="Move to tube"
      >
        {currentTubeId ? (
          <span
            className="tube-dropdown-dot"
            style={{ background: tubes.find((t) => t.id === currentTubeId)?.color || '#888' }}
          />
        ) : (
          <TubeIcon />
        )}
      </button>
      {open && createPortal(
        <>
          <div className="tube-dropdown-backdrop" onClick={() => setOpen(false)} />
          <div
            className="tube-dropdown-menu"
            style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}
          >
            <button
              className={`tube-dropdown-item ${!currentTubeId ? 'active' : ''}`}
              onClick={() => { onMove(null); setOpen(false); }}
            >
              <span className="tube-dropdown-item-dot" style={{ background: '#666' }} />
              Loose
            </button>
            {tubes.map((t) => {
              const count = getCount(t.id);
              const isFull = count >= t.capacity;
              return (
                <button
                  key={t.id}
                  className={`tube-dropdown-item ${currentTubeId === t.id ? 'active' : ''} ${isFull && currentTubeId !== t.id ? 'tube-item-full' : ''}`}
                  onClick={() => { onMove(t.id); setOpen(false); }}
                >
                  <span className="tube-dropdown-item-dot" style={{ background: t.color }} />
                  <span className="tube-dropdown-item-name">{t.name}</span>
                  <span className="tube-dropdown-item-count">{count}/{t.capacity}</span>
                </button>
              );
            })}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
