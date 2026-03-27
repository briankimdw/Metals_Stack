import { useState, useMemo } from 'react';
import { METALS, formatCurrency } from '../utils/constants';

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function normalizeUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed && !trimmed.match(/^https?:\/\//i)) {
    return 'https://' + trimmed;
  }
  return trimmed;
}

async function fetchProductInfo(url) {
  try {
    const res = await fetch(`/api/fetch-product?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.found) return null;
    return data;
  } catch {
    return null;
  }
}

function AvailabilityBadge({ notes }) {
  if (!notes) return null;
  const lower = notes.toLowerCase();
  if (lower === 'in stock') return <span className="wl-card-badge in-stock">In Stock</span>;
  if (lower === 'out of stock') return <span className="wl-card-badge out-of-stock">Out of Stock</span>;
  return null;
}

export default function Wishlist({ items, tableError, onClose, onAdd, onRemove, onUpdate }) {
  const [search, setSearch] = useState('');
  const [filterMetal, setFilterMetal] = useState('all');
  const [urlInput, setUrlInput] = useState('');
  const [fetching, setFetching] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ url: '', name: '', metal: '', price: '', notes: '' });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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

  const handleAddUrl = async (rawUrl) => {
    const url = normalizeUrl(rawUrl || urlInput);
    if (!url || url.length < 10) return;
    setFetching(true);

    const info = await fetchProductInfo(url);

    if (info) {
      const name = info.name || getDomain(url);
      const metal = info.metal || null;
      const price = info.price || null;
      const imageUrl = info.imageUrl || null;
      const notes = info.inStock === true ? 'In stock' : info.inStock === false ? 'Out of stock' : null;
      await onAdd(url, name, metal, price, notes, imageUrl);
    } else {
      await onAdd(url, getDomain(url), null, null, null, null);
    }

    setUrlInput('');
    setFetching(false);
  };

  const handleUrlKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAddUrl(); }
  };

  const handleUrlPaste = (e) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted?.trim().match(/^https?:\/\//i)) {
      setTimeout(() => handleAddUrl(pasted.trim()), 150);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({
      url: item.url,
      name: item.name,
      metal: item.metal || '',
      price: item.price != null ? String(item.price) : '',
      notes: item.notes || '',
    });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    const url = normalizeUrl(editForm.url);
    if (!url || !editForm.name.trim()) return;
    await onUpdate(editingId, {
      url,
      name: editForm.name.trim(),
      metal: editForm.metal || null,
      price: editForm.price ? Number(editForm.price) : null,
      notes: editForm.notes || null,
    });
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    await onRemove(id);
    setDeleteConfirm(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (tableError) {
    return (
      <div className="wishlist-page">
        <div className="wishlist-header">
          <div className="wishlist-header-left">
            <h1 className="wishlist-title">Wishlist</h1>
          </div>
          <button className="btn" onClick={onClose}>Back to Portfolio</button>
        </div>
        <div className="setup-banner">
          <div className="setup-banner-icon">&#9888;</div>
          <div className="setup-banner-content">
            <strong>Wishlist table not found</strong>
            <p>Run <code>sql/007_wishlist.sql</code> in your Supabase SQL Editor to enable the wishlist.</p>
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

      {/* URL Input Bar */}
      <div className={`wishlist-url-bar${fetching ? ' loading' : ''}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <input
          type="text"
          className="wishlist-url-input"
          placeholder={fetching ? 'Fetching product info...' : 'Paste a product URL to add it to your wishlist'}
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={handleUrlKeyDown}
          onPaste={handleUrlPaste}
          disabled={fetching}
        />
        {fetching ? (
          <div className="wishlist-url-spinner" />
        ) : urlInput.trim() ? (
          <button className="btn btn-primary btn-sm" onClick={() => handleAddUrl()}>Add</button>
        ) : null}
      </div>

      {/* Toolbar — search & filters */}
      {items.length > 0 && (
        <div className="wishlist-toolbar">
          <div className="wishlist-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search wishlist..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="wishlist-search-input"
            />
            {search && (
              <button className="wishlist-search-clear" onClick={() => setSearch('')}>&#10005;</button>
            )}
          </div>
          <div className="wishlist-filters">
            <button className={`wishlist-filter-btn${filterMetal === 'all' ? ' active' : ''}`} onClick={() => setFilterMetal('all')}>
              All ({metalCounts.all})
            </button>
            {Object.entries(METALS).map(([key, m]) =>
              metalCounts[key] ? (
                <button
                  key={key}
                  className={`wishlist-filter-btn${filterMetal === key ? ' active' : ''}`}
                  onClick={() => setFilterMetal(key)}
                  style={filterMetal === key ? { borderColor: m.color, color: m.color } : {}}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, display: 'inline-block', marginRight: 4 }} />
                  {m.name} ({metalCounts[key]})
                </button>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Empty states */}
      {filtered.length === 0 && items.length === 0 ? (
        <div className="wishlist-empty">
          <div className="wishlist-empty-icon">&#9734;</div>
          <h3>Your wishlist is empty</h3>
          <p>Paste any product URL above — we'll automatically grab the name, price, and details.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="wishlist-empty">
          <p>No items match your search.</p>
        </div>
      ) : (
        <div className="wl-grid">
          {filtered.map((item) =>
            editingId === item.id ? (
              /* Edit form — spans full width */
              <form key={item.id} className="wl-edit-form" onSubmit={handleEdit}>
                <div className="wishlist-form-row">
                  <div className="wishlist-form-field wishlist-form-url">
                    <label>URL</label>
                    <input type="text" className="form-input" value={editForm.url}
                      onChange={(e) => setEditForm({ ...editForm, url: e.target.value })} required />
                  </div>
                  <div className="wishlist-form-field wishlist-form-name">
                    <label>Product Name</label>
                    <input type="text" className="form-input" value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
                  </div>
                </div>
                <div className="wishlist-form-row">
                  <div className="wishlist-form-field">
                    <label>Metal</label>
                    <select className="form-input" value={editForm.metal}
                      onChange={(e) => setEditForm({ ...editForm, metal: e.target.value })}>
                      <option value="">-- None --</option>
                      {Object.entries(METALS).map(([key, m]) => (
                        <option key={key} value={key}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="wishlist-form-field">
                    <label>Price</label>
                    <input type="number" className="form-input" step="0.01" min="0" value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} />
                  </div>
                  <div className="wishlist-form-field wishlist-form-notes">
                    <label>Notes</label>
                    <input type="text" className="form-input" value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm">Save</button>
                  <button type="button" className="btn btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </form>
            ) : (
              /* Card */
              <div key={item.id} className="wl-card">
                {/* Product image */}
                {item.imageUrl ? (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="wl-card-img-link">
                    <img src={item.imageUrl} alt={item.name} className="wl-card-img" loading="lazy"
                      onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }} />
                  </a>
                ) : (
                  <div className="wl-card-img-placeholder">
                    <span style={{ fontSize: 28 }}>
                      {item.metal === 'gold' ? '🪙' : item.metal === 'silver' ? '🥈' : item.metal === 'platinum' ? '💎' : item.metal === 'palladium' ? '⚪' : '⭐'}
                    </span>
                  </div>
                )}

                {/* Card body */}
                <div className="wl-card-body">
                  <div className="wl-card-top">
                    {item.metal && METALS[item.metal] && (
                      <span className="wl-card-metal" style={{ color: METALS[item.metal].color }}>
                        <span className="wl-metal-dot" style={{ background: METALS[item.metal].color }} />
                        {METALS[item.metal].name}
                      </span>
                    )}
                    <span className="wl-card-domain">{getDomain(item.url)}</span>
                  </div>

                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="wl-card-name">
                    {item.name}
                  </a>

                  {item.price != null && (
                    <div className="wl-card-price">{formatCurrency(item.price)}</div>
                  )}

                  <div className="wl-card-footer">
                    <div className="wl-card-meta">
                      <AvailabilityBadge notes={item.notes} />
                      <span className="wl-card-date">{formatDate(item.createdAt)}</span>
                    </div>
                    {item.notes && !['in stock', 'out of stock'].includes(item.notes?.toLowerCase()) && (
                      <div className="wl-card-notes">{item.notes}</div>
                    )}
                  </div>
                </div>

                {/* Card actions */}
                <div className="wl-card-actions">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost wl-action-btn" title="Open">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                  <button className="btn btn-sm btn-ghost wl-action-btn" onClick={() => startEdit(item)} title="Edit">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  {deleteConfirm === item.id ? (
                    <>
                      <button className="btn btn-sm btn-danger wl-action-btn" onClick={() => handleDelete(item.id)}>Delete</button>
                      <button className="btn btn-sm wl-action-btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                    </>
                  ) : (
                    <button className="btn btn-sm btn-ghost-danger wl-action-btn" onClick={() => setDeleteConfirm(item.id)} title="Remove">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
