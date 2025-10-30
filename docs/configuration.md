# Configuration Documentation

## Overview

A.N.S.H.I.K.A. uses a comprehensive configuration system that supports multiple environments, feature flags, and user preferences. The configuration is managed through TypeScript files, environment variables, and runtime settings.

## Configuration Structure

### Core Configuration Files

```
src/config/
├── index.ts           # Main configuration export
├── demo.ts           # Demo mode configuration
├── personalityConfig.ts # AI personality settings
└── personas.ts       # Available AI personas
```

### Main Configuration (`src/config/index.ts`)

```typescript
import { AppConfig, ApiKeyConfig, UserPreferences } from '../types';

export const appConfig: AppConfig = {
  version: '1.0.0',
  environment: process.env.NODE_ENV as 'development' | 'staging' | 'production' || 'development',
  api: {
    baseUrl: process.env.VITE_API_BASE_URL || 'https://api.anshika.ai',
    timeout: 30000,
    retries: 3
  },
  features: {
    chat: true,
    documents: true,
    images: true,
    tasks: true,
    voice: true
  },
  ui: {
    theme: 'cosmic',
    language: 'en',
    animations: true,
    compactMode: false
  },
  storage: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['.pdf', '.docx', '.txt', '.png', '.jpg', '.jpeg', '.gif'],
    cacheSize: 100 * 1024 * 1024 // 100MB
  }
};
```

## Environment Variables

### Required Environment Variables

```bash
# API Keys
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_WEATHER_API_KEY=your_weather_api_key_here
VITE_SEARCH_API_KEY=your_search_api_key_here

# Application Settings
VITE_API_BASE_URL=https://api.anshika.ai
VITE_ENVIRONMENT=production
VITE_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_VOICE=true
VITE_ENABLE_DOCUMENTS=true
VITE_ENABLE_IMAGES=true
VITE_ENABLE_TASKS=true
VITE_ENABLE_WEB_SEARCH=true

# UI Configuration
VITE_DEFAULT_THEME=cosmic
VITE_DEFAULT_LANGUAGE=en
VITE_ENABLE_ANIMATIONS=true

# Storage Configuration
VITE_MAX_FILE_SIZE=10485760
VITE_CACHE_SIZE=104857600

# Development Settings
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=info
```

### Optional Environment Variables

```bash
# Ollama Configuration (for offline mode)
VITE_OLLAMA_BASE_URL=http://localhost:11434
VITE_OLLAMA_DEFAULT_MODEL=llama2

# Electron Settings
VITE_ELECTRON_APP_ID=com.anshika.app
VITE_ELECTRON_APP_NAME=A.N.S.H.I.K.A.

# Analytics (if enabled)
VITE_ANALYTICS_ID=your_analytics_id
VITE_CRASH_REPORTING_ENABLED=true

# Performance Settings
VITE_MAX_CONCURRENT_REQUESTS=5
VITE_REQUEST_TIMEOUT=30000
VITE_CACHE_TTL=3600000
```

## API Key Management

### Secure API Key Storage

The application uses IndexedDB (via Dexie) for secure client-side storage of API keys:

```typescript
// src/services/ApiKeyService.ts
export class ApiKeyService {
  private db: Dexie;

  constructor() {
    this.db = new Dexie('AnshikaDB');
    this.db.version(1).stores({
      apiKeys: 'key, value, encrypted'
    });
  }

  async setApiKey(key: string, value: string): Promise<void> {
    const encrypted = await this.encrypt(value);
    await this.db.apiKeys.put({
      key,
      value: encrypted,
      encrypted: true
    });
  }

  async getApiKey(key: string): Promise<string | null> {
    const record = await this.db.apiKeys.get(key);
    if (!record) return null;

    return record.encrypted
      ? await this.decrypt(record.value)
      : record.value;
  }

  private async encrypt(value: string): Promise<string> {
    // AES-GCM encryption implementation
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(value);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    return JSON.stringify({
      key: await crypto.subtle.exportKey('jwk', key),
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted))
    });
  }

  private async decrypt(encryptedData: string): Promise<string> {
    const { key: keyData, iv, data } = JSON.parse(encryptedData);

    const key = await crypto.subtle.importKey(
      'jwk',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      new Uint8Array(data)
    );

    return new TextDecoder().decode(decrypted);
  }
}
```

### API Key Validation

