import { useState, useMemo, useEffect } from 'react';
import { METALS, formatCurrency } from '../utils/constants';

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

function normalizeUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  return trimmed && !trimmed.match(/^https?:\/\//i) ? 'https://' + trimmed : trimmed;
}

async function fetchProductInfo(url) {
  try {
    const res = await fetch(`/api/fetch-product?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.found ? data : null;
  } catch { return null; }
}

function AvailabilityBadge({ notes }) {
  if (!notes) return null;
  const lower = notes.toLowerCase();
  if (lower === 'in stock') return <span className="wl-badge in-stock">In Stock</span>;
  if (lower === 'out of stock') return <span className="wl-badge out-of-stock">Out of Stock</span>;
  return null;
}

function metalGradient(metal) {
  const m = METALS[metal];
  if (!m) return 'var(--bg-tertiary)';
  return `linear-gradient(135deg, ${m.color}15, ${m.color}08)`;
}

export default function Wishlist({ items, tableError, onClose, onAdd, onRemove, onUpdate }) {
  const [search, setSearch] = useState('');
  const [filterMetal, setFilterMetal] = useState('all');
  const [urlInput, setUrlInput] = useState('');
  const [fetching, setFetching] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Detail modal state
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailEditing, setDetailEditing] = useState(false);
  const [detailForm, setDetailForm] = useState({});
  const [refreshingId, setRefreshingId] = useState(null);

  // Keep modal in sync with items
  useEffect(() => {
    if (selectedItem) {
      const updated = items.find((i) => i.id === selectedItem.id);
      if (updated) setSelectedItem(updated);
      else setSelectedItem(null);
    }
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (filterMetal !== 'all') list = list.filter((item) => item.metal === filterMetal);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((item) =>
        item.name?.toLowerCase().includes(q) ||
        item.url?.toLowerCase().includes(q) ||
        item.notes?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, filterMetal, search]);

  const metalCounts = useMemo(() => {
    const counts = { all: items.length };
    for (const item of items) {
      if (item.metal) counts[item.metal] = (counts[item.metal] || 0) + 1;
    }
    return counts;
  }, [items]);

  // ── Add URL ──
  const handleAddUrl = async (rawUrl) => {
    const url = normalizeUrl(rawUrl || urlInput);
    if (!url || url.length < 10) return;
    setFetching(true);
    const info = await fetchProductInfo(url);
    if (info) {
      await onAdd(url, info.name || getDomain(url), info.metal || null, info.price || null,
        info.inStock === true ? 'In stock' : info.inStock === false ? 'Out of stock' : null,
        info.imageUrl || null);
    } else {
      await onAdd(url, getDomain(url), null, null, null, null);
    }
    setUrlInput('');
    setFetching(false);
  };

  const handleUrlKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrl(); } };
  const handleUrlPaste = (e) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted?.trim().match(/^https?:\/\//i)) setTimeout(() => handleAddUrl(pasted.trim()), 150);
  };

  // ── Detail Modal ──
  const openDetail = (item) => { setSelectedItem(item); setDetailEditing(false); setDeleteConfirm(null); };
  const closeDetail = () => { setSelectedItem(null); setDetailEditing(false); setDeleteConfirm(null); };

  const startDetailEdit = () => {
    setDetailEditing(true);
    setDetailForm({
      url: selectedItem.url,
      name: selectedItem.name,
      metal: selectedItem.metal || '',
      price: selectedItem.price != null ? String(selectedItem.price) : '',
      notes: selectedItem.notes || '',
    });
  };

  const handleDetailSave = async () => {
    if (!selectedItem) return;
    const url = normalizeUrl(detailForm.url);
    if (!url || !detailForm.name.trim()) return;
    await onUpdate(selectedItem.id, {
      url, name: detailForm.name.trim(),
      metal: detailForm.metal || null,
      price: detailForm.price ? Number(detailForm.price) : null,
      notes: detailForm.notes || null,
    });
    setDetailEditing(false);
  };

  const handleRefreshPrice = async (item) => {
    setRefreshingId(item.id);
    const info = await fetchProductInfo(item.url);
    if (info) {
      const updates = {};
      if (info.price != null) updates.price = info.price;
      if (info.name) updates.name = info.name;
      if (info.imageUrl) updates.imageUrl = info.imageUrl;
      if (info.inStock === true) updates.notes = 'In stock';
      else if (info.inStock === false) updates.notes = 'Out of stock';
      if (Object.keys(updates).length > 0) await onUpdate(item.id, updates);
    }
    setRefreshingId(null);
  };

  const handleDelete = async (id) => {
    await onRemove(id);
    setDeleteConfirm(null);
    if (selectedItem?.id === id) setSelectedItem(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // ── Table error ──
  if (tableError) {
    return (
      <div className="wishlist-page">
        <div className="wishlist-header">
          <div className="wishlist-header-left"><h1 className="wishlist-title">Wishlist</h1></div>
          <button className="btn" onClick={onClose}>Back to Portfolio</button>
        </div>
        <div className="setup-banner">
          <div className="setup-banner-icon">&#9888;</div>
          <div className="setup-banner-content">
            <strong>Wishlist table not found</strong>
            <p>Run <code>sql/007_wishlist.sql</code> in your Supabase SQL Editor.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      {/* Header */}
      <div className="wishlist-header">
        <div className="wishlist-header-left">
          <h1 className="wishlist-title">Wishlist</h1>
          <span className="wishlist-subtitle">{items.length} item{items.length !== 1 ? 's' : ''}</span>
        </div>
        <button className="btn" onClick={onClose}>Back to Portfolio</button>
      </div>

      {/* URL Input */}
      <div className={`wishlist-url-bar${fetching ? ' loading' : ''}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <input type="text" className="wishlist-url-input"
          placeholder={fetching ? 'Fetching product info...' : 'Paste a product URL to add it to your wishlist'}
          value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={handleUrlKeyDown} onPaste={handleUrlPaste} disabled={fetching} />
        {fetching ? <div className="wishlist-url-spinner" /> :
          urlInput.trim() ? <button className="btn btn-primary btn-sm" onClick={() => handleAddUrl()}>Add</button> : null}
      </div>

      {/* Toolbar */}
      {items.length > 0 && (
        <div className="wishlist-toolbar">
          <div className="wishlist-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" placeholder="Search wishlist..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="wishlist-search-input" />
            {search && <button className="wishlist-search-clear" onClick={() => setSearch('')}>&#10005;</button>}
          </div>
          <div className="wishlist-filters">
            <button className={`wishlist-filter-btn${filterMetal === 'all' ? ' active' : ''}`} onClick={() => setFilterMetal('all')}>
              All ({metalCounts.all})
            </button>
            {Object.entries(METALS).map(([key, m]) =>
              metalCounts[key] ? (
                <button key={key} className={`wishlist-filter-btn${filterMetal === key ? ' active' : ''}`}
                  onClick={() => setFilterMetal(key)}
                  style={filterMetal === key ? { borderColor: m.color, color: m.color } : {}}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, display: 'inline-block' }} />
                  {m.name} ({metalCounts[key]})
                </button>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && items.length === 0 ? (
        <div className="wishlist-empty">
          <div className="wishlist-empty-icon">&#9734;</div>
          <h3>Your wishlist is empty</h3>
          <p>Paste any product URL above — we'll grab the name, price, and details automatically.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="wishlist-empty"><p>No items match your search.</p></div>
      ) : (
        /* ── Card Grid ── */
        <div className="wl-grid">
          {filtered.map((item) => {
            const metalColor = METALS[item.metal]?.color || 'var(--border)';
            const isRefreshing = refreshingId === item.id;

            return (
              <div key={item.id} className={`wl-card${isRefreshing ? ' wl-card-loading' : ''}`}
                style={{ borderLeftColor: metalColor }}
                onClick={() => openDetail(item)}>

                {isRefreshing && <div className="wl-card-shimmer" />}

                {/* Image */}
                {item.imageUrl ? (
                  <div className="wl-card-img-wrap">
                    <img src={item.imageUrl} alt="" className="wl-card-img" loading="lazy"
                      onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }} />
                  </div>
                ) : (
                  <div className="wl-card-img-wrap wl-card-placeholder" style={{ background: metalGradient(item.metal) }}>
                    <span className="wl-placeholder-symbol">
                      {item.metal === 'gold' ? 'Au' : item.metal === 'silver' ? 'Ag' : item.metal === 'platinum' ? 'Pt' : item.metal === 'palladium' ? 'Pd' : '?'}
                    </span>
                  </div>
                )}

                {/* Body */}
                <div className="wl-card-body">
                  <div className="wl-card-domain">{getDomain(item.url)}</div>
                  <div className="wl-card-name">{item.name}</div>
                  {item.price != null && (
                    <div className="wl-card-price">{formatCurrency(item.price)}</div>
                  )}
                  <div className="wl-card-footer">
                    <div className="wl-card-meta">
                      {item.metal && METALS[item.metal] && (
                        <span className="wl-card-metal" style={{ color: metalColor }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: metalColor, display: 'inline-block' }} />
                          {METALS[item.metal].name}
                        </span>
                      )}
                      <AvailabilityBadge notes={item.notes} />
                    </div>
                    <span className="wl-card-date">{formatDate(item.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Detail Modal ── */}
      {selectedItem && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeDetail()}>
          <div className="modal wl-detail-modal">
            {/* Accent bar */}
            <div className="wl-detail-accent" style={{
              background: METALS[selectedItem.metal]
                ? `linear-gradient(90deg, ${METALS[selectedItem.metal].color}, ${METALS[selectedItem.metal].color}66)`
                : 'linear-gradient(90deg, var(--gold), var(--gold-dark))'
            }} />

            {/* Header */}
            <div className="modal-header">
              <div>
                {detailEditing ? (
                  <input type="text" className="form-input wl-detail-name-input"
                    value={detailForm.name} onChange={(e) => setDetailForm({ ...detailForm, name: e.target.value })} />
                ) : (
                  <h2 style={{ fontSize: 17, fontWeight: 800 }}>{selectedItem.name}</h2>
                )}
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{getDomain(selectedItem.url)}</div>
              </div>
              <button className="modal-close" onClick={closeDetail}>&#10005;</button>
            </div>

            {/* Body */}
            <div className="modal-body">
              {/* Product image */}
              {selectedItem.imageUrl && (
                <div className="wl-detail-img-wrap">
                  <img src={selectedItem.imageUrl} alt="" className="wl-detail-img" />
                </div>
              )}

              {/* Detail rows */}
              <div className="detail-grid">
                {/* Price */}
                <div className="detail-row">
                  <span className="detail-label">Price</span>
                  {detailEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>$</span>
                      <input type="number" className="form-input wl-detail-inline-input" step="0.01" min="0"
                        value={detailForm.price} onChange={(e) => setDetailForm({ ...detailForm, price: e.target.value })} />
                    </div>
                  ) : (
                    <span className="detail-value" style={{ color: 'var(--gold)', fontWeight: 800, fontSize: 18 }}>
                      {selectedItem.price != null ? formatCurrency(selectedItem.price) : '—'}
                    </span>
                  )}
                </div>

                {/* Metal */}
                <div className="detail-row">
                  <span className="detail-label">Metal</span>
                  {detailEditing ? (
                    <select className="form-input wl-detail-inline-input" value={detailForm.metal}
                      onChange={(e) => setDetailForm({ ...detailForm, metal: e.target.value })}>
                      <option value="">None</option>
                      {Object.entries(METALS).map(([key, m]) => <option key={key} value={key}>{m.name}</option>)}
                    </select>
                  ) : selectedItem.metal && METALS[selectedItem.metal] ? (
                    <span className="detail-value" style={{ color: METALS[selectedItem.metal].color, fontWeight: 700 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: METALS[selectedItem.metal].color, display: 'inline-block', marginRight: 6 }} />
                      {METALS[selectedItem.metal].name}
                    </span>
                  ) : <span className="detail-value dim">—</span>}
                </div>

                {/* Dealer */}
                <div className="detail-row">
                  <span className="detail-label">Dealer</span>
                  {detailEditing ? (
                    <input type="text" className="form-input wl-detail-inline-input" style={{ maxWidth: 300 }}
                      value={detailForm.url} onChange={(e) => setDetailForm({ ...detailForm, url: e.target.value })} />
                  ) : (
                    <a href={selectedItem.url} target="_blank" rel="noopener noreferrer"
                      className="detail-value" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                      {getDomain(selectedItem.url)}
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 4, verticalAlign: 'middle' }}>
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  )}
                </div>

                {/* Availability */}
                <div className="detail-row">
                  <span className="detail-label">Availability</span>
                  {detailEditing ? (
                    <select className="form-input wl-detail-inline-input" value={detailForm.notes}
                      onChange={(e) => setDetailForm({ ...detailForm, notes: e.target.value })}>
                      <option value="">Unknown</option>
                      <option value="In stock">In Stock</option>
                      <option value="Out of stock">Out of Stock</option>
                    </select>
                  ) : (
                    <span className="detail-value">
                      <AvailabilityBadge notes={selectedItem.notes} />
                      {!selectedItem.notes || !['in stock', 'out of stock'].includes(selectedItem.notes?.toLowerCase())
                        ? <span className="dim">{selectedItem.notes || '—'}</span> : null}
                    </span>
                  )}
                </div>

                {/* Date Added */}
                <div className="detail-row">
                  <span className="detail-label">Added</span>
                  <span className="detail-value">{formatDate(selectedItem.createdAt) || '—'}</span>
                </div>

                {/* Notes (only in edit mode or if there are custom notes) */}
                {(detailEditing || (selectedItem.notes && !['in stock', 'out of stock'].includes(selectedItem.notes?.toLowerCase()))) && (
                  <div className="detail-row">
                    <span className="detail-label">Notes</span>
                    {detailEditing ? (
                      <input type="text" className="form-input wl-detail-inline-input" style={{ maxWidth: 300 }}
                        placeholder="Add notes..."
                        value={detailForm.notes} onChange={(e) => setDetailForm({ ...detailForm, notes: e.target.value })} />
                    ) : (
                      <span className="detail-value dim" style={{ fontStyle: 'italic' }}>{selectedItem.notes}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              {detailEditing ? (
                <>
                  <button className="btn" onClick={() => setDetailEditing(false)}>Cancel</button>
                  <div style={{ flex: 1 }} />
                  <button className="btn btn-primary" onClick={handleDetailSave}>Save Changes</button>
                </>
              ) : (
                <>
                  {deleteConfirm === selectedItem.id ? (
                    <>
                      <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>Delete this item?</span>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(selectedItem.id)}>Confirm</button>
                      <button className="btn btn-sm" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                    </>
                  ) : (
                    <button className="btn btn-ghost-danger btn-sm" onClick={() => setDeleteConfirm(selectedItem.id)}>Delete</button>
                  )}
                  <div style={{ flex: 1 }} />
                  <button className="btn btn-sm" onClick={() => handleRefreshPrice(selectedItem)}
                    disabled={refreshingId === selectedItem.id}>
                    {refreshingId === selectedItem.id ? 'Refreshing...' : 'Refresh Price'}
                  </button>
                  <a href={selectedItem.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
                    Visit Store &#8599;
                  </a>
                  <button className="btn btn-sm btn-primary" onClick={startDetailEdit}>Edit</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
