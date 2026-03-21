import { METALS, formatCurrency } from '../utils/constants';

const TYPE_CONFIG = {
  buy: { label: 'Buy', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
  sell: { label: 'Sell', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
  trade: { label: 'Trade', color: '#6366F1', bg: 'rgba(99, 102, 241, 0.1)' },
};

export default function TransactionHistory({ transactions, onClose }) {
  if (!transactions.length) {
    return (
      <div className="section">
        <div className="section-title-row">
          <h2 className="section-title">Transaction History</h2>
          {onClose && <button className="btn btn-sm" onClick={onClose}>Hide</button>}
        </div>
        <div className="empty-state" style={{ padding: '40px 20px' }}>
          <p>No transactions yet. Your buys, sells, and trades will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="section-title-row">
        <h2 className="section-title">Transaction History</h2>
        {onClose && <button className="btn btn-sm" onClick={onClose}>Hide</button>}
      </div>
      <div className="txn-list">
        {transactions.map((txn) => {
          const config = TYPE_CONFIG[txn.type];
          const outItems = txn.items.filter((i) => i.direction === 'out');
          const inItems = txn.items.filter((i) => i.direction === 'in');
          const date = new Date(txn.createdAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          });
          const time = new Date(txn.createdAt).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit',
          });

          return (
            <div key={txn.id} className="txn-card">
              <div className="txn-card-header">
                <span className="txn-badge" style={{ color: config.color, background: config.bg }}>
                  {config.label}
                </span>
                <span className="txn-date">{date} {time}</span>
              </div>

              <div className="txn-card-body">
                {txn.type === 'buy' && inItems.map((item) => (
                  <TxnHoldingRow key={item.id} item={item} prefix="Bought" />
                ))}

                {txn.type === 'sell' && (
                  <>
                    {outItems.map((item) => (
                      <TxnHoldingRow key={item.id} item={item} prefix="Sold" />
                    ))}
                    {txn.cashAmount > 0 && (
                      <div className="txn-cash">
                        Proceeds: <strong>{formatCurrency(txn.cashAmount)}</strong>
                      </div>
                    )}
                  </>
                )}

                {txn.type === 'trade' && (
                  <>
                    {outItems.length > 0 && (
                      <div className="txn-group">
                        <span className="txn-group-label">Traded away:</span>
                        {outItems.map((item) => (
                          <TxnHoldingRow key={item.id} item={item} />
                        ))}
                      </div>
                    )}
                    {txn.cashAmount > 0 && (
                      <div className="txn-cash">
                        + Cash added: <strong>{formatCurrency(txn.cashAmount)}</strong>
                      </div>
                    )}
                    {inItems.length > 0 && (
                      <div className="txn-group">
                        <span className="txn-group-label">Received:</span>
                        {inItems.map((item) => (
                          <TxnHoldingRow key={item.id} item={item} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {txn.notes && (
                <div className="txn-notes">{txn.notes}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TxnHoldingRow({ item, prefix }) {
  if (!item.holding) {
    return (
      <div className="txn-holding-row">
        <span className="txn-holding-deleted">{prefix ? `${prefix}: ` : ''}(deleted holding)</span>
      </div>
    );
  }

  const h = item.holding;
  const metal = METALS[h.metal];
  const totalCost = h.quantity * h.costPerOz;

  return (
    <div className="txn-holding-row">
      <span className="holding-metal-dot" style={{ background: `var(--${h.metal})`, width: 10, height: 10 }} />
      <span className="txn-holding-name">
        {prefix ? `${prefix}: ` : ''}{metal?.name || h.metal} — {h.description || h.type}
      </span>
      <span className="txn-holding-detail">
        {h.quantity} oz · {formatCurrency(totalCost)}
      </span>
    </div>
  );
}
