import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

/**
 * Theme mode options
 * - light: Force light mode
 * - dark: Force dark mode
 * - auto: Follow system preference
 */
export type ThemeMode = 'light' | 'dark' | 'auto';

/**
 * Available color themes
 */
export type ColorTheme = 
  | 'cosmic'      // Default dark theme with purple/blue gradients
  | 'ocean'       // Blue/teal water-inspired
  | 'sunset'      // Orange/pink warm tones
  | 'forest'      // Green/earth tones
  | 'rose-gold'   // Pink/gold metallics
  | 'neon-cyber'; // Bright neon cyberpunk

export interface ThemeContextValue {
  /** Current theme mode setting */
  theme: ThemeMode;
  /** Current color theme */
  colorTheme: ColorTheme;
  /** Resolved effective theme (light or dark) */
  effectiveTheme: 'light' | 'dark';
  /** Whether using system preference */
  isSystemPreference: boolean;
  /** Set theme mode */
  setTheme: (theme: ThemeMode) => void;
  /** Set color theme */
  setColorTheme: (theme: ColorTheme) => void;
  /** Toggle between light and dark */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'anshika-theme-mode';
const COLOR_THEME_STORAGE_KEY = 'anshika-color-theme';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>('auto');
  const [colorTheme, setColorThemeState] = useState<ColorTheme>('cosmic');
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('dark');
  const [isSystemPreference, setIsSystemPreference] = useState(true);

  /**
   * Get system color scheme preference
   */
  const getSystemPreference = useCallback((): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark'; // Default fallback
  }, []);

  /**
   * Load theme from localStorage
   */
  const loadStoredTheme = useCallback((): ThemeMode => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && ['light', 'dark', 'auto'].includes(stored)) {
        return stored as ThemeMode;
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error);
    }
    return 'auto'; // Default to auto
  }, []);

  /**
   * Load color theme from localStorage
   */
  const loadStoredColorTheme = useCallback((): ColorTheme => {
    try {
      const stored = localStorage.getItem(COLOR_THEME_STORAGE_KEY);
      if (stored && ['cosmic', 'ocean', 'sunset', 'forest', 'rose-gold', 'neon-cyber'].includes(stored)) {
        return stored as ColorTheme;
      }
    } catch (error) {
      console.warn('Failed to load color theme from localStorage:', error);
    }
    return 'cosmic'; // Default to cosmic
  }, []);

  /**
   * Apply theme to document
   */
  const applyTheme = useCallback((resolvedTheme: 'light' | 'dark', colorTheme: ColorTheme) => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    // Add new theme class
    root.classList.add(resolvedTheme);
    
    // Set color theme as data attribute
    root.setAttribute('data-color-theme', colorTheme);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#0B0F1A' : '#f9fafb');
    }

    // Announce theme change to screen readers
    announceThemeChange(resolvedTheme, colorTheme);
  }, []);

  /**
   * Announce theme change to screen readers
   */
  const announceThemeChange = (theme: 'light' | 'dark', colorTheme: ColorTheme) => {
    const liveRegion = document.getElementById('aria-live-polite');
    if (liveRegion) {
      const colorThemeName = colorTheme.charAt(0).toUpperCase() + colorTheme.slice(1).replace('-', ' ');
      liveRegion.textContent = `Theme changed to ${theme} mode with ${colorThemeName} colors`;
      // Clear after announcement
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  };

  /**
   * Set theme mode and persist to localStorage
   */
  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    setIsSystemPreference(newTheme === 'auto');
    
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error);
    }

    // Resolve effective theme
    const resolved = newTheme === 'auto' ? getSystemPreference() : newTheme;
    setEffectiveTheme(resolved);
    applyTheme(resolved, colorTheme);
  }, [getSystemPreference, colorTheme, applyTheme]);

  /**
   * Set color theme and persist to localStorage
   */
  const setColorTheme = useCallback((newColorTheme: ColorTheme) => {
    setColorThemeState(newColorTheme);
    
    try {
      localStorage.setItem(COLOR_THEME_STORAGE_KEY, newColorTheme);
    } catch (error) {
      console.warn('Failed to save color theme to localStorage:', error);
    }

    applyTheme(effectiveTheme, newColorTheme);
  }, [effectiveTheme, applyTheme]);

  /**
   * Toggle between light and dark modes
   */
  const toggleTheme = useCallback(() => {
    const newTheme = effectiveTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [effectiveTheme, setTheme]);

  /**
   * Initialize theme on mount
   */
  useEffect(() => {
    const storedTheme = loadStoredTheme();
    const storedColorTheme = loadStoredColorTheme();
    
    setThemeState(storedTheme);
    setColorThemeState(storedColorTheme);
    setIsSystemPreference(storedTheme === 'auto');
    
    const resolved = storedTheme === 'auto' ? getSystemPreference() : storedTheme;
    setEffectiveTheme(resolved);
    applyTheme(resolved, storedColorTheme);
  }, [loadStoredTheme, loadStoredColorTheme, getSystemPreference, applyTheme]);

  /**
   * Listen for system preference changes
   */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'auto') {
        const newTheme = e.matches ? 'dark' : 'light';
        setEffectiveTheme(newTheme);
        applyTheme(newTheme, colorTheme);
      }
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } 
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [theme, colorTheme, applyTheme]);

  /**
   * Prevent flash of unstyled content
   */
  useEffect(() => {
    // Add transition class after initial render to prevent jarring changes
    const timer = setTimeout(() => {
      document.documentElement.classList.add('theme-transition-ready');
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const value: ThemeContextValue = {
    theme,
    colorTheme,
    effectiveTheme,
    isSystemPreference,
    setTheme,
    setColorTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook to use theme context
 */
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
