import { useState, useMemo } from 'react';
import { METALS, FORM_TYPES, formatCurrency } from '../utils/constants';

const STEPS = ['Select Items', 'New Holding', 'Review'];

export default function TradeModal({ holdings, prices, onClose, onTrade }) {
  const [step, setStep] = useState(0);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [cashAdded, setCashAdded] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    metal: 'gold',
    type: 'coin',
    description: '',
    quantity: '',
    costPerOz: '',
    purchaseDate: new Date().toISOString().split('T')[0],
  });

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const selectedHoldings = useMemo(
    () => holdings.filter((h) => selectedIds.has(h.id)),
    [holdings, selectedIds],
  );

  const totalTradedCost = useMemo(
    () => selectedHoldings.reduce((s, h) => s + h.quantity * h.costPerOz, 0),
    [selectedHoldings],
  );

  const cash = parseFloat(cashAdded) || 0;
  const qty = parseFloat(form.quantity) || 0;
  const autoCostPerOz = qty > 0 ? (totalTradedCost + cash) / qty : 0;

  const toggleHolding = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleNext = () => {
    if (step === 1 && !form.costPerOz) {
      set('costPerOz', autoCostPerOz.toFixed(2));
    }
    setStep((s) => Math.min(s + 1, 2));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const costPerOz = parseFloat(form.costPerOz) || autoCostPerOz;
    const result = await onTrade(
      Array.from(selectedIds),
      {
        metal: form.metal,
        type: form.type,
        description: form.description,
        quantity: qty,
        costPerOz,
        purchaseDate: form.purchaseDate,
      },
      cash,
      notes,
    );
    if (!result) setSubmitting(false);
  };

  const canProceed = () => {
    if (step === 0) return selectedIds.size > 0;
    if (step === 1) return qty > 0;
    return true;
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal trade-modal">
        <div className="modal-header">
          <h2>Trade Holdings</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
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
          {/* Step 0: Select items to trade */}
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
                      <span className="holding-metal-dot" style={{ background: `var(--${h.metal})` }} />
                      <div className="trade-item-info">
                        <span className="trade-item-name">
                          {metal.name} — {h.description || h.type}
                        </span>
                        <span className="trade-item-detail">
                          {h.quantity} oz · Cost: {formatCurrency(h.costPerOz)}/oz
                          · Total: {formatCurrency(h.quantity * h.costPerOz)}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
              {selectedIds.size > 0 && (
                <div className="form-preview" style={{ marginTop: 16 }}>
                  Trading {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''}
                  · Combined cost: <strong>{formatCurrency(totalTradedCost)}</strong>
                </div>
              )}
            </div>
          )}

          {/* Step 1: New holding details */}
          {step === 1 && (
            <div className="trade-new-holding">
              <p className="trade-hint">What are you receiving in the trade?</p>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Metal</label>
                  <select className="form-select" value={form.metal}
                    onChange={(e) => set('metal', e.target.value)}>
                    {Object.entries(METALS).map(([key, m]) => (
                      <option key={key} value={key}>{m.name} ({m.symbol})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={form.type}
                    onChange={(e) => set('type', e.target.value)}>
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
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Quantity (troy oz)</label>
                  <input className="form-input" type="number" step="0.001" min="0"
                    placeholder="1.000" value={form.quantity}
                    onChange={(e) => set('quantity', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Additional Cash Paid</label>
                  <div className="form-input-group">
                    <span className="form-input-prefix">$</span>
                    <input className="form-input" type="number" step="0.01" min="0"
                      placeholder="0.00" value={cashAdded}
                      onChange={(e) => setCashAdded(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Cost per oz (auto-calculated from trade)</label>
                <div className="form-input-group">
                  <span className="form-input-prefix">$</span>
                  <input className="form-input" type="number" step="0.01" min="0"
                    placeholder={autoCostPerOz.toFixed(2)}
                    value={form.costPerOz}
                    onChange={(e) => set('costPerOz', e.target.value)} />
                </div>
                {qty > 0 && (
                  <p className="trade-cost-hint">
                    Auto: ({formatCurrency(totalTradedCost)} traded + {formatCurrency(cash)} cash) / {qty} oz = <strong>{formatCurrency(autoCostPerOz)}/oz</strong>
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date"
                  value={form.purchaseDate}
                  onChange={(e) => set('purchaseDate', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
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
                      <span className="holding-metal-dot" style={{ background: `var(--${h.metal})` }} />
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

              <h3 className="trade-review-title" style={{ marginTop: 20 }}>Receiving</h3>
              <div className="trade-review-items">
                <div className="trade-review-item">
                  <span className="holding-metal-dot" style={{ background: `var(--${form.metal})` }} />
                  <span>{METALS[form.metal].name} — {form.description || form.type}</span>
                  <span className="trade-review-qty">
                    {qty} oz · {formatCurrency(parseFloat(form.costPerOz) || autoCostPerOz)}/oz
                  </span>
                </div>
              </div>

              <div className="form-preview" style={{ marginTop: 16 }}>
                New cost basis: <strong>
                  {formatCurrency((parseFloat(form.costPerOz) || autoCostPerOz) * qty)}
                </strong>
                {' '}({formatCurrency(parseFloat(form.costPerOz) || autoCostPerOz)}/oz)
              </div>
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
