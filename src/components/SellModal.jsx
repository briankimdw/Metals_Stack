import { useState } from 'react';
import { METALS, formatCurrency } from '../utils/constants';

export default function SellModal({ holding, prices, onClose, onSell }) {
  const [sellPricePerOz, setSellPricePerOz] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const metal = METALS[holding.metal];
  const spotPrice = prices[holding.metal] || metal.defaultPrice;
  const sellPrice = parseFloat(sellPricePerOz) || 0;
  const totalProceeds = sellPrice * holding.quantity;
  const totalCost = holding.costPerOz * holding.quantity;
  const pl = totalProceeds - totalCost;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sellPrice) return;
    setSubmitting(true);
    const success = await onSell(holding.id, sellPrice, notes);
    if (!success) setSubmitting(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Sell Holding</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Holding being sold */}
            <div className="sell-holding-info">
              <span className="holding-metal-dot" style={{ background: `var(--${holding.metal})`, width: 12, height: 12 }} />
              <div>
                <div className="sell-holding-name">
                  {metal.name} — {holding.description || holding.type}
                </div>
                <div className="sell-holding-detail">
                  {holding.quantity} oz · Cost: {formatCurrency(holding.costPerOz)}/oz
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Sell Price per oz</label>
              <div className="form-input-group">
                <span className="form-input-prefix">$</span>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={spotPrice.toFixed(2)}
                  value={sellPricePerOz}
                  onChange={(e) => setSellPricePerOz(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Sold to local dealer..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {sellPrice > 0 && (
              <div className="form-preview">
                Total proceeds: <strong>{formatCurrency(totalProceeds)}</strong>
                {' · '}
                P/L:{' '}
                <span style={{ color: pl >= 0 ? '#10B981' : '#EF4444' }}>
                  {pl >= 0 ? '+' : ''}{formatCurrency(pl)}
                </span>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-sell" disabled={!sellPrice || submitting}>
              {submitting ? 'Selling...' : 'Confirm Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
