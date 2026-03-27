import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

const THEME_OPTIONS = [
  {
    id: 'dark',
    name: 'Dark',
    desc: 'Default dark theme',
    swatches: ['#0B0F19', '#111827', '#D4AF37', '#818CF8', '#F1F5F9'],
  },
  {
    id: 'light',
    name: 'Light',
    desc: 'Clean & bright',
    swatches: ['#FFFFFF', '#F1F5F9', '#D4AF37', '#6366F1', '#1E293B'],
  },
  {
    id: 'capybara',
    name: 'Capybara',
    desc: 'Warm & playful',
    swatches: ['#FFF8F0', '#E8D5B7', '#C4956A', '#E8734A', '#3D2415'],
  },
  {
    id: 'midnight',
    name: 'Midnight',
    desc: 'Deep navy & gold',
    swatches: ['#0A1628', '#0F2347', '#D4AF37', '#60A5FA', '#E2E8F0'],
  },
];

export default function ThemePicker({ children, onSignOut, signOutLabel }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="theme-picker-wrap" ref={ref}>
      <div onClick={() => setOpen((v) => !v)} style={{ cursor: 'pointer' }}>
        {children}
      </div>
      {open && (
        <div className="theme-picker">
          <div className="theme-picker-label">Theme</div>
          {THEME_OPTIONS.map((t) => (
            <button
              key={t.id}
              className={`theme-option${theme === t.id ? ' active' : ''}`}
              onClick={() => { setTheme(t.id); setOpen(false); }}
            >
              <div className="theme-swatches">
                {t.swatches.map((c, i) => (
                  <div key={i} className="theme-swatch" style={{ background: c }} />
                ))}
              </div>
              <div className="theme-option-info">
                <span className="theme-option-name">{t.name}</span>
                <span className="theme-option-desc">{t.desc}</span>
              </div>
              {theme === t.id && <span className="theme-option-check">✓</span>}
            </button>
          ))}
          <div className="theme-picker-divider" />
          <button className="theme-option theme-signout" onClick={() => { setOpen(false); onSignOut(); }}>
            {signOutLabel || 'Sign Out'}
          </button>
        </div>
      )}
    </div>
  );
}