```typescript
// src/utils/apiKeyValidation.ts
export const validateApiKey = (key: string, provider: string): boolean => {
  const patterns = {
    gemini: /^AIza[0-9A-Za-z-_]{35}$/,
    openai: /^sk-[a-zA-Z0-9]{48}$/,
    anthropic: /^sk-ant-[a-zA-Z0-9-_]{95,}$/,
    weather: /^[a-f0-9]{32}$/,
    search: /^[a-zA-Z0-9]{32}$/
  };

  const pattern = patterns[provider as keyof typeof patterns];
  return pattern ? pattern.test(key) : true;
};
```

## Personality Configuration

### AI Personality System (`src/config/personalityConfig.ts`)

```typescript
export interface Personality {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  features: string[];
  avatar?: string;
  color?: string;
}

export const personalities: Personality[] = [
  {
    id: 'default',
    name: 'A.N.S.H.I.K.A.',
    description: 'Advanced Neural System with Human-like Intelligence and Knowledge Assistant',
    systemPrompt: `You are A.N.S.H.I.K.A., an advanced AI assistant with human-like intelligence and comprehensive knowledge.

Core Capabilities:
- Natural conversation and contextual understanding
- Multi-modal processing (text, documents, images)
- Task management and organization
- Real-time information access via web search
- Creative content generation
- Document analysis and summarization
- Voice interaction capabilities

Personality Traits:
- Helpful and maximally truthful
- Creative and innovative
- Adaptable to user preferences
- Maintains context across conversations
- Provides detailed, actionable responses
- Uses appropriate humor when suitable

Guidelines:
- Always prioritize user safety and privacy
- Be transparent about capabilities and limitations
- Provide comprehensive solutions with explanations
- Use markdown formatting for better readability
- Ask clarifying questions when needed
- Maintain professional yet friendly tone`,
    temperature: 0.7,
    maxTokens: 4096,
    features: ['chat', 'documents', 'images', 'tasks', 'voice', 'web-search'],
    color: '#6366f1'
  },
  {
    id: 'creative',
    name: 'Creative Assistant',
    description: 'Focused on creative writing, art, and innovative solutions',
    systemPrompt: `You are a creative AI assistant specializing in artistic expression and innovative problem-solving.

Focus Areas:
- Creative writing and storytelling
- Visual art concepts and descriptions
- Innovative solution design
- Artistic collaboration
- Imaginative problem-solving

Style:
- Encourages creative thinking
- Provides vivid, descriptive language
- Suggests multiple creative approaches
- Maintains artistic inspiration`,
    temperature: 0.9,
    maxTokens: 2048,
    features: ['chat', 'images', 'documents'],
    color: '#ec4899'
  },
  {
    id: 'technical',
    name: 'Technical Expert',
    description: 'Specialized in technical analysis and programming assistance',
    systemPrompt: `You are a technical AI assistant with deep expertise in software development and system architecture.

Expertise Areas:
- Programming languages and frameworks
- System design and architecture
- Code review and optimization
- Technical documentation
- Debugging and troubleshooting
- Best practices and patterns

Approach:
- Provides accurate technical information
- Explains complex concepts clearly
- Suggests optimal solutions
- Includes code examples when relevant
- Maintains technical precision`,
    temperature: 0.3,
    maxTokens: 8192,
    features: ['chat', 'documents', 'code-analysis'],
    color: '#10b981'
  }
];
```

## Feature Flags and Toggles

### Runtime Feature Management

```typescript
// src/config/featureFlags.ts
export const featureFlags = {
  // Core features
  chat: {
    enabled: true,
    requiresAuth: false,
    premiumOnly: false
  },
  documents: {
    enabled: true,
    requiresAuth: false,
    premiumOnly: false,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['.pdf', '.docx', '.txt']
  },
  images: {
    enabled: true,
    requiresAuth: false,
    premiumOnly: false,
    maxConcurrent: 3,
    quality: 'high'
  },
  tasks: {
    enabled: true,
    requiresAuth: false,
    premiumOnly: false,
    maxTasks: 1000
  },
  voice: {
    enabled: 'auto', // 'auto', 'enabled', 'disabled'
    requiresAuth: false,
    premiumOnly: false
  },

  // Advanced features
  webSearch: {
    enabled: true,
    requiresAuth: true,
    premiumOnly: true,
    maxQueriesPerDay: 100
  },
  documentAnalysis: {
    enabled: true,
    requiresAuth: false,
    premiumOnly: false,
    maxPages: 50
  },
  imageGeneration: {
    enabled: true,
    requiresAuth: false,
    premiumOnly: false,
    maxGenerationsPerDay: 50
  },

  // Experimental features
  multiModalChat: {
    enabled: false,
    requiresAuth: true,
    premiumOnly: true
  },
  realTimeCollaboration: {
    enabled: false,
    requiresAuth: true,
    premiumOnly: true
  }
};

// Feature flag utilities
export const isFeatureEnabled = (feature: keyof typeof featureFlags): boolean => {
  const flag = featureFlags[feature];
  if (!flag.enabled) return false;
  if (flag.premiumOnly && !isPremiumUser()) return false;
  if (flag.requiresAuth && !isAuthenticated()) return false;
  return true;
};

export const getFeatureConfig = (feature: keyof typeof featureFlags) => {
  return featureFlags[feature];
};
```

