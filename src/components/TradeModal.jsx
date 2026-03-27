import { useState, useMemo } from 'react';
import { METALS, FORM_TYPES, formatCurrency, formatPercent } from '../utils/constants';

const COMMON_SIZES = [
  { label: '1/10', value: 0.1 },
  { label: '1/4', value: 0.25 },
  { label: '1/2', value: 0.5 },
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '5', value: 5 },
  { label: '10', value: 10 },
];

const STEPS = ['Trade Away', 'Receiving', 'Review'];

const emptyItem = () => ({
  id: Date.now() + Math.random(),
  metal: 'gold',
  type: 'coin',
  description: '',
  quantity: '',
  purchaseDate: new Date().toISOString().split('T')[0],
});

export default function TradeModal({ holdings, prices, onClose, onTrade }) {
  const [step, setStep] = useState(0);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [cashAdded, setCashAdded] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receivedItems, setReceivedItems] = useState([emptyItem()]);
  const [searchQuery, setSearchQuery] = useState('');
  const [metalFilter, setMetalFilter] = useState('all');

  const selectedHoldings = useMemo(
    () => holdings.filter((h) => selectedIds.has(h.id)),
    [holdings, selectedIds],
  );

  const filteredHoldings = useMemo(() => {
    return holdings.filter((h) => {
      if (metalFilter !== 'all' && h.metal !== metalFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const metal = METALS[h.metal];
        const haystack = `${metal.name} ${h.description} ${h.type}`.toLowerCase();
        return haystack.includes(q);
      }
      return true;
    });
  }, [holdings, searchQuery, metalFilter]);

  const getSpot = (metal) => prices[metal] || METALS[metal]?.defaultPrice || 0;

  const totalTradedCost = useMemo(
    () => selectedHoldings.reduce((s, h) => s + h.quantity * h.costPerOz, 0),
    [selectedHoldings],
  );

  const totalTradedMarket = useMemo(
    () => selectedHoldings.reduce((s, h) => s + h.quantity * getSpot(h.metal), 0),
    [selectedHoldings, prices],
  );

  const totalGL = totalTradedMarket - totalTradedCost;

  const cash = parseFloat(cashAdded) || 0;
  const totalBasis = totalTradedCost + cash;

  const totalReceivedOz = useMemo(
    () => receivedItems.reduce((s, item) => s + (parseFloat(item.quantity) || 0), 0),
    [receivedItems],
  );

  const toggleHolding = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const filtered = filteredHoldings.map((h) => h.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = filtered.every((id) => next.has(id));
      if (allSelected) filtered.forEach((id) => next.delete(id));
      else filtered.forEach((id) => next.add(id));
      return next;
    });
  };

  const updateReceivedItem = (id, field, value) => {
    setReceivedItems((prev) =>
      prev.map((item) => item.id === id ? { ...item, [field]: value } : item)
    );
  };

  const addReceivedItem = () => {
    setReceivedItems((prev) => [...prev, emptyItem()]);
  };

  const removeReceivedItem = (id) => {
    if (receivedItems.length <= 1) return;
    setReceivedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleNext = () => setStep((s) => Math.min(s + 1, 2));

  const handleSubmit = async () => {
    setSubmitting(true);
    const newHoldings = receivedItems.map((item) => {
      const qty = parseFloat(item.quantity) || 0;
      const proportion = totalReceivedOz > 0 ? qty / totalReceivedOz : 0;
      const itemBasis = totalBasis * proportion;
      const costPerOz = qty > 0 ? itemBasis / qty : 0;
      return {
        metal: item.metal,
        type: item.type,
        description: item.description,
        quantity: qty,
        costPerOz: parseFloat(costPerOz.toFixed(4)),
        purchaseDate: item.purchaseDate,
      };
    }).filter((h) => h.quantity > 0);

    const result = await onTrade(Array.from(selectedIds), newHoldings, cash, notes);
    if (!result) setSubmitting(false);
  };

  const canProceed = () => {
    if (step === 0) return selectedIds.size > 0;
    if (step === 1) return receivedItems.some((item) => parseFloat(item.quantity) > 0);
    return true;
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal trade-modal">
        <div className="modal-header">
          <h2>Trade Holdings</h2>
          <button className="modal-close" onClick={onClose}>&#10005;</button>
        </div>

        {/* Connected step indicator */}
        <div className="trade-stepper">
          {STEPS.map((label, i) => (
            <div key={label} className="trade-stepper-item">
              {i > 0 && <div className={`trade-stepper-line ${i <= step ? 'filled' : ''}`} />}
              <div className={`trade-stepper-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
                {i < step ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : i + 1}
              </div>
              <span className="trade-stepper-label">{label}</span>
            </div>
          ))}
        </div>

        <div className="modal-body">
          {/* Step 0: Select items to trade away */}
          {step === 0 && (
            <div className="trade-step-content" key="step0">
              <p className="trade-hint">Select the holdings you want to trade away:</p>

              {/* Search + metal filters */}
              {holdings.length > 3 && (
                <div className="trade-filter-bar">
                  <div className="trade-search-wrap">
                    <svg className="trade-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      className="trade-search-input"
                      placeholder="Search holdings..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button className="trade-search-clear" onClick={() => setSearchQuery('')}>&#10005;</button>
                    )}
                  </div>
                  <div className="trade-metal-filters">
                    <button
                      className={`trade-metal-pill ${metalFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setMetalFilter('all')}
                    >All</button>
                    {Object.entries(METALS).map(([key, m]) => (
                      <button
                        key={key}
                        className={`trade-metal-pill ${metalFilter === key ? 'active' : ''}`}
                        onClick={() => setMetalFilter(key)}
                        style={metalFilter === key ? { borderColor: m.color, color: m.color } : {}}
                      >
                        <span className="holding-metal-dot" style={{ background: m.color }} />
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Select all toggle */}
              {filteredHoldings.length > 1 && (
                <button className="btn btn-sm trade-select-all" onClick={selectAll}>
                  {filteredHoldings.every((h) => selectedIds.has(h.id)) ? 'Deselect All' : 'Select All'}
                </button>
              )}

              <div className="trade-items-list">
                {filteredHoldings.map((h) => {
                  const metal = METALS[h.metal];
                  const isSelected = selectedIds.has(h.id);
                  const spot = getSpot(h.metal);
                  const costBasis = h.quantity * h.costPerOz;
                  const marketValue = h.quantity * spot;
                  const gl = marketValue - costBasis;
                  const glPct = costBasis > 0 ? (gl / costBasis) * 100 : 0;

                  return (
                    <label key={h.id} className={`trade-item ${isSelected ? 'selected' : ''}`}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleHolding(h.id)} />
                      <span className="holding-metal-dot" style={{ background: metal.color }} />
                      <div className="trade-item-info">
                        <span className="trade-item-name">
                          {metal.name} — {h.description || h.type}
                        </span>
                        <span className="trade-item-detail">
                          {h.quantity} oz &middot; Cost: {formatCurrency(costBasis)} &middot; Market: {formatCurrency(marketValue)}
                        </span>
                        <span className={`trade-item-gl ${gl >= 0 ? 'gain' : 'loss'}`}>
                          {gl >= 0 ? '+' : ''}{formatCurrency(gl)} ({formatPercent(glPct)})
                        </span>
                      </div>
                    </label>
                  );
                })}
                {filteredHoldings.length === 0 && (
                  <div className="trade-empty-filter">No holdings match your search.</div>
                )}
              </div>

              {/* Summary of selected */}
              {selectedIds.size > 0 && (
                <div className="form-preview trade-selection-summary">
                  <div className="form-preview-row">
                    <span>Trading {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''}</span>
                    <strong>{formatCurrency(totalTradedCost)}</strong>
                  </div>
                  <div className="form-preview-row">
                    <span>Market Value</span>
                    <strong>{formatCurrency(totalTradedMarket)}</strong>
                  </div>
                  <div className="form-preview-row">
                    <span>Gain / Loss</span>
                    <strong style={{ color: totalGL >= 0 ? '#4ade80' : '#f87171' }}>
                      {totalGL >= 0 ? '+' : ''}{formatCurrency(totalGL)}
                    </strong>
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">Additional Cash Paid</label>
                <div className="form-input-group">
                  <span className="form-input-prefix">$</span>
                  <input className="form-input" type="number" step="0.01" min="0"
                    placeholder="0.00" value={cashAdded}
                    onChange={(e) => setCashAdded(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: What you're receiving */}
          {step === 1 && (
            <div className="trade-step-content" key="step1">
              <p className="trade-hint">
                What are you receiving? Cost basis ({formatCurrency(totalBasis)}) splits by weight.
              </p>

              {receivedItems.map((item, index) => {
                const metalColor = METALS[item.metal]?.color || '#666';
                return (
                  <div key={item.id} className="trade-received-card" style={{ borderLeftColor: metalColor }}>
                    <div className="trade-received-header">
                      <span className="trade-received-num">Item {index + 1}</span>
                      {receivedItems.length > 1 && (
                        <button type="button" className="btn btn-sm btn-ghost-danger" onClick={() => removeReceivedItem(item.id)}>
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Metal pills */}
                    <div className="form-group">
                      <label className="form-label">Metal</label>
                      <div className="trade-pill-row">
                        {Object.entries(METALS).map(([key, m]) => (
                          <button
                            key={key}
                            type="button"
                            className={`trade-pill ${item.metal === key ? 'active' : ''}`}
                            style={item.metal === key ? { borderColor: m.color, color: m.color, background: `${m.color}12` } : {}}
                            onClick={() => updateReceivedItem(item.id, 'metal', key)}
                          >
                            <span className="holding-metal-dot" style={{ background: m.color }} />
                            {m.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Type pills */}
                    <div className="form-group">
                      <label className="form-label">Type</label>
                      <div className="trade-pill-row">
                        {FORM_TYPES.map((t) => (
                          <button
                            key={t.value}
                            type="button"
                            className={`trade-pill ${item.type === t.value ? 'active' : ''}`}
                            onClick={() => updateReceivedItem(item.id, 'type', t.value)}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <input className="form-input" type="text"
                        placeholder="e.g. 2024 American Eagle..."
                        value={item.description}
                        onChange={(e) => updateReceivedItem(item.id, 'description', e.target.value)} />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Weight (troy oz)</label>
                      <div className="size-presets">
                        {COMMON_SIZES.map((s) => (
                          <button
                            key={s.value}
                            type="button"
                            className={`size-btn ${parseFloat(item.quantity) === s.value ? 'active' : ''}`}
                            onClick={() => updateReceivedItem(item.id, 'quantity', String(s.value))}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                      <input className="form-input" type="number" step="0.001" min="0"
                        placeholder="Custom weight..."
                        value={item.quantity}
                        onChange={(e) => updateReceivedItem(item.id, 'quantity', e.target.value)}
                        style={{ marginTop: 6 }} />
                    </div>

                    {/* Live preview */}
                    {parseFloat(item.quantity) > 0 && (
                      <div className="trade-item-preview">
                        <span className="holding-metal-dot" style={{ background: metalColor }} />
                        <span className="trade-item-preview-text">
                          {METALS[item.metal].name} {item.type} — {item.description || '(no description)'}
                        </span>
                        <span className="trade-item-preview-oz">{item.quantity} oz</span>
                      </div>
                    )}
                  </div>
                );
              })}

              <button type="button" className="btn trade-add-btn" onClick={addReceivedItem}>
                + Add Another Item
              </button>

              {totalReceivedOz > 0 && (
                <div className="form-preview" style={{ marginTop: 12 }}>
                  <div className="form-preview-row">
                    <span>Total Receiving</span>
                    <strong>{totalReceivedOz.toFixed(3)} oz across {receivedItems.filter(i => parseFloat(i.quantity) > 0).length} item(s)</strong>
                  </div>
                  <div className="form-preview-row">
                    <span>Avg Cost Basis</span>
                    <strong>{formatCurrency(totalBasis / totalReceivedOz)}/oz</strong>
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">Notes</label>
                <input className="form-input" type="text"
                  placeholder="e.g. Traded at local coin shop..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <div className="trade-step-content" key="step2">
              <div className="trade-review-flow">
                {/* Trading Away */}
                <div className="trade-review-side">
                  <div className="trade-review-badge out">TRADING AWAY</div>
                  {selectedHoldings.map((h) => {
                    const metal = METALS[h.metal];
                    const spot = getSpot(h.metal);
                    const costBasis = h.quantity * h.costPerOz;
                    const marketValue = h.quantity * spot;
                    const gl = marketValue - costBasis;
                    return (
                      <div key={h.id} className="trade-review-card">
                        <span className="holding-metal-dot" style={{ background: metal.color }} />
                        <div className="trade-review-card-body">
                          <div className="trade-review-card-name">{metal.name} — {h.description || h.type}</div>
                          <div className="trade-review-card-detail">
                            {h.quantity} oz &middot; {formatCurrency(marketValue)}
                          </div>
                          <span className={`trade-item-gl ${gl >= 0 ? 'gain' : 'loss'}`}>
                            {gl >= 0 ? '+' : ''}{formatCurrency(gl)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {cash > 0 && (
                    <div className="trade-review-cash-row">+ {formatCurrency(cash)} cash</div>
                  )}
                </div>

                {/* Arrow */}
                <div className="trade-review-arrow">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>

                {/* Receiving */}
                <div className="trade-review-side">
                  <div className="trade-review-badge in">RECEIVING</div>
                  {receivedItems.filter((i) => parseFloat(i.quantity) > 0).map((item) => {
                    const metal = METALS[item.metal];
                    const qty = parseFloat(item.quantity) || 0;
                    const proportion = totalReceivedOz > 0 ? qty / totalReceivedOz : 0;
                    const itemBasis = totalBasis * proportion;
                    const costPerOz = qty > 0 ? itemBasis / qty : 0;
                    return (
                      <div key={item.id} className="trade-review-card">
                        <span className="holding-metal-dot" style={{ background: metal.color }} />
                        <div className="trade-review-card-body">
                          <div className="trade-review-card-name">{metal.name} — {item.description || item.type}</div>
                          <div className="trade-review-card-detail">
                            {qty} oz &middot; {formatCurrency(costPerOz)}/oz
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="form-preview trade-review-summary">
                <div className="form-preview-row">
                  <span>Market Value Out</span>
                  <strong>{formatCurrency(totalTradedMarket)}</strong>
                </div>
                {cash > 0 && (
                  <div className="form-preview-row">
                    <span>Cash Added</span>
                    <strong>{formatCurrency(cash)}</strong>
                  </div>
                )}
                <div className="form-preview-row">
                  <span>Gain / Loss on Traded Items</span>
                  <strong style={{ color: totalGL >= 0 ? '#4ade80' : '#f87171' }}>
                    {totalGL >= 0 ? '+' : ''}{formatCurrency(totalGL)}
                  </strong>
                </div>
                {totalReceivedOz > 0 && (
                  <div className="form-preview-row">
                    <span>New Avg Cost Basis</span>
                    <strong>{formatCurrency(totalBasis / totalReceivedOz)}/oz</strong>
                  </div>
                )}
              </div>

              {notes && (
                <div className="history-item-notes" style={{ marginTop: 12 }}>"{notes}"</div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step > 0 && (
            <button type="button" className="btn" onClick={() => setStep((s) => s - 1)}>Back</button>
          )}
          <div style={{ flex: 1 }} />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          {step < 2 ? (
            <button type="button" className="btn btn-primary" onClick={handleNext} disabled={!canProceed()}>
              Next
            </button>
          ) : (
            <button type="button" className="btn btn-trade" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Processing...' : 'Confirm Trade'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
