import { ColorTheme } from '../../contexts/ThemeContext';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: {
    base: string;
    elevated: string;
    overlay: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  border: string;
  gradient: {
    start: string;
    end: string;
  };
}

export interface CosmicEffects {
  enableStars: boolean;
  enableNebula: boolean;
  nebulaColors: string[];
  starDensity: 'low' | 'medium' | 'high';
}

export interface ThemeConfig {
  name: ColorTheme;
  displayName: string;
  description: string;
  icon: string;
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
  cosmic?: CosmicEffects;
}

/**
 * Cosmic Purple Theme (Default)
 * Deep purples, blues, and cosmic atmosphere
 */
export const cosmicTheme: ThemeConfig = {
  name: 'cosmic',
  displayName: 'Midnight Cosmic',
  description: 'Deep purples and blues with starfield effects',
  icon: '🌌',
  colors: {
    light: {
      primary: '#8b5cf6',
      secondary: '#6366f1',
      accent: '#ec4899',
      background: {
        base: '#f9fafb',
        elevated: '#ffffff',
        overlay: '#f3f4f6',
      },
      text: {
        primary: '#111827',
        secondary: '#6b7280',
        tertiary: '#9ca3af',
      },
      border: '#e5e7eb',
      gradient: {
        start: '#8b5cf6',
        end: '#6366f1',
      },
    },
    dark: {
      primary: '#a78bfa',
      secondary: '#818cf8',
      accent: '#f472b6',
      background: {
        base: '#0B0F1A',
        elevated: '#1A0B2E',
        overlay: '#2D1B69',
      },
      text: {
        primary: '#f9fafb',
        secondary: '#d1d5db',
        tertiary: '#9ca3af',
      },
      border: '#374151',
      gradient: {
        start: '#8b5cf6',
        end: '#6366f1',
      },
    },
  },
  cosmic: {
    enableStars: true,
    enableNebula: true,
    nebulaColors: ['#8b5cf6', '#a855f7', '#d946ef'],
    starDensity: 'high',
  },
};

/**
 * Ocean Breeze Theme
 * Blues, teals, and aqua tones
 */
export const oceanTheme: ThemeConfig = {
  name: 'ocean',
  displayName: 'Ocean Breeze',
  description: 'Calming blues and teals inspired by the sea',
  icon: '🌊',
  colors: {
    light: {
      primary: '#0891b2',
      secondary: '#06b6d4',
      accent: '#22d3ee',
      background: {
        base: '#f0fdfa',
        elevated: '#ffffff',
        overlay: '#ccfbf1',
      },
      text: {
        primary: '#134e4a',
        secondary: '#0f766e',
        tertiary: '#14b8a6',
      },
      border: '#99f6e4',
      gradient: {
        start: '#0891b2',
        end: '#06b6d4',
      },
    },
    dark: {
      primary: '#22d3ee',
      secondary: '#06b6d4',
      accent: '#67e8f9',
      background: {
        base: '#0a192f',
        elevated: '#112240',
        overlay: '#1a365d',
      },
      text: {
        primary: '#e0f2fe',
        secondary: '#bae6fd',
        tertiary: '#7dd3fc',
      },
      border: '#1e3a8a',
      gradient: {
        start: '#0891b2',
        end: '#22d3ee',
      },
    },
  },
  cosmic: {
    enableStars: true,
    enableNebula: true,
    nebulaColors: ['#0891b2', '#06b6d4', '#22d3ee'],
    starDensity: 'medium',
  },
};

/**
 * Sunset Glow Theme
 * Warm oranges, pinks, and golden tones
 */
export const sunsetTheme: ThemeConfig = {
  name: 'sunset',
  displayName: 'Sunset Glow',
  description: 'Warm oranges and pinks like a beautiful sunset',
  icon: '🌅',
  colors: {
    light: {
      primary: '#f97316',
      secondary: '#fb923c',
      accent: '#fbbf24',
      background: {
        base: '#fff7ed',
        elevated: '#ffffff',
        overlay: '#ffedd5',
      },
      text: {
        primary: '#7c2d12',
        secondary: '#9a3412',
        tertiary: '#c2410c',
      },
      border: '#fed7aa',
      gradient: {
        start: '#f97316',
        end: '#fb923c',
      },
    },
    dark: {
      primary: '#fb923c',
      secondary: '#f97316',
      accent: '#fbbf24',
      background: {
        base: '#1a0f0a',
        elevated: '#2d1810',
        overlay: '#451a03',
      },
      text: {
        primary: '#fed7aa',
        secondary: '#fdba74',
        tertiary: '#fb923c',
      },
      border: '#7c2d12',
      gradient: {
        start: '#f97316',
        end: '#fb923c',
      },
    },
  },
  cosmic: {
    enableStars: true,
    enableNebula: true,
    nebulaColors: ['#f97316', '#fb923c', '#fbbf24'],
    starDensity: 'medium',
  },
};

/**
 * Forest Green Theme
 * Earthy greens and natural tones
 */