## Theme Configuration

### Cosmic Theme System

```typescript
// src/config/themes.ts
export const themes = {
  cosmic: {
    name: 'Cosmic',
    colors: {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      accent: '#ec4899',
      background: {
        primary: '#0f0f23',
        secondary: '#1a1a2e',
        tertiary: '#16213e'
      },
      text: {
        primary: '#ffffff',
        secondary: '#b8c5d6',
        muted: '#6b7280'
      },
      border: '#2a2a4e',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    },
    gradients: {
      primary: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      secondary: 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)',
      background: 'linear-gradient(180deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)'
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      cosmic: '0 0 20px rgba(99, 102, 241, 0.3)'
    }
  }
};
```

## User Preferences

### Persistent User Settings

```typescript
// src/config/userPreferences.ts
export interface UserPreferences {
  theme: 'light' | 'dark' | 'cosmic';
  language: string;
  notifications: {
    sound: boolean;
    desktop: boolean;
    email: boolean;
  };
  privacy: {
    analytics: boolean;
    crashReports: boolean;
    dataCollection: boolean;
  };
  accessibility: {
    highContrast: boolean;
    reducedMotion: boolean;
    fontSize: 'small' | 'medium' | 'large';
    screenReader: boolean;
  };
  chat: {
    autoSave: boolean;
    messageHistory: number; // days to keep
    defaultMode: 'online' | 'offline';
    temperature: number;
  };
  voice: {
    autoSpeak: boolean;
    voice: string;
    rate: number;
    pitch: number;
    volume: number;
  };
}

export const defaultPreferences: UserPreferences = {
  theme: 'cosmic',
  language: 'en',
  notifications: {
    sound: true,
    desktop: true,
    email: false
  },
  privacy: {
    analytics: false,
    crashReports: true,
    dataCollection: false
  },
  accessibility: {
    highContrast: false,
    reducedMotion: false,
    fontSize: 'medium',
    screenReader: false
  },
  chat: {
    autoSave: true,
    messageHistory: 30,
    defaultMode: 'online',
    temperature: 0.7
  },
  voice: {
    autoSpeak: false,
    voice: 'default',
    rate: 1.0,
    pitch: 1.0,
    volume: 0.8
  }
};
```

## Build Configuration

### Vite Configuration (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@services': resolve(__dirname, './src/services'),
      '@types': resolve(__dirname, './src/types'),
      '@utils': resolve(__dirname, './src/utils'),
      '@config': resolve(__dirname, './src/config')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react', 'tailwindcss'],
          ai: ['@google/generative-ai', 'ollama'],
          utils: ['date-fns', 'lodash-es']
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
});
```

### Electron Configuration

```typescript
// electron/main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    titleBarStyle: 'hiddenInset',
    vibrancy: 'dark'
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);
```

## Development Configuration

### ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended'
  ],
  ignorePatterns: ['dist', '.eslintrc.js'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true }
    ],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'react/prop-types': 'off'
  }
};
```

### TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@services/*": ["./src/services/*"],
      "@types/*": ["./src/types/*"],
      "@utils/*": ["./src/utils/*"],
      "@config/*": ["./src/config/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## Testing Configuration

### Vitest Configuration (`vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts'
      ]
    }
  }
});
```

## Deployment Configuration

### Environment-Specific Configs

```typescript
// src/config/environments.ts
export const environments = {
  development: {
    apiUrl: 'http://localhost:3001',
    debug: true,
    logLevel: 'debug',
    features: {
      analytics: false,
      crashReporting: false
    }
  },
  staging: {
    apiUrl: 'https://staging-api.anshika.ai',
    debug: true,
    logLevel: 'info',
    features: {
      analytics: false,
      crashReporting: true
    }
  },
  production: {
    apiUrl: 'https://api.anshika.ai',
    debug: false,
    logLevel: 'warn',
    features: {
      analytics: true,
      crashReporting: true
    }
  }
};

export const getCurrentEnvironment = () => {
  const env = process.env.VITE_ENVIRONMENT || 'development';
  return environments[env as keyof typeof environments];
};
```

---

*Last updated: October 30, 2025*</content>
<parameter name="filePath">c:\Users\Aarnav\Desktop\Anshika\docs\configuration.md