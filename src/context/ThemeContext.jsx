import { createContext, useContext, useState, useLayoutEffect } from 'react';

const STORAGE_KEY = 'metal-stacker-theme';
const THEMES = ['dark', 'light', 'capybara', 'midnight'];
const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(saved) ? saved : 'dark';
  });

  useLayoutEffect(() => {
    if (theme === 'dark') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  const setTheme = (t) => {
    if (THEMES.includes(t)) {
      localStorage.setItem(STORAGE_KEY, t);
      setThemeState(t);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
