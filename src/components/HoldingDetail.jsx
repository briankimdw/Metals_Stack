import { METALS, formatCurrency, formatPercent } from '../utils/constants';

export default function HoldingDetail({ holding, prices, onClose, onSell, onEdit, onDelete }) {
  if (!holding) return null;

  const metal = METALS[holding.metal];
  const spotPrice = prices[holding.metal] || metal.defaultPrice;
  const totalCost = holding.quantity * holding.costPerOz;
  const currentValue = holding.quantity * spotPrice;
  const pl = currentValue - totalCost;
  const plPercent = totalCost > 0 ? ((currentValue - totalCost) / totalCost) * 100 : 0;

  const purchaseDate = holding.purchaseDate
    ? new Date(holding.purchaseDate + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
    : null;

  const daysSinceAcquired = holding.purchaseDate
    ? Math.floor((Date.now() - new Date(holding.purchaseDate + 'T00:00:00').getTime()) / 86400000)
    : null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal detail-modal">
        <div className="detail-accent" style={{ background: `linear-gradient(135deg, ${metal.color}, ${metal.darkColor})` }} />

        <div className="modal-header">
          <div className="detail-header-info">
            <div className="detail-metal-badge" style={{ background: metal.color, color: '#000' }}>
              {metal.symbol}
            </div>
            <div>
              <h2>{holding.description || `${metal.name} ${holding.type}`}</h2>
              <span className="detail-subtitle">{metal.name} {holding.type}</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>&#10005;</button>
        </div>

        <div className="modal-body">
          <div className="detail-value-card">
            <div className="detail-value-main">
              <span className="detail-value-label">Current Value</span>
              <span className="detail-value-amount">{formatCurrency(currentValue)}</span>
            </div>
            <div className={`detail-value-pnl ${pl >= 0 ? 'positive' : 'negative'}`}>
              <span>{pl >= 0 ? '+' : ''}{formatCurrency(pl)}</span>
              <span className="detail-value-pnl-pct">{formatPercent(plPercent)}</span>
            </div>
          </div>

          <div className="detail-grid">
            <DetailRow label="Quantity" value={`${holding.quantity} troy oz`} />
            <DetailRow label="Cost per oz" value={formatCurrency(holding.costPerOz)} />
            <DetailRow label="Total Cost Basis" value={formatCurrency(totalCost)} />
            <DetailRow label="Spot Price" value={`${formatCurrency(spotPrice)} / oz`} />
            {purchaseDate && (
              <DetailRow label="Acquired" value={purchaseDate} />
            )}
            {daysSinceAcquired !== null && (
              <DetailRow
                label="Holding Period"
                value={daysSinceAcquired === 0 ? 'Today' : daysSinceAcquired === 1 ? '1 day' : `${daysSinceAcquired} days`}
              />
            )}
            <DetailRow
              label="Premium Paid"
              value={
                holding.costPerOz > spotPrice
                  ? `${formatCurrency(holding.costPerOz - spotPrice)} over spot`
                  : holding.costPerOz < spotPrice
                    ? `${formatCurrency(spotPrice - holding.costPerOz)} under spot`
                    : 'At spot'
              }
            />
          </div>

          {holding.notes && (
            <div className="detail-notes">
              <span className="detail-notes-label">Notes</span>
              <p>{holding.notes}</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-danger btn-sm" onClick={() => { onDelete(holding); }}>
            Delete
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>Close</button>
          <button className="btn btn-ghost" onClick={() => onEdit(holding)}>
            &#9998; Edit
          </button>
          <button className="btn btn-sell" onClick={() => { onClose(); onSell(holding); }}>
            Sell
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <span className="detail-row-label">{label}</span>
      <span className="detail-row-value">{value}</span>
    </div>
  );
}
