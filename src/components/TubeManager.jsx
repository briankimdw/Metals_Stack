import { useState } from 'react';
import { TUBE_COLORS } from '../hooks/useTubes';

const COMMON_CAPACITIES = [10, 20, 25, 40, 50];

export default function TubeManager({ tubes, holdings, onCreate, onRename, onUpdateColor, onUpdateCapacity, onDelete, onClose }) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TUBE_COLORS[0]);
  const [newCapacity, setNewCapacity] = useState(20);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await onCreate(newName.trim(), newColor, newCapacity);
    setNewName('');
    setNewColor(TUBE_COLORS[0]);
    setNewCapacity(20);
  };

  const handleRename = async (id) => {
    if (!editName.trim()) return;
    await onRename(id, editName.trim());
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    await onDelete(id);
    setDeleteConfirm(null);
  };

  const getCount = (tubeId) => holdings.filter((h) => h.tubeId === tubeId).length;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal tube-manager-modal">
        <div className="modal-header">
          <h2>Manage Tubes</h2>
          <button className="modal-close" onClick={onClose}>&#10005;</button>
        </div>

        <div className="modal-body">
          {/* Create new tube */}
          <form className="tube-create-form" onSubmit={handleCreate}>
            <div className="tube-create-row">
              <div className="tube-color-pick">
                {TUBE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`tube-color-dot ${newColor === c ? 'active' : ''}`}
                    style={{ background: c }}
                    onClick={() => setNewColor(c)}
                  />
                ))}
              </div>
              <div className="tube-create-input-row">
                <input
                  className="form-input"
                  type="text"
                  placeholder="Tube name (e.g. Silver Eagles)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <div className="tube-capacity-pick">
                  <label className="tube-capacity-label">Cap:</label>
                  <select
                    className="form-input tube-capacity-select"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(parseInt(e.target.value, 10))}
                  >
                    {COMMON_CAPACITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary btn-sm" disabled={!newName.trim()}>
                  Create
                </button>
              </div>
            </div>
          </form>

          {/* Existing tubes */}
          <div className="tube-list">
            {tubes.length === 0 ? (
              <p className="tube-empty">No tubes yet. Create one above to organize your coins!</p>
            ) : (
              tubes.map((tube) => {
                const count = getCount(tube.id);
                const fillPct = Math.min((count / tube.capacity) * 100, 100);
                const isFull = count >= tube.capacity;

                return (
                  <div key={tube.id} className="tube-list-item">
                    {editingId === tube.id ? (
                      <div className="tube-edit-row">
                        <input
                          className="form-input tube-edit-input"
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(tube.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          autoFocus
                        />
                        <button className="btn btn-sm btn-primary" onClick={() => handleRename(tube.id)}>Save</button>
                        <button className="btn btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <>
                        <div className="tube-list-item-left">
                          <div className="tube-visual" style={{ '--tube-color': tube.color }}>
                            <div className="tube-fill" style={{ height: `${fillPct}%` }} />
                          </div>
                          <div className="tube-list-info">
                            <span className="tube-list-name">{tube.name}</span>
                            <span className={`tube-list-count ${isFull ? 'full' : ''}`}>
                              {count} / {tube.capacity}
                              {isFull && ' ✓ Full'}
                            </span>
                          </div>
                        </div>
                        <div className="tube-list-item-actions">
                          {/* Color picker */}
                          <div className="tube-color-mini">
                            {TUBE_COLORS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                className={`tube-color-mini-dot ${tube.color === c ? 'active' : ''}`}
                                style={{ background: c }}
                                onClick={() => onUpdateColor(tube.id, c)}
                              />
                            ))}
                          </div>
                          {/* Capacity */}
                          <select
                            className="form-input tube-capacity-select-mini"
                            value={tube.capacity}
                            onChange={(e) => onUpdateCapacity(tube.id, parseInt(e.target.value, 10))}
                            title="Tube capacity"
                          >
                            {COMMON_CAPACITIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => { setEditingId(tube.id); setEditName(tube.name); }}
                            title="Rename"
                          >
                            &#9998;
                          </button>
                          {deleteConfirm === tube.id ? (
                            <div className="tube-delete-confirm">
                              <span className="tube-delete-text">Delete?</span>
                              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(tube.id)}>Yes</button>
                              <button className="btn btn-sm" onClick={() => setDeleteConfirm(null)}>No</button>
                            </div>
                          ) : (
                            <button
                              className="btn btn-sm btn-ghost-danger"
                              onClick={() => setDeleteConfirm(tube.id)}
                              title="Delete"
                            >
                              &#10005;
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// Small inline tube picker for use in AddModal, HoldingDetail, etc.
export function TubePicker({ tubes, holdings, value, onChange, compact }) {
  if (tubes.length === 0) return null;

  const getCount = (tubeId) => holdings.filter((h) => h.tubeId === tubeId).length;

  return (
    <div className={`tube-picker ${compact ? 'compact' : ''}`}>
      <button
        type="button"
        className={`tube-pick-option ${!value ? 'active' : ''}`}
        onClick={() => onChange(null)}
      >
        <span className="tube-pick-none">---</span>
        <span className="tube-pick-label">None</span>
      </button>
      {tubes.map((t) => {
        const count = getCount(t.id);
        const isFull = count >= t.capacity;
        return (
          <button
            key={t.id}
            type="button"
            className={`tube-pick-option ${value === t.id ? 'active' : ''} ${isFull && value !== t.id ? 'tube-full' : ''}`}
            onClick={() => onChange(t.id)}
            title={`${count}/${t.capacity}`}
          >
            <span className="tube-pick-dot" style={{ background: t.color }} />
            <span className="tube-pick-label">{t.name}</span>
            <span className="tube-pick-count">{count}/{t.capacity}</span>
          </button>
        );
      })}
    </div>
  );
}