export const forestTheme: ThemeConfig = {
  name: 'forest',
  displayName: 'Forest Green',
  description: 'Natural greens and earth tones',
  icon: '🌲',
  colors: {
    light: {
      primary: '#16a34a',
      secondary: '#22c55e',
      accent: '#84cc16',
      background: {
        base: '#f0fdf4',
        elevated: '#ffffff',
        overlay: '#dcfce7',
      },
      text: {
        primary: '#14532d',
        secondary: '#166534',
        tertiary: '#15803d',
      },
      border: '#bbf7d0',
      gradient: {
        start: '#16a34a',
        end: '#22c55e',
      },
    },
    dark: {
      primary: '#22c55e',
      secondary: '#4ade80',
      accent: '#a3e635',
      background: {
        base: '#0a1f0f',
        elevated: '#14291a',
        overlay: '#1a3d23',
      },
      text: {
        primary: '#dcfce7',
        secondary: '#bbf7d0',
        tertiary: '#86efac',
      },
      border: '#166534',
      gradient: {
        start: '#16a34a',
        end: '#22c55e',
      },
    },
  },
  cosmic: {
    enableStars: true,
    enableNebula: true,
    nebulaColors: ['#16a34a', '#22c55e', '#84cc16'],
    starDensity: 'low',
  },
};

/**
 * Rose Gold Theme
 * Elegant pinks and warm metallics
 */
export const roseGoldTheme: ThemeConfig = {
  name: 'rose-gold',
  displayName: 'Rose Gold',
  description: 'Elegant rose and warm metallic tones',
  icon: '🌸',
  colors: {
    light: {
      primary: '#ec4899',
      secondary: '#f472b6',
      accent: '#fbbf24',
      background: {
        base: '#fdf2f8',
        elevated: '#ffffff',
        overlay: '#fce7f3',
      },
      text: {
        primary: '#831843',
        secondary: '#9f1239',
        tertiary: '#be123c',
      },
      border: '#fbcfe8',
      gradient: {
        start: '#ec4899',
        end: '#f472b6',
      },
    },
    dark: {
      primary: '#f472b6',
      secondary: '#ec4899',
      accent: '#fbbf24',
      background: {
        base: '#1f0a14',
        elevated: '#2d1020',
        overlay: '#4a1a2c',
      },
      text: {
        primary: '#fce7f3',
        secondary: '#fbcfe8',
        tertiary: '#f9a8d4',
      },
      border: '#831843',
      gradient: {
        start: '#ec4899',
        end: '#f472b6',
      },
    },
  },
  cosmic: {
    enableStars: true,
    enableNebula: true,
    nebulaColors: ['#ec4899', '#f472b6', '#fbbf24'],
    starDensity: 'medium',
  },
};

/**
 * Neon Cyber Theme
 * Bright neons and cyberpunk aesthetics
 */
export const neonCyberTheme: ThemeConfig = {
  name: 'neon-cyber',
  displayName: 'Neon Cyber',
  description: 'Bright neons and cyberpunk vibes',
  icon: '⚡',
  colors: {
    light: {
      primary: '#a855f7',
      secondary: '#ec4899',
      accent: '#06b6d4',
      background: {
        base: '#faf5ff',
        elevated: '#ffffff',
        overlay: '#f3e8ff',
      },
      text: {
        primary: '#581c87',
        secondary: '#6b21a8',
        tertiary: '#7c3aed',
      },
      border: '#e9d5ff',
      gradient: {
        start: '#a855f7',
        end: '#ec4899',
      },
    },
    dark: {
      primary: '#c084fc',
      secondary: '#f472b6',
      accent: '#22d3ee',
      background: {
        base: '#0f0118',
        elevated: '#1a0524',
        overlay: '#2d0a47',
      },
      text: {
        primary: '#f5d0fe',
        secondary: '#e879f9',
        tertiary: '#c084fc',
      },
      border: '#581c87',
      gradient: {
        start: '#a855f7',
        end: '#f472b6',
      },
    },
  },
  cosmic: {
    enableStars: true,
    enableNebula: true,
    nebulaColors: ['#a855f7', '#ec4899', '#22d3ee'],
    starDensity: 'high',
  },
};

/**
 * All available themes
 */
export const allThemes: ThemeConfig[] = [
  cosmicTheme,
  oceanTheme,
  sunsetTheme,
  forestTheme,
  roseGoldTheme,
  neonCyberTheme,
];

/**
 * Get theme configuration by name
 */
export const getThemeConfig = (themeName: ColorTheme): ThemeConfig => {
  return allThemes.find(t => t.name === themeName) || cosmicTheme;
};

/**
 * Get theme colors for current mode
 */
export const getThemeColors = (themeName: ColorTheme, mode: 'light' | 'dark'): ThemeColors => {
  const theme = getThemeConfig(themeName);
  return theme.colors[mode];
};

export default {
  cosmicTheme,
  oceanTheme,
  sunsetTheme,
  forestTheme,
  roseGoldTheme,
  neonCyberTheme,
  allThemes,
  getThemeConfig,
  getThemeColors,
};
