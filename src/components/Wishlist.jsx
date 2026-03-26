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

export default function Wishlist({ items, tableError, onClose, onAdd, onRemove, onUpdate }) {
  const [search, setSearch] = useState('');
  const [filterMetal, setFilterMetal] = useState('all');
  const [urlInput, setUrlInput] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ url: '', name: '', metal: '', price: '', notes: '' });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const filtered = useMemo(() => {
    let list = items;
    if (filterMetal !== 'all') {
      list = list.filter((item) => item.metal === filterMetal);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((item) =>
        item.name.toLowerCase().includes(q) ||
        item.url.toLowerCase().includes(q) ||
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

  // Paste a URL → auto-fetch product info → add to wishlist
  const handleAddUrl = async (rawUrl) => {
    const url = normalizeUrl(rawUrl || urlInput);
    if (!url || url.length < 10) return;

    setFetching(true);
    setFetchError('');

    const info = await fetchProductInfo(url);

    if (info) {
      // Got product info — add directly to wishlist
      const name = info.name || getDomain(url);
      const metal = info.metal || null;
      const price = info.price || null;
      const notes = info.inStock === false ? 'Out of stock' : info.inStock === true ? 'In stock' : null;
      await onAdd(url, name, metal, price, notes);
      setUrlInput('');
      setFetchError('');
    } else {
      // Couldn't fetch info — add with domain as name so it's still tracked
      const name = getDomain(url);
      await onAdd(url, name, null, null, null);
      setUrlInput('');
      setFetchError('');
    }

    setFetching(false);
  };

  const handleUrlKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddUrl();
    }
  };

  const handleUrlPaste = (e) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted && pasted.trim().match(/^https?:\/\//i)) {
      // Auto-submit after paste if it looks like a full URL
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
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
            <p>Run the SQL migration in your Supabase SQL Editor to enable the wishlist. Copy the contents of <code>sql/007_wishlist.sql</code> and run it.</p>
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

      {/* URL Input Bar — just paste and go */}
      <div className="wishlist-url-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <input
          type="text"
          className="wishlist-url-input"
          placeholder={fetching ? 'Looking up product...' : 'Paste a product URL to add it to your wishlist'}
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
      {fetchError && <div className="wishlist-fetch-error">{fetchError}</div>}

      {/* Toolbar — search & filters */}
      {items.length > 0 && (
        <div className="wishlist-toolbar">
          <div className="wishlist-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
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
            <button
              className={`wishlist-filter-btn ${filterMetal === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMetal('all')}
            >
              All ({metalCounts.all})
            </button>
            {Object.entries(METALS).map(([key, m]) =>
              metalCounts[key] ? (
                <button
                  key={key}
                  className={`wishlist-filter-btn ${filterMetal === key ? 'active' : ''}`}
                  onClick={() => setFilterMetal(key)}
                  style={filterMetal === key ? { borderColor: m.color, color: m.color } : {}}
                >
                  {m.name} ({metalCounts[key]})
                </button>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Items List */}
      {filtered.length === 0 && items.length === 0 ? (
        <div className="wishlist-empty">
          <div className="wishlist-empty-icon">&#9734;</div>
          <h3>Your wishlist is empty</h3>
          <p>Paste any product URL above and we'll automatically grab the name, price, and details.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="wishlist-empty">
          <p>No items match your search.</p>
        </div>
      ) : (
        <div className="wishlist-list">
          {filtered.map((item) => (
            editingId === item.id ? (
              <form key={item.id} className="wishlist-add-form wishlist-edit-form" onSubmit={handleEdit}>
                <div className="wishlist-form-row">
                  <div className="wishlist-form-field wishlist-form-url">
                    <label>URL</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.url}
                      onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                      required
                    />
                  </div>
                  <div className="wishlist-form-field wishlist-form-name">
                    <label>Product Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="wishlist-form-row">
                  <div className="wishlist-form-field">
                    <label>Metal</label>
                    <select
                      className="form-input"
                      value={editForm.metal}
                      onChange={(e) => setEditForm({ ...editForm, metal: e.target.value })}
                    >
                      <option value="">-- None --</option>
                      {Object.entries(METALS).map(([key, m]) => (
                        <option key={key} value={key}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="wishlist-form-field">
                    <label>Price</label>
                    <input
                      type="number"
                      className="form-input"
                      step="0.01"
                      min="0"
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    />
                  </div>
                  <div className="wishlist-form-field wishlist-form-notes">
                    <label>Notes</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm">Save</button>
                  <button type="button" className="btn btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </form>
            ) : (
              <div key={item.id} className="wishlist-item">
                <div className="wishlist-item-main">
                  <div className="wishlist-item-top">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="wishlist-item-name"
                    >
                      {item.name}
                    </a>
                    <span className="wishlist-item-domain">{getDomain(item.url)}</span>
                  </div>
                  <div className="wishlist-item-meta">
                    {item.metal && METALS[item.metal] && (
                      <span
                        className="wishlist-item-metal"
                        style={{ color: METALS[item.metal].color }}
                      >
                        {METALS[item.metal].name}
                      </span>
                    )}
                    {item.price != null && (
                      <span className="wishlist-item-price">{formatCurrency(item.price)}</span>
                    )}
                    <span className="wishlist-item-date">{formatDate(item.createdAt)}</span>
                  </div>
                  {item.notes && (
                    <div className="wishlist-item-notes">{item.notes}</div>
                  )}
                </div>
                <div className="wishlist-item-actions">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-ghost"
                    title="Open link"
                  >
                    &#8599;
                  </a>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => startEdit(item)}
                    title="Edit"
                  >
                    &#9998;
                  </button>
                  {deleteConfirm === item.id ? (
                    <>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>Delete</button>
                      <button className="btn btn-sm" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                    </>
                  ) : (
                    <button
                      className="btn btn-sm btn-ghost-danger"
                      onClick={() => setDeleteConfirm(item.id)}
                      title="Delete"
                    >
                      &#10005;
                    </button>
                  )}
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
