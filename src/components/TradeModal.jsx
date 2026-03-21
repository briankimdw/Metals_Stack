import { useState, useMemo } from 'react';
import { METALS, FORM_TYPES, formatCurrency } from '../utils/constants';

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

  const selectedHoldings = useMemo(
    () => holdings.filter((h) => selectedIds.has(h.id)),
    [holdings, selectedIds],
  );

  const totalTradedCost = useMemo(
    () => selectedHoldings.reduce((s, h) => s + h.quantity * h.costPerOz, 0),
    [selectedHoldings],
  );

  const cash = parseFloat(cashAdded) || 0;
  const totalBasis = totalTradedCost + cash;

  // Calculate total weight of received items
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

    // Build new holdings with cost basis split proportionally by weight
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

    const result = await onTrade(
      Array.from(selectedIds),
      newHoldings,
      cash,
      notes,
    );
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

        {/* Step indicator */}
        <div className="trade-steps">
          {STEPS.map((label, i) => (
            <div key={label} className={`trade-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <span className="trade-step-num">{i < step ? '✓' : i + 1}</span>
              <span className="trade-step-label">{label}</span>
            </div>
          ))}
        </div>

        <div className="modal-body">
          {/* Step 0: Select items to trade away */}
          {step === 0 && (
            <div className="trade-select">
              <p className="trade-hint">Select the holdings you want to trade away:</p>
              <div className="trade-items-list">
                {holdings.map((h) => {
                  const metal = METALS[h.metal];
                  const isSelected = selectedIds.has(h.id);
                  return (
                    <label key={h.id} className={`trade-item ${isSelected ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleHolding(h.id)}
                      />
                      <span className="holding-metal-dot" style={{ background: metal.color }} />
                      <div className="trade-item-info">
                        <span className="trade-item-name">
                          {metal.name} — {h.description || h.type}
                        </span>
                        <span className="trade-item-detail">
                          {h.quantity} oz · {formatCurrency(h.costPerOz)}/oz
                          · Total: {formatCurrency(h.quantity * h.costPerOz)}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
              {selectedIds.size > 0 && (
                <div className="form-preview" style={{ marginTop: 16 }}>
                  <div className="form-preview-row">
                    <span>Trading {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''}</span>
                    <strong>{formatCurrency(totalTradedCost)}</strong>
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginTop: 16 }}>
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
            <div className="trade-receiving">
              <p className="trade-hint">
                What are you receiving? Add all items.
                Cost basis ({formatCurrency(totalBasis)}) will be split by weight.
              </p>

              {receivedItems.map((item, index) => (
                <div key={item.id} className="trade-received-card">
                  <div className="trade-received-header">
                    <span className="trade-received-num">Item {index + 1}</span>
                    {receivedItems.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost-danger"
                        onClick={() => removeReceivedItem(item.id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Metal</label>
                      <select className="form-select" value={item.metal}
                        onChange={(e) => updateReceivedItem(item.id, 'metal', e.target.value)}>
                        {Object.entries(METALS).map(([key, m]) => (
                          <option key={key} value={key}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Type</label>
                      <select className="form-select" value={item.type}
                        onChange={(e) => updateReceivedItem(item.id, 'type', e.target.value)}>
                        {FORM_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
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
                </div>
              ))}

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
                    <span>Cost Basis per oz</span>
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
            <div className="trade-review">
              <h3 className="trade-review-title">Trading Away</h3>
              <div className="trade-review-items">
                {selectedHoldings.map((h) => {
                  const metal = METALS[h.metal];
                  return (
                    <div key={h.id} className="trade-review-item">
                      <span className="holding-metal-dot" style={{ background: metal.color }} />
                      <span>{metal.name} — {h.description || h.type}</span>
                      <span className="trade-review-qty">{h.quantity} oz · {formatCurrency(h.quantity * h.costPerOz)}</span>
                    </div>
                  );
                })}
              </div>

              {cash > 0 && (
                <div className="trade-review-cash">
                  + Cash added: <strong>{formatCurrency(cash)}</strong>
                </div>
              )}

              <div className="form-preview" style={{ margin: '12px 0' }}>
                <div className="form-preview-row">
                  <span>Total Cost Basis</span>
                  <strong>{formatCurrency(totalBasis)}</strong>
                </div>
              </div>

              <h3 className="trade-review-title" style={{ marginTop: 16 }}>Receiving</h3>
              <div className="trade-review-items">
                {receivedItems.filter((i) => parseFloat(i.quantity) > 0).map((item) => {
                  const metal = METALS[item.metal];
                  const qty = parseFloat(item.quantity) || 0;
                  const proportion = totalReceivedOz > 0 ? qty / totalReceivedOz : 0;
                  const itemBasis = totalBasis * proportion;
                  const costPerOz = qty > 0 ? itemBasis / qty : 0;

                  return (
                    <div key={item.id} className="trade-review-item">
                      <span className="holding-metal-dot" style={{ background: metal.color }} />
                      <span>{metal.name} — {item.description || item.type}</span>
                      <span className="trade-review-qty">
                        {qty} oz · {formatCurrency(costPerOz)}/oz
                      </span>
                    </div>
                  );
                })}
              </div>

              {notes && (
                <div className="history-item-notes" style={{ marginTop: 12 }}>"{notes}"</div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step > 0 && (
            <button type="button" className="btn" onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          {step < 2 ? (
            <button type="button" className="btn btn-primary" onClick={handleNext}
              disabled={!canProceed()}>
              Next
            </button>
          ) : (
            <button type="button" className="btn btn-trade" onClick={handleSubmit}
              disabled={submitting}>
              {submitting ? 'Processing...' : 'Confirm Trade'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
