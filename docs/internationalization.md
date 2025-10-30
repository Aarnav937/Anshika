# Internationalization Documentation

## Overview

A.N.S.H.I.K.A. supports multiple languages and locales to provide a localized experience for users worldwide. The internationalization (i18n) system handles text translation, date/time formatting, number formatting, and cultural adaptations.

## Supported Languages

### Current Language Support

```typescript
// src/config/locales.ts
export const supportedLocales = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' }
] as const;

export type SupportedLocale = typeof supportedLocales[number]['code'];
```

### Planned Languages

- Dutch (nl)
- Swedish (sv)
- Norwegian (no)
- Danish (da)
- Finnish (fi)
- Polish (pl)
- Czech (cs)
- Turkish (tr)
- Thai (th)
- Vietnamese (vi)

## Translation System

### Translation Files Structure

```
src/locales/
├── en/
│   ├── common.json
│   ├── chat.json
│   ├── documents.json
│   ├── images.json
│   ├── tasks.json
│   ├── settings.json
│   └── errors.json
├── es/
│   ├── common.json
│   ├── chat.json
│   └── ...
└── index.ts
```

### Translation File Example

```json
// src/locales/en/common.json
{
  "app": {
    "name": "A.N.S.H.I.K.A.",
    "description": "Advanced Neural System with Human-like Intelligence and Knowledge Assistant",
    "version": "Version {{version}}"
  },
  "navigation": {
    "home": "Home",
    "chat": "Chat",
    "documents": "Documents",
    "images": "Images",
    "tasks": "Tasks",
    "settings": "Settings"
  },
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "send": "Send",
    "upload": "Upload",
    "download": "Download"
  },
  "status": {
    "loading": "Loading...",
    "success": "Success",
    "error": "Error",
    "warning": "Warning",
    "info": "Information"
  }
}
```

```json
// src/locales/es/common.json
{
  "app": {
    "name": "A.N.S.H.I.K.A.",
    "description": "Sistema Neuronal Avanzado con Inteligencia y Asistente de Conocimiento Similar al Humano",
    "version": "Versión {{version}}"
  },
  "navigation": {
    "home": "Inicio",
    "chat": "Chat",
    "documents": "Documentos",
    "images": "Imágenes",
    "tasks": "Tareas",
    "settings": "Configuración"
  },
  "actions": {
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "edit": "Editar",
    "create": "Crear",
    "send": "Enviar",
    "upload": "Subir",
    "download": "Descargar"
  },
  "status": {
    "loading": "Cargando...",
    "success": "Éxito",
    "error": "Error",
    "warning": "Advertencia",
    "info": "Información"
  }
}
```

### Translation Hook

```typescript
// src/hooks/useTranslation.ts
import { useContext } from 'react';
import { I18nContext } from '../contexts/I18nContext';

export const useTranslation = (namespace?: string) => {
  const { t, locale, changeLocale, isLoading } = useContext(I18nContext);

  const translate = (key: string, options?: TranslationOptions): string => {
    const namespacedKey = namespace ? `${namespace}.${key}` : key;
    return t(namespacedKey, options);
  };

  return {
    t: translate,
    locale,
    changeLocale,
    isLoading
  };
};

interface TranslationOptions {
  defaultValue?: string;
  count?: number;
  context?: string;
  [key: string]: any;
}
```

### Translation Context

```typescript
// src/contexts/I18nContext.tsx
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { SupportedLocale, supportedLocales } from '../config/locales';

interface I18nContextType {
  locale: SupportedLocale;
  changeLocale: (locale: SupportedLocale) => Promise<void>;
  t: (key: string, options?: TranslationOptions) => string;
  isLoading: boolean;
}

interface TranslationOptions {
  defaultValue?: string;
  count?: number;
  context?: string;
  [key: string]: any;
}

export const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<SupportedLocale>('en');
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);

  const loadTranslations = useCallback(async (newLocale: SupportedLocale) => {
    setIsLoading(true);
    try {
      const modules = import.meta.glob('../locales/**/*.json');
      const translationModules: Record<string, any> = {};

      for (const path in modules) {
        if (path.includes(`/${newLocale}/`)) {
          const module = await modules[path]();
          const namespace = path.split('/').pop()?.replace('.json', '') || '';
          translationModules[namespace] = module.default || module;
        }
      }

      // Merge all translation files
      const mergedTranslations = Object.assign({}, ...Object.values(translationModules));
      setTranslations(mergedTranslations);
    } catch (error) {
      console.error('Failed to load translations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const changeLocale = useCallback(async (newLocale: SupportedLocale) => {
    await loadTranslations(newLocale);
    setLocale(newLocale);
    localStorage.setItem('preferred-locale', newLocale);

    // Update document language
    document.documentElement.lang = newLocale;

    // Update page title if needed
    document.title = translations['app.name'] || 'A.N.S.H.I.K.A.';
  }, [loadTranslations, translations]);

  const t = useCallback((key: string, options: TranslationOptions = {}): string => {
    const { defaultValue, count, ...interpolationValues } = options;

    let translation = getNestedValue(translations, key) || defaultValue || key;

    // Handle pluralization
    if (count !== undefined && typeof translation === 'object') {
      const pluralKey = getPluralKey(count, locale);
      translation = translation[pluralKey] || translation.other || translation;
    }

    // Handle interpolation
    if (typeof translation === 'string') {
      translation = interpolate(translation, interpolationValues);
    }

    return translation;
  }, [translations, locale]);

  useEffect(() => {
    // Load initial locale
    const savedLocale = localStorage.getItem('preferred-locale') as SupportedLocale;
    const browserLocale = navigator.language.split('-')[0] as SupportedLocale;
    const initialLocale = savedLocale || (supportedLocales.some(l => l.code === browserLocale) ? browserLocale : 'en');

    changeLocale(initialLocale);
  }, [changeLocale]);

  const value: I18nContextType = {
    locale,
    changeLocale,
    t,
    isLoading
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

// Utility functions
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

const getPluralKey = (count: number, locale: SupportedLocale): string => {
  // Simplified pluralization - in production, use a proper pluralization library
  if (locale === 'en') {
    return count === 1 ? 'one' : 'other';
  }
  // Add more locale-specific pluralization rules
  return 'other';
};

const interpolate = (text: string, values: Record<string, any>): string => {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return values[key] !== undefined ? String(values[key]) : match;
  });
};
```

## Date and Time Formatting

### Localized Date/Time Formatting

```typescript
// src/utils/dateTime.ts
import { format, formatDistance, formatRelative, Locale } from 'date-fns';
import { enUS, es, fr, de, it, pt, ru, ja, ko, zhCN, ar, hi } from 'date-fns/locale';

const localeMap: Record<SupportedLocale, Locale> = {
  en: enUS,
  es,
  fr,
  de,
  it,
  pt,
  ru,
  ja,
  ko,
  zh: zhCN,
  ar,
  hi
};

export class DateTimeFormatter {
  constructor(private locale: SupportedLocale) {}

  format(date: Date, formatString: string): string {
    return format(date, formatString, { locale: localeMap[this.locale] });
  }

  formatDistance(from: Date, to: Date = new Date()): string {
    return formatDistance(from, to, { locale: localeMap[this.locale] });
  }

  formatRelative(date: Date, baseDate: Date = new Date()): string {
    return formatRelative(date, baseDate, { locale: localeMap[this.locale] });
  }

  // Common formatters
  formatShort(date: Date): string {
    return this.format(date, 'MMM d, yyyy');
  }

  formatLong(date: Date): string {
    return this.format(date, 'EEEE, MMMM d, yyyy');
  }

  formatTime(date: Date): string {
    return this.format(date, 'HH:mm');
  }

  formatDateTime(date: Date): string {
    return this.format(date, 'MMM d, yyyy HH:mm');
  }
}

// Hook for localized date/time formatting
export const useDateTime = () => {
  const { locale } = useTranslation();
  const formatter = new DateTimeFormatter(locale);

  return {
    format: formatter.format.bind(formatter),
    formatDistance: formatter.formatDistance.bind(formatter),
    formatRelative: formatter.formatRelative.bind(formatter),
    formatShort: formatter.formatShort.bind(formatter),
    formatLong: formatter.formatLong.bind(formatter),
    formatTime: formatter.formatTime.bind(formatter),
    formatDateTime: formatter.formatDateTime.bind(formatter)
  };
};
```

## Number and Currency Formatting

### Localized Number Formatting

```typescript
// src/utils/numberFormat.ts
export class NumberFormatter {
  constructor(private locale: SupportedLocale) {}

  formatNumber(num: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.locale, options).format(num);
  }

  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat(this.locale, {
      style: 'currency',
      currency
    }).format(amount);
  }

  formatPercent(value: number, decimals: number = 1): string {
    return new Intl.NumberFormat(this.locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value / 100);
  }

  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${this.formatNumber(size, { maximumFractionDigits: 1 })} ${units[unitIndex]}`;
  }

  parseNumber(value: string): number {
    // Remove locale-specific formatting and parse
    const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.');
    return parseFloat(cleaned);
  }
}

// Hook for localized number formatting
export const useNumberFormat = () => {
  const { locale } = useTranslation();
  const formatter = new NumberFormatter(locale);

  return {
    formatNumber: formatter.formatNumber.bind(formatter),
    formatCurrency: formatter.formatCurrency.bind(formatter),
    formatPercent: formatter.formatPercent.bind(formatter),
    formatFileSize: formatter.formatFileSize.bind(formatter),
    parseNumber: formatter.parseNumber.bind(formatter)
  };
};
```

## Cultural Adaptations

### Text Direction Support

```typescript
// src/utils/textDirection.ts
export const getTextDirection = (locale: SupportedLocale): 'ltr' | 'rtl' => {
  const rtlLocales = ['ar', 'he', 'fa', 'ur'];
  return rtlLocales.includes(locale) ? 'rtl' : 'ltr';
};

export const isRTL = (locale: SupportedLocale): boolean => {
  return getTextDirection(locale) === 'rtl';
};

// RTL-aware CSS utilities
export const rtlFlip = (property: string, ltrValue: string, rtlValue: string): string => {
  return `/*rtl:${property}:${rtlValue};*/ ${property}:${ltrValue};`;
};
```

### RTL Styling

```typescript
// src/styles/rtl.css
/* RTL support */
[dir="rtl"] .text-left { text-align: right; }
[dir="rtl"] .text-right { text-align: left; }
[dir="rtl"] .float-left { float: right; }
[dir="rtl"] .float-right { float: left; }
[dir="rtl"] .ml-4 { margin-right: 1rem; margin-left: 0; }
[dir="rtl"] .mr-4 { margin-left: 1rem; margin-right: 0; }
[dir="rtl"] .pl-4 { padding-right: 1rem; padding-left: 0; }
[dir="rtl"] .pr-4 { padding-left: 1rem; padding-right: 0; }

/* RTL-specific adjustments */
[dir="rtl"] .chat-message.user { text-align: right; }
[dir="rtl"] .chat-message.assistant { text-align: left; }
[dir="rtl"] .message-bubble {
  direction: rtl;
  text-align: right;
}
```

### Cultural Content Adaptation

```typescript
// src/utils/culturalAdaptation.ts
export const getCulturalAdaptations = (locale: SupportedLocale) => {
  const adaptations = {
    en: {
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      currency: 'USD',
      numberGrouping: true
    },
    de: {
      dateFormat: 'DD.MM.YYYY',
      timeFormat: '24h',
      currency: 'EUR',
      numberGrouping: true
    },
    ar: {
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
      currency: 'SAR',
      numberGrouping: false
    },
    ja: {
      dateFormat: 'YYYY/MM/DD',
      timeFormat: '24h',
      currency: 'JPY',
      numberGrouping: true
    }
    // Add more locales...
  };

  return adaptations[locale] || adaptations.en;
};

