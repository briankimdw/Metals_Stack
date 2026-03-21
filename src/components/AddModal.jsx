import { useState } from 'react';
import { METALS, FORM_TYPES } from '../utils/constants';

const COMMON_SIZES = [
  { label: '1/10 oz', value: 0.1 },
  { label: '1/4 oz', value: 0.25 },
  { label: '1/2 oz', value: 0.5 },
  { label: '1 oz', value: 1 },
  { label: '2 oz', value: 2 },
  { label: '5 oz', value: 5 },
  { label: '10 oz', value: 10 },
  { label: '1 kg', value: 32.151 },
];

export default function AddModal({ onClose, onSave, editing, prices }) {
  const [form, setForm] = useState({
    metal: editing?.metal || 'gold',
    type: editing?.type || 'coin',
    description: editing?.description || '',
    quantity: editing?.quantity ?? '',
    purchaseDate: editing?.purchaseDate || new Date().toISOString().split('T')[0],
    notes: editing?.notes || '',
  });

  // Cost entry mode: 'per-oz' or 'total'
  const [costMode, setCostMode] = useState('total');
  const [costPerOz, setCostPerOz] = useState(editing?.costPerOz ?? '');
  const [totalPaid, setTotalPaid] = useState(
    editing ? String((editing.quantity * editing.costPerOz).toFixed(2)) : ''
  );

  const qty = parseFloat(form.quantity) || 0;
  const spotPrice = prices[form.metal] || METALS[form.metal].defaultPrice;

  // Compute effective cost/oz from either mode
  let effectiveCostPerOz = 0;
  if (costMode === 'per-oz') {
    effectiveCostPerOz = parseFloat(costPerOz) || 0;
  } else {
    const paid = parseFloat(totalPaid) || 0;
    effectiveCostPerOz = qty > 0 ? paid / qty : 0;
  }

  const totalCost = qty * effectiveCostPerOz;
  const currentValue = qty * spotPrice;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!qty || !effectiveCostPerOz) return;
    onSave({
      ...form,
      quantity: qty,
      costPerOz: parseFloat(effectiveCostPerOz.toFixed(4)),
    });
  };

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleCostModeChange = (mode) => {
    if (mode === costMode) return;
    // Sync values when switching
    if (mode === 'total' && qty > 0 && costPerOz) {
      setTotalPaid(String((qty * parseFloat(costPerOz)).toFixed(2)));
    } else if (mode === 'per-oz' && qty > 0 && totalPaid) {
      setCostPerOz(String((parseFloat(totalPaid) / qty).toFixed(2)));
    }
    setCostMode(mode);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{editing ? 'Edit Investment' : 'Add Investment'}</h2>
          <button className="modal-close" onClick={onClose}>&#10005;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Metal</label>
                <select
                  className="form-select"
                  value={form.metal}
                  onChange={(e) => set('metal', e.target.value)}
                >
                  {Object.entries(METALS).map(([key, m]) => (
                    <option key={key} value={key}>{m.name} ({m.symbol})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select
                  className="form-select"
                  value={form.type}
                  onChange={(e) => set('type', e.target.value)}
                >
                  {FORM_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                className="form-input" type="text"
                placeholder="e.g. 2024 American Eagle, 10oz PAMP bar..."
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>

            {/* Weight / Size */}
            <div className="form-group">
              <label className="form-label">Weight (troy oz)</label>
              <div className="size-presets">
                {COMMON_SIZES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    className={`size-btn ${parseFloat(form.quantity) === s.value ? 'active' : ''}`}
                    onClick={() => set('quantity', String(s.value))}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <input
                className="form-input"
                type="number" step="0.001" min="0"
                placeholder="Or enter custom weight..."
                value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
                required
                style={{ marginTop: 8 }}
              />
            </div>

            {/* Cost — toggle between total paid vs per-oz */}
            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label" style={{ marginBottom: 0 }}>Cost</label>
                <div className="cost-toggle">
                  <button
                    type="button"
                    className={`cost-toggle-btn ${costMode === 'total' ? 'active' : ''}`}
                    onClick={() => handleCostModeChange('total')}
                  >
                    Total Paid
                  </button>
                  <button
                    type="button"
                    className={`cost-toggle-btn ${costMode === 'per-oz' ? 'active' : ''}`}
                    onClick={() => handleCostModeChange('per-oz')}
                  >
                    Per oz
                  </button>
                </div>
              </div>

              {costMode === 'total' ? (
                <div className="form-input-group">
                  <span className="form-input-prefix">$</span>
                  <input
                    className="form-input" type="number" step="0.01" min="0"
                    placeholder={qty > 0 ? (qty * spotPrice).toFixed(2) : '0.00'}
                    value={totalPaid}
                    onChange={(e) => setTotalPaid(e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div className="form-input-group">
                  <span className="form-input-prefix">$</span>
                  <input
                    className="form-input" type="number" step="0.01" min="0"
                    placeholder={spotPrice.toFixed(2)}
                    value={costPerOz}
                    onChange={(e) => setCostPerOz(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Auto-calculated hint */}
              {qty > 0 && effectiveCostPerOz > 0 && costMode === 'total' && (
                <div className="cost-hint">
                  = ${effectiveCostPerOz.toFixed(2)} per oz
                </div>
              )}
              {qty > 0 && effectiveCostPerOz > 0 && costMode === 'per-oz' && (
                <div className="cost-hint">
                  = ${totalCost.toFixed(2)} total
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Purchase Date</label>
              <input
                className="form-input" type="date"
                value={form.purchaseDate}
                onChange={(e) => set('purchaseDate', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-input form-textarea"
                placeholder="Where purchased, condition, mintage, serial number..."
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                rows={3}
              />
            </div>

            {qty > 0 && effectiveCostPerOz > 0 && (
              <div className="form-preview">
                <div className="form-preview-row">
                  <span>Total Cost</span>
                  <strong>${totalCost.toFixed(2)}</strong>
                </div>
                <div className="form-preview-row">
                  <span>Current Value</span>
                  <strong>${currentValue.toFixed(2)}</strong>
                </div>
                <div className="form-preview-row">
                  <span>Unrealized P/L</span>
                  <strong style={{ color: currentValue >= totalCost ? 'var(--green)' : 'var(--red)' }}>
                    {currentValue >= totalCost ? '+' : ''}${(currentValue - totalCost).toFixed(2)}
                  </strong>
                </div>
                <div className="form-preview-row">
                  <span>Premium vs Spot</span>
                  <strong style={{ color: effectiveCostPerOz > spotPrice ? 'var(--text-secondary)' : 'var(--green)' }}>
                    {effectiveCostPerOz > spotPrice
                      ? `+$${(effectiveCostPerOz - spotPrice).toFixed(2)}/oz over`
                      : effectiveCostPerOz < spotPrice
                        ? `-$${(spotPrice - effectiveCostPerOz).toFixed(2)}/oz under`
                        : 'At spot'}
                  </strong>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              {editing ? 'Save Changes' : 'Add to Stack'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
