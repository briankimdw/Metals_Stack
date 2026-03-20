import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getCatalogByMetal } from '../utils/coinCatalog';
import { CatalogCoinSVG, BarSVG, CoinThumbnail } from './CoinArt';

const TABS = [
  { key: 'catalog', label: 'Popular Coins' },
  { key: 'url', label: 'Image URL' },
  { key: 'upload', label: 'Upload' },
];

export default function ImagePicker({ metal, value, onChange }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('catalog');
  const [urlInput, setUrlInput] = useState(value && !value.startsWith('catalog:') ? value : '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const catalogItems = getCatalogByMetal(metal);

  const handleCatalogSelect = (slug) => {
    const newVal = `catalog:${slug}`;
    onChange(newVal === value ? '' : newVal);
  };

  const handleUrlSubmit = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    onChange(trimmed);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      return;
    }

    setUploading(true);
    setError('');

    const ext = file.name.split('.').pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('coin-images')
      .upload(path, file);

    if (uploadError) {
      setError('Upload failed: ' + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('coin-images')
      .getPublicUrl(path);

    onChange(publicUrl);
    setUploading(false);
  };

  return (
    <div className="image-picker">
      <label className="form-label">Image (optional)</label>

      {/* Preview */}
      {value && (
        <div className="image-picker-preview">
          <CoinThumbnail imageUrl={value} metal={metal} size={64} />
          <button type="button" className="btn btn-sm" onClick={() => { onChange(''); setUrlInput(''); }}>
            Remove
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="image-picker-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`image-picker-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Catalog grid */}
      {tab === 'catalog' && (
        <div className="image-picker-catalog">
          {catalogItems.map((item) => {
            const isSelected = value === `catalog:${item.slug}`;
            return (
              <button
                key={item.slug}
                type="button"
                className={`catalog-item ${isSelected ? 'selected' : ''}`}
                onClick={() => handleCatalogSelect(item.slug)}
                title={item.name}
              >
                {item.type === 'bar' ? (
                  <BarSVG metal={item.metal} size={56} />
                ) : (
                  <CatalogCoinSVG emblem={item.emblem} metal={item.metal} size={44} />
                )}
                <span className="catalog-item-name">{item.name}</span>
              </button>
            );
          })}
          {catalogItems.length === 0 && (
            <p className="image-picker-empty">No catalog items for this metal</p>
          )}
        </div>
      )}

      {/* URL input */}
      {tab === 'url' && (
        <div className="image-picker-url">
          <input
            type="url"
            className="form-input"
            placeholder="https://example.com/coin-image.jpg"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
          />
          <button type="button" className="btn btn-sm" onClick={handleUrlSubmit}
            disabled={!urlInput.trim()}>
            Set Image
          </button>
        </div>
      )}

      {/* Upload */}
      {tab === 'upload' && (
        <div className="image-picker-upload">
          <label className="upload-zone">
            <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} />
            <span>{uploading ? 'Uploading...' : 'Click to upload an image'}</span>
            <span className="upload-hint">JPG, PNG, WebP - Max 5MB</span>
          </label>
        </div>
      )}

      {error && <p className="image-picker-error">{error}</p>}
    </div>
  );
}
