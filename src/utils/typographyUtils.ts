export interface TypographySettings {
  baseFontSize: number;
  scaleRatio: number;
  minFontSize: number;
  maxFontSize: number;
  lineHeight: number;
  letterSpacing: number;
}

export interface ResponsiveFontSize {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
}

// Default responsive typography settings
const defaultSettings: TypographySettings = {
  baseFontSize: 16,
  scaleRatio: 1.2,
  minFontSize: 12,
  maxFontSize: 24,
  lineHeight: 1.5,
  letterSpacing: 0.025
};

// Fluid typography calculation
export function calculateFluidTypography(
  minViewport: number,
  maxViewport: number,
  minFontSize: number,
  maxFontSize: number
): string {
  const slope = (maxFontSize - minFontSize) / (maxViewport - minViewport);
  const intercept = minFontSize - slope * minViewport;

  return `
    clamp(
      ${minFontSize}px,
      ${slope * 100}vw + ${intercept}px,
      ${maxFontSize}px
    )
  `;
}

// Generate responsive font size classes
export function generateResponsiveFontSizes(_settings: TypographySettings = defaultSettings): ResponsiveFontSize {
  return {
    xs: calculateFluidTypography(320, 1200, 12, 14),
    sm: calculateFluidTypography(320, 1200, 14, 16),
    md: calculateFluidTypography(320, 1200, 16, 18),
    lg: calculateFluidTypography(320, 1200, 18, 20),
    xl: calculateFluidTypography(320, 1200, 20, 24),
    '2xl': calculateFluidTypography(320, 1200, 24, 32)
  };
}

// Calculate optimal line height based on font size
export function calculateLineHeight(fontSize: number, _settings: TypographySettings = defaultSettings): number {
  if (fontSize <= 16) return 1.6;
  if (fontSize <= 20) return 1.5;
  if (fontSize <= 24) return 1.4;
  return 1.3;
}

// Calculate optimal letter spacing based on font size
export function calculateLetterSpacing(fontSize: number, _settings: TypographySettings = defaultSettings): string {
  if (fontSize <= 14) return '0.05em';
  if (fontSize <= 18) return '0.025em';
  if (fontSize <= 24) return '0em';
  return '-0.025em';
}

// Typography accessibility utilities
export class TypographyAccessibilityManager {
  private settings: TypographySettings;
  private observers: ResizeObserver[] = [];

  constructor(settings: TypographySettings = defaultSettings) {
    this.settings = settings;
  }

  // Apply user preferences for font size
  applyUserFontSizePreference(preference: 'small' | 'medium' | 'large' | 'extra-large'): void {
    const multipliers = {
      'small': 0.875,
      'medium': 1,
      'large': 1.125,
      'extra-large': 1.25
    };

    const multiplier = multipliers[preference];
    const newBaseSize = Math.round(defaultSettings.baseFontSize * multiplier);

    // Apply to CSS custom properties
    document.documentElement.style.setProperty('--user-font-size-multiplier', multiplier.toString());
    document.documentElement.style.setProperty('--user-base-font-size', `${newBaseSize}px`);

    // Store preference
    localStorage.setItem('typography-font-size-preference', preference);
  }

  // Apply user preferences for line height
  applyUserLineHeightPreference(preference: 'tight' | 'normal' | 'relaxed'): void {
    const multipliers = {
      'tight': 1.2,
      'normal': 1.5,
      'relaxed': 1.7
    };

    const multiplier = multipliers[preference];
    document.documentElement.style.setProperty('--user-line-height-multiplier', multiplier.toString());

    localStorage.setItem('typography-line-height-preference', preference);
  }

  // Apply user preferences for letter spacing
  applyUserLetterSpacingPreference(preference: 'tight' | 'normal' | 'wide'): void {
    const values = {
      'tight': '-0.05em',
      'normal': '0.025em',
      'wide': '0.1em'
    };

    const value = values[preference];
    document.documentElement.style.setProperty('--user-letter-spacing', value);

    localStorage.setItem('typography-letter-spacing-preference', preference);
  }

