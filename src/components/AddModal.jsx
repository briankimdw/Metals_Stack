import { useState, useRef } from 'react';
import { METALS, FORM_TYPES } from '../utils/constants';
import { FolderPicker } from './FolderManager';

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

export default function AddModal({ onClose, onSave, onSaveMultiple, editing, prices, folders = [] }) {
  const [form, setForm] = useState({
    metal: editing?.metal || 'gold',
    type: editing?.type || 'coin',
    description: editing?.description || '',
    weightPerItem: editing?.quantity ?? '',
    count: 1,
    purchaseDate: editing?.purchaseDate || new Date().toISOString().split('T')[0],
    notes: editing?.notes || '',
    folderId: editing?.folderId || null,
  });

  const [costMode, setCostMode] = useState('total');
  const [costPerOz, setCostPerOz] = useState(editing?.costPerOz ?? '');
  const [totalPaid, setTotalPaid] = useState(
    editing ? String((editing.quantity * editing.costPerOz).toFixed(2)) : ''
  );
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptText, setReceiptText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parsedItems, setParsedItems] = useState(null);
  const fileInputRef = useRef(null);

  const count = parseInt(form.count) || 1;
  const weightPerItem = parseFloat(form.weightPerItem) || 0;
  const totalQty = weightPerItem * count;
  const spotPrice = prices[form.metal] || METALS[form.metal].defaultPrice;

  let effectiveCostPerOz = 0;
  if (costMode === 'per-oz') {
    effectiveCostPerOz = parseFloat(costPerOz) || 0;
  } else {
    const paid = parseFloat(totalPaid) || 0;
    effectiveCostPerOz = totalQty > 0 ? paid / totalQty : 0;
  }

  const totalCost = totalQty * effectiveCostPerOz;
  const currentValue = totalQty * spotPrice;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!totalQty || !effectiveCostPerOz) return;

    if (count > 1 && onSaveMultiple) {
      // Save each item as a separate holding
      const items = [];
      const costPerItem = totalCost / count;
      const costPerOzFinal = parseFloat(effectiveCostPerOz.toFixed(4));
      for (let i = 0; i < count; i++) {
        items.push({
          metal: form.metal,
          type: form.type,
          description: form.description + (count > 1 ? ` (${i + 1}/${count})` : ''),
          quantity: weightPerItem,
          costPerOz: costPerOzFinal,
          purchaseDate: form.purchaseDate,
          notes: form.notes,
          folderId: form.folderId,
        });
      }
      onSaveMultiple(items);
    } else {
      onSave({
        ...form,
        quantity: totalQty,
        costPerOz: parseFloat(effectiveCostPerOz.toFixed(4)),
      });
    }
  };

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleCostModeChange = (mode) => {
    if (mode === costMode) return;
    if (mode === 'total' && totalQty > 0 && costPerOz) {
      setTotalPaid(String((totalQty * parseFloat(costPerOz)).toFixed(2)));
    } else if (mode === 'per-oz' && totalQty > 0 && totalPaid) {
      setCostPerOz(String((parseFloat(totalPaid) / totalQty).toFixed(2)));
    }
    setCostMode(mode);
  };

  // Receipt parsing
  const handleParseReceipt = async () => {
    if (!receiptText.trim()) return;
    setParsing(true);
    setParseError('');
    try {
      const res = await fetch('/api/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: receiptText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse');
      if (data.items && data.items.length > 0) {
        setParsedItems(data.items);
      } else {
        setParseError('No precious metal items found in receipt.');
      }
    } catch (err) {
      setParseError(err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setParseError('');
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse');
      if (data.items && data.items.length > 0) {
        setParsedItems(data.items);
      } else {
        setParseError('No precious metal items found in image.');
      }
    } catch (err) {
      setParseError(err.message);
    } finally {
      setParsing(false);
    }
  };

  const applyParsedItem = (item) => {
    const metalKey = ['gold', 'silver', 'platinum', 'palladium'].includes(item.metal)
      ? item.metal : 'gold';
    const typeKey = ['coin', 'bar', 'round', 'other'].includes(item.type)
      ? item.type : 'coin';

    set('metal', metalKey);
    set('type', typeKey);
    if (item.description) set('description', item.description);
    if (item.weightOz) set('weightPerItem', String(item.weightOz));
    if (item.count) set('count', item.count);
    if (item.purchaseDate) set('purchaseDate', item.purchaseDate);
    if (item.totalPaid) {
      setCostMode('total');
      setTotalPaid(String(item.totalPaid));
    }
    setParsedItems(null);
    setShowReceipt(false);
  };

  const handleSaveAllParsed = async () => {
    if (!parsedItems || !onSaveMultiple) return;
    const items = parsedItems.map((item) => {
      const metalKey = ['gold', 'silver', 'platinum', 'palladium'].includes(item.metal)
        ? item.metal : 'gold';
      const typeKey = ['coin', 'bar', 'round', 'other'].includes(item.type)
        ? item.type : 'coin';
      const wt = item.weightOz || 1;
      const cnt = item.count || 1;
      const totalWt = wt * cnt;
      const paid = item.totalPaid || 0;
      const cpo = totalWt > 0 ? paid / totalWt : 0;

      return {
        metal: metalKey,
        type: typeKey,
        description: item.description || '',
        quantity: wt,
        costPerOz: parseFloat(cpo.toFixed(4)),
        purchaseDate: item.purchaseDate || form.purchaseDate,
        notes: '',
      };
    });

    // If count > 1, expand into individual holdings
    const expanded = [];
    for (const item of items) {
      const parsed = parsedItems.find((p) => p.description === item.description);
      const cnt = parsed?.count || 1;
      for (let i = 0; i < cnt; i++) {
        expanded.push({
          ...item,
          description: item.description + (cnt > 1 ? ` (${i + 1}/${cnt})` : ''),
        });
      }
    }

    onSaveMultiple(expanded);
  };

  // Parsed items review view
  if (parsedItems) {
    return (
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal">
          <div className="modal-header">
            <h2>Receipt Items Found</h2>
            <button className="modal-close" onClick={() => setParsedItems(null)}>&#10005;</button>
          </div>
          <div className="modal-body">
            <div className="parsed-items-list">
              {parsedItems.map((item, i) => (
                <div key={i} className="parsed-item">
                  <div className="parsed-item-info">
                    <strong>{item.description || 'Unknown item'}</strong>
                    <span className="parsed-item-detail">
                      {item.count > 1 ? `${item.count}x ` : ''}
                      {item.weightOz} oz {item.metal} {item.type}
                      {item.totalPaid ? ` — $${item.totalPaid.toFixed(2)}` : ''}
                    </span>
                  </div>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => applyParsedItem(item)}
                  >
                    Use
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn" onClick={() => setParsedItems(null)}>Back</button>
            {onSaveMultiple && parsedItems.length > 0 && (
              <button className="btn btn-primary" onClick={handleSaveAllParsed}>
                Add All ({parsedItems.reduce((s, i) => s + (i.count || 1), 0)} items)
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{editing ? 'Edit Investment' : 'Add Investment'}</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!editing && (
              <button
                type="button"
                className={`btn btn-sm ${showReceipt ? 'btn-active' : 'btn-ghost'}`}
                onClick={() => setShowReceipt(!showReceipt)}
              >
                Import Receipt
              </button>
            )}
            <button className="modal-close" onClick={onClose}>&#10005;</button>
          </div>
        </div>

        {/* Receipt import panel */}
        {showReceipt && (
          <div className="receipt-panel">
            <p className="receipt-hint">
              Paste receipt text or upload an image and AI will extract the details.
            </p>
            <textarea
              className="form-input form-textarea"
              placeholder="Paste your email receipt or order confirmation text here..."
              value={receiptText}
              onChange={(e) => setReceiptText(e.target.value)}
              rows={4}
            />
            <div className="receipt-actions">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing}
              >
                Upload Image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleParseReceipt}
                disabled={parsing || !receiptText.trim()}
              >
                {parsing ? 'Parsing...' : 'Parse Text'}
              </button>
            </div>
            {parseError && <div className="receipt-error">{parseError}</div>}
          </div>
        )}

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

            {/* Weight + Count */}
            <div className="form-group">
              <label className="form-label">Weight per item (troy oz)</label>
              <div className="size-presets">
                {COMMON_SIZES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    className={`size-btn ${parseFloat(form.weightPerItem) === s.value ? 'active' : ''}`}
                    onClick={() => set('weightPerItem', String(s.value))}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="form-row" style={{ marginTop: 8 }}>
                <input
                  className="form-input"
                  type="number" step="0.001" min="0"
                  placeholder="Custom weight..."
                  value={form.weightPerItem}
                  onChange={(e) => set('weightPerItem', e.target.value)}
                  required
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="form-label" style={{ margin: 0, whiteSpace: 'nowrap', fontSize: 12 }}>
                    QTY
                  </span>
                  <div className="qty-stepper">
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => set('count', Math.max(1, count - 1))}
                    >
                      -
                    </button>
                    <input
                      className="qty-input"
                      type="number" min="1"
                      value={form.count}
                      onChange={(e) => set('count', Math.max(1, parseInt(e.target.value) || 1))}
                    />
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => set('count', count + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              {count > 1 && weightPerItem > 0 && (
                <div className="cost-hint">
                  {count} items x {weightPerItem} oz = {totalQty.toFixed(3)} oz total
                </div>
              )}
            </div>

            {/* Cost */}
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
                    placeholder={totalQty > 0 ? (totalQty * spotPrice).toFixed(2) : '0.00'}
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

              {totalQty > 0 && effectiveCostPerOz > 0 && costMode === 'total' && (
                <div className="cost-hint">
                  = ${effectiveCostPerOz.toFixed(2)} per oz
                  {count > 1 && ` / $${(totalCost / count).toFixed(2)} per item`}
                </div>
              )}
              {totalQty > 0 && effectiveCostPerOz > 0 && costMode === 'per-oz' && (
                <div className="cost-hint">
                  = ${totalCost.toFixed(2)} total
                  {count > 1 && ` / $${(totalCost / count).toFixed(2)} per item`}
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

            {folders.length > 0 && (
              <div className="form-group">
                <label className="form-label">Folder</label>
                <FolderPicker
                  folders={folders}
                  value={form.folderId}
                  onChange={(id) => set('folderId', id)}
                  compact
                />
              </div>
            )}

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

            {totalQty > 0 && effectiveCostPerOz > 0 && (
              <div className="form-preview">
                {count > 1 && (
                  <div className="form-preview-row">
                    <span>Items</span>
                    <strong>{count} x {weightPerItem} oz</strong>
                  </div>
                )}
                <div className="form-preview-row">
                  <span>Total Weight</span>
                  <strong>{totalQty.toFixed(3)} oz</strong>
                </div>
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
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              {editing ? 'Save Changes' : count > 1 ? `Add ${count} Items` : 'Add to Stack'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
