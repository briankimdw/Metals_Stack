import { useState } from 'react';
import { METALS, FORM_TYPES } from '../utils/constants';

export default function AddModal({ onClose, onSave, editing, prices }) {
  const [form, setForm] = useState({
    metal: editing?.metal || 'gold',
    type: editing?.type || 'coin',
    description: editing?.description || '',
    quantity: editing?.quantity ?? '',
    costPerOz: editing?.costPerOz ?? '',
    purchaseDate: editing?.purchaseDate || new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.quantity || !form.costPerOz) return;
    onSave({
      ...form,
      quantity: parseFloat(form.quantity),
      costPerOz: parseFloat(form.costPerOz),
    });
  };

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const qty = parseFloat(form.quantity) || 0;
  const cost = parseFloat(form.costPerOz) || 0;
  const totalCost = qty * cost;
  const spotPrice = prices[form.metal] || METALS[form.metal].defaultPrice;
  const currentValue = qty * spotPrice;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{editing ? 'Edit Investment' : 'Add Investment'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
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
              <label className="form-label">Description (optional)</label>
              <input
                className="form-input" type="text"
                placeholder="e.g. 2024 American Eagle, 10oz PAMP bar..."
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Quantity (troy oz)</label>
                <input
                  className="form-input" type="number" step="0.001" min="0"
                  placeholder="1.000" value={form.quantity}
                  onChange={(e) => set('quantity', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cost per oz</label>
                <div className="form-input-group">
                  <span className="form-input-prefix">$</span>
                  <input
                    className="form-input" type="number" step="0.01" min="0"
                    placeholder={spotPrice.toFixed(2)}
                    value={form.costPerOz}
                    onChange={(e) => set('costPerOz', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Purchase Date</label>
              <input
                className="form-input" type="date"
                value={form.purchaseDate}
                onChange={(e) => set('purchaseDate', e.target.value)}
              />
            </div>

            {qty > 0 && cost > 0 && (
              <div className="form-preview">
                Total cost: <strong>${totalCost.toFixed(2)}</strong>
                {' · '}Current value: <strong>${currentValue.toFixed(2)}</strong>
                {totalCost > 0 && (
                  <>
                    {' · '}
                    <span style={{ color: currentValue >= totalCost ? '#10B981' : '#EF4444' }}>
                      {currentValue >= totalCost ? '+' : ''}${(currentValue - totalCost).toFixed(2)}
                    </span>
                  </>
                )}
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