export const adaptContent = (content: string, locale: SupportedLocale): string => {
  // Apply cultural adaptations to content
  const adaptations = getCulturalAdaptations(locale);

  // Example adaptations:
  // - Adjust formality levels
  // - Modify examples to be culturally relevant
  // - Change metaphors or idioms

  return content; // Placeholder - implement actual adaptation logic
};
```

## Component Internationalization

### Localized Components

```typescript
// src/components/LocaleSelector.tsx
import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { supportedLocales } from '../config/locales';

export const LocaleSelector: React.FC = () => {
  const { locale, changeLocale, t } = useTranslation('settings');

  return (
    <div className="locale-selector">
      <label htmlFor="locale-select">
        {t('language')}
      </label>
      <select
        id="locale-select"
        value={locale}
        onChange={(e) => changeLocale(e.target.value as SupportedLocale)}
        aria-describedby="locale-help"
      >
        {supportedLocales.map((localeOption) => (
          <option key={localeOption.code} value={localeOption.code}>
            {localeOption.nativeName} ({localeOption.flag})
          </option>
        ))}
      </select>
      <div id="locale-help" className="sr-only">
        {t('languageHelp')}
      </div>
    </div>
  );
};
```

### Localized Form Validation

```typescript
// src/utils/validationMessages.ts
export const getValidationMessages = (locale: SupportedLocale) => {
  const messages = {
    en: {
      required: 'This field is required',
      email: 'Please enter a valid email address',
      minLength: 'Must be at least {{min}} characters',
      maxLength: 'Must be no more than {{max}} characters',
      passwordMismatch: 'Passwords do not match'
    },
    es: {
      required: 'Este campo es obligatorio',
      email: 'Por favor ingrese una dirección de correo válida',
      minLength: 'Debe tener al menos {{min}} caracteres',
      maxLength: 'No debe tener más de {{max}} caracteres',
      passwordMismatch: 'Las contraseñas no coinciden'
    },
    fr: {
      required: 'Ce champ est obligatoire',
      email: 'Veuillez saisir une adresse e-mail valide',
      minLength: 'Doit contenir au moins {{min}} caractères',
      maxLength: 'Ne doit pas dépasser {{max}} caractères',
      passwordMismatch: 'Les mots de passe ne correspondent pas'
    }
    // Add more locales...
  };

  return messages[locale] || messages.en;
};
```

## Translation Management

### Translation Extraction

```typescript
// scripts/extract-translations.js
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const extractTranslations = () => {
  const files = glob.sync('src/**/*.{ts,tsx,js,jsx}');
  const translations = new Set();

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(/t\(['"]([^'"]+)['"]/g);

    if (matches) {
      matches.forEach(match => {
        const key = match.match(/t\(['"]([^'"]+)['"]/)[1];
        translations.add(key);
      });
    }
  });

  // Generate translation template
  const template = {};
  Array.from(translations).sort().forEach(key => {
    setNestedValue(template, key, '');
  });

  fs.writeFileSync('src/locales/en/template.json', JSON.stringify(template, null, 2));
};

const setNestedValue = (obj, path, value) => {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }

  current[keys[keys.length - 1]] = value;
};

extractTranslations();
```

### Translation Validation

```typescript
// src/utils/translationValidator.ts
export class TranslationValidator {
  static validateTranslations(baseTranslations: any, targetTranslations: any): ValidationResult {
    const missingKeys = this.findMissingKeys(baseTranslations, targetTranslations);
    const extraKeys = this.findExtraKeys(baseTranslations, targetTranslations);
    const placeholderIssues = this.checkPlaceholders(baseTranslations, targetTranslations);

    return {
      isValid: missingKeys.length === 0 && extraKeys.length === 0 && placeholderIssues.length === 0,
      missingKeys,
      extraKeys,
      placeholderIssues
    };
  }

  private static findMissingKeys(base: any, target: any, path = ''): string[] {
    const missing: string[] = [];

    Object.keys(base).forEach(key => {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof base[key] === 'object') {
        if (!target[key] || typeof target[key] !== 'object') {
          missing.push(currentPath);
        } else {
          missing.push(...this.findMissingKeys(base[key], target[key], currentPath));
        }
      } else if (!target.hasOwnProperty(key)) {
        missing.push(currentPath);
      }
    });