  // Load saved preferences
  loadSavedPreferences(): void {
    const fontSizePref = localStorage.getItem('typography-font-size-preference') as any;
    const lineHeightPref = localStorage.getItem('typography-line-height-preference') as any;
    const letterSpacingPref = localStorage.getItem('typography-letter-spacing-preference') as any;

    if (fontSizePref && ['small', 'medium', 'large', 'extra-large'].includes(fontSizePref)) {
      this.applyUserFontSizePreference(fontSizePref);
    }

    if (lineHeightPref && ['tight', 'normal', 'relaxed'].includes(lineHeightPref)) {
      this.applyUserLineHeightPreference(lineHeightPref);
    }

    if (letterSpacingPref && ['tight', 'normal', 'wide'].includes(letterSpacingPref)) {
      this.applyUserLetterSpacingPreference(letterSpacingPref);
    }
  }

  // Observe element for responsive typography adjustments
  observeElement(element: Element, callback?: (fontSize: string) => void): void {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const fontSize = this.calculateResponsiveFontSize(width);
        if (callback) {
          callback(fontSize);
        }
      }
    });

    resizeObserver.observe(element);
    this.observers.push(resizeObserver);
  }

  private calculateResponsiveFontSize(viewportWidth: number): string {
    const { baseFontSize, minFontSize, maxFontSize } = this.settings;

    if (viewportWidth <= 320) return `${minFontSize}px`;
    if (viewportWidth >= 1200) return `${Math.min(baseFontSize, maxFontSize)}px`;

    // Linear interpolation between min and max viewport widths
    const ratio = (viewportWidth - 320) / (1200 - 320);
    const fontSize = minFontSize + (baseFontSize - minFontSize) * ratio;

    return `${Math.round(fontSize)}px`;
  }

  // Cleanup observers
  disconnect(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Create global typography manager instance
export const typographyManager = new TypographyAccessibilityManager();

// Initialize on module load
if (typeof window !== 'undefined') {
  typographyManager.loadSavedPreferences();
}

// Typography presets for consistent styling
export const typographyPresets = {
  heading: {
    fontSize: generateResponsiveFontSizes(),
    lineHeight: 1.2,
    letterSpacing: '-0.025em',
    fontWeight: 700
  },
  subheading: {
    fontSize: generateResponsiveFontSizes(),
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
    fontWeight: 600
  },
  body: {
    fontSize: generateResponsiveFontSizes(),
    lineHeight: 1.6,
    letterSpacing: '0.025em',
    fontWeight: 400
  },
  caption: {
    fontSize: generateResponsiveFontSizes(),
    lineHeight: 1.4,
    letterSpacing: '0.05em',
    fontWeight: 400
  },
  button: {
    fontSize: generateResponsiveFontSizes(),
    lineHeight: 1,
    letterSpacing: '0.025em',
    fontWeight: 500
  }
};

// Utility function to apply responsive typography to elements
export function applyResponsiveTypography(
  element: HTMLElement,
  preset: keyof typeof typographyPresets = 'body'
): void {
  const typography = typographyPresets[preset];

  Object.entries(typography).forEach(([property, value]) => {
    if (property === 'fontSize' && typeof value === 'object') {
      // Handle responsive font size
      const currentBreakpoint = getCurrentBreakpoint();
      element.style.fontSize = value[currentBreakpoint] || value.md;
    } else {
      element.style[property as any] = value.toString();
    }
  });
}

// Get current breakpoint based on viewport width
function getCurrentBreakpoint(): keyof ResponsiveFontSize {
  if (typeof window === 'undefined') return 'md';

  const width = window.innerWidth;
  if (width < 640) return 'xs';
  if (width < 768) return 'sm';
  if (width < 1024) return 'md';
  if (width < 1280) return 'lg';
  return 'xl';
}

// Hook for React components to use responsive typography
export function useResponsiveTypography(preset: keyof typeof typographyPresets = 'body') {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<keyof ResponsiveFontSize>('md');

  useEffect(() => {
    const updateBreakpoint = () => {
      setCurrentBreakpoint(getCurrentBreakpoint());
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return {
    currentBreakpoint,
    typography: typographyPresets[preset],
    fontSize: typographyPresets[preset].fontSize[currentBreakpoint]
  };
}

// Import React for the hook (this would be in a separate file in a real implementation)
import { useState, useEffect } from 'react';