import { useState } from 'react';
import { FOLDER_COLORS } from '../hooks/useFolders';

export default function FolderManager({ folders, onCreate, onRename, onUpdateColor, onDelete, onClose }) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(FOLDER_COLORS[0]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await onCreate(newName.trim(), newColor);
    setNewName('');
    setNewColor(FOLDER_COLORS[0]);
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

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal folder-manager-modal">
        <div className="modal-header">
          <h2>Manage Folders</h2>
          <button className="modal-close" onClick={onClose}>&#10005;</button>
        </div>

        <div className="modal-body">
          {/* Create new folder */}
          <form className="folder-create-form" onSubmit={handleCreate}>
            <div className="folder-create-row">
              <div className="folder-color-pick">
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`folder-color-dot ${newColor === c ? 'active' : ''}`}
                    style={{ background: c }}
                    onClick={() => setNewColor(c)}
                  />
                ))}
              </div>
              <div className="folder-create-input-row">
                <input
                  className="form-input"
                  type="text"
                  placeholder="New folder name..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={!newName.trim()}>
                  Create
                </button>
              </div>
            </div>
          </form>

          {/* Existing folders */}
          <div className="folder-list">
            {folders.length === 0 ? (
              <p className="folder-empty">No folders yet. Create one above!</p>
            ) : (
              folders.map((folder) => (
                <div key={folder.id} className="folder-list-item">
                  {editingId === folder.id ? (
                    <div className="folder-edit-row">
                      <input
                        className="form-input folder-edit-input"
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(folder.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                      />
                      <button className="btn btn-sm btn-primary" onClick={() => handleRename(folder.id)}>Save</button>
                      <button className="btn btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <div className="folder-list-item-left">
                        <span className="folder-icon-dot" style={{ background: folder.color }} />
                        <span className="folder-list-name">{folder.name}</span>
                      </div>
                      <div className="folder-list-item-actions">
                        {/* Color picker */}
                        <div className="folder-color-mini">
                          {FOLDER_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              className={`folder-color-mini-dot ${folder.color === c ? 'active' : ''}`}
                              style={{ background: c }}
                              onClick={() => onUpdateColor(folder.id, c)}
                            />
                          ))}
                        </div>
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => { setEditingId(folder.id); setEditName(folder.name); }}
                          title="Rename"
                        >
                          &#9998;
                        </button>
                        {deleteConfirm === folder.id ? (
                          <div className="folder-delete-confirm">
                            <span className="folder-delete-text">Delete?</span>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(folder.id)}>Yes</button>
                            <button className="btn btn-sm" onClick={() => setDeleteConfirm(null)}>No</button>
                          </div>
                        ) : (
                          <button
                            className="btn btn-sm btn-ghost-danger"
                            onClick={() => setDeleteConfirm(folder.id)}
                            title="Delete"
                          >
                            &#10005;
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))
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

// Small inline folder picker for use in AddModal, HoldingDetail, etc.
export function FolderPicker({ folders, value, onChange, compact }) {
  if (folders.length === 0) return null;

  return (
    <div className={`folder-picker ${compact ? 'compact' : ''}`}>
      <button
        type="button"
        className={`folder-pick-option ${!value ? 'active' : ''}`}
        onClick={() => onChange(null)}
      >
        <span className="folder-pick-none">---</span>
        <span className="folder-pick-label">None</span>
      </button>
      {folders.map((f) => (
        <button
          key={f.id}
          type="button"
          className={`folder-pick-option ${value === f.id ? 'active' : ''}`}
          onClick={() => onChange(f.id)}
        >
          <span className="folder-pick-dot" style={{ background: f.color }} />
          <span className="folder-pick-label">{f.name}</span>
        </button>
      ))}
    </div>
  );
}