    return missing;
  }

  private static findExtraKeys(base: any, target: any, path = ''): string[] {
    const extra: string[] = [];

    Object.keys(target).forEach(key => {
      const currentPath = path ? `${path}.${key}` : key;

      if (!base.hasOwnProperty(key)) {
        extra.push(currentPath);
      } else if (typeof target[key] === 'object' && typeof base[key] === 'object') {
        extra.push(...this.findExtraKeys(base[key], target[key], currentPath));
      }
    });

    return extra;
  }

  private static checkPlaceholders(base: any, target: any, path = ''): string[] {
    const issues: string[] = [];

    Object.keys(base).forEach(key => {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof base[key] === 'string' && typeof target[key] === 'string') {
        const basePlaceholders = (base[key].match(/\{\{\w+\}\}/g) || []).sort();
        const targetPlaceholders = (target[key].match(/\{\{\w+\}\}/g) || []).sort();

        if (JSON.stringify(basePlaceholders) !== JSON.stringify(targetPlaceholders)) {
          issues.push(currentPath);
        }
      } else if (typeof base[key] === 'object' && typeof target[key] === 'object') {
        issues.push(...this.checkPlaceholders(base[key], target[key], currentPath));
      }
    });

    return issues;
  }
}

interface ValidationResult {
  isValid: boolean;
  missingKeys: string[];
  extraKeys: string[];
  placeholderIssues: string[];
}
```

## Testing Internationalization

### Translation Testing

```typescript
// src/test/utils/i18n.test.ts
import { render } from '@testing-library/react';
import { I18nProvider } from '../../contexts/I18nContext';
import { useTranslation } from '../../hooks/useTranslation';

const TestComponent = () => {
  const { t } = useTranslation();
  return <div>{t('common.actions.save')}</div>;
};

export const renderWithI18n = (component: React.ReactElement, locale = 'en') => {
  return render(
    <I18nProvider initialLocale={locale}>
      {component}
    </I18nProvider>
  );
};

describe('Internationalization', () => {
  it('renders English text correctly', async () => {
    const { findByText } = renderWithI18n(<TestComponent />, 'en');
    expect(await findByText('Save')).toBeInTheDocument();
  });

  it('renders Spanish text correctly', async () => {
    const { findByText } = renderWithI18n(<TestComponent />, 'es');
    expect(await findByText('Guardar')).toBeInTheDocument();
  });

  it('handles interpolation correctly', () => {
    const InterpolateComponent = () => {
      const { t } = useTranslation();
      return <div>{t('app.version', { version: '1.0.0' })}</div>;
    };

    const { findByText } = renderWithI18n(<InterpolateComponent />, 'en');
    expect(await findByText('Version 1.0.0')).toBeInTheDocument();
  });
});
```

### Date/Time Testing

```typescript
// src/utils/__tests__/dateTime.test.ts
import { DateTimeFormatter } from '../dateTime';

describe('DateTimeFormatter', () => {
  const testDate = new Date('2024-01-15T14:30:00Z');

  it('formats dates in English', () => {
    const formatter = new DateTimeFormatter('en');
    expect(formatter.formatShort(testDate)).toBe('Jan 15, 2024');
    expect(formatter.formatTime(testDate)).toBe('14:30');
  });

  it('formats dates in Spanish', () => {
    const formatter = new DateTimeFormatter('es');
    expect(formatter.formatShort(testDate)).toBe('15 ene 2024');
    expect(formatter.formatTime(testDate)).toBe('14:30');
  });

  it('formats relative time', () => {
    const formatter = new DateTimeFormatter('en');
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    expect(formatter.formatDistance(oneHourAgo, now)).toContain('hour');
  });
});
```

---

*Last updated: October 30, 2025*</content>
<parameter name="filePath">c:\Users\Aarnav\Desktop\Anshika\docs\internationalization.md