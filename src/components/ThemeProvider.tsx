"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ThemePreference = "light" | "dark";

const STORAGE_KEY = "aotrackr:theme";

type ThemeContextValue = {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeClass(theme: ThemePreference) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("dark");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark") {
        setThemeState(stored);
        applyThemeClass(stored);
        return;
      }
    } catch {
      // ignore
    }
    applyThemeClass("dark");
  }, []);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    applyThemeClass(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

/** Inline script to set theme class before paint (prevents FOUC). */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t!=='light'&&t!=='dark')t='dark';var d=document.documentElement;d.classList.remove('light','dark');d.classList.add(t);}catch(e){document.documentElement.classList.add('dark');}})();`;
