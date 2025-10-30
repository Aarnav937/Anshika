# Build and Development Setup

This document provides comprehensive documentation for the build system, development tooling, package management, and deployment configuration for the Anshika Chatbot AI Assistant project.

## Build System Overview

The project uses a modern build pipeline with Vite as the primary build tool, supporting both web and desktop (Electron) deployment targets.

## Vite Build Configuration

### Main Build Config (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react', 'tailwindcss']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react']
  }
})
```

**Key Features:**
- **React Plugin**: Enables Fast Refresh for hot module replacement during development
- **Development Server**: Runs on port 5173 with network access enabled
- **Production Build**: Outputs to `dist/` directory with source maps
- **Code Splitting**: Separates vendor libraries (React) and UI libraries (Lucide icons, Tailwind)
- **Path Aliases**: `@/` resolves to `./src/` for cleaner imports
- **Dependency Optimization**: Pre-bundles React and commonly used libraries

### Build Commands

```bash
# Development
npm run dev          # Start development server with hot reload
npm run preview      # Preview production build locally

# Production
npm run build        # Create optimized production build

# Electron (Desktop App)
npm run build:electron   # Build Electron app
npm run dist            # Create distributables for all platforms
npm run dist:win        # Windows executable
npm run dist:mac        # macOS app
npm run dist:linux      # Linux executable
```

## TypeScript Configuration

### Application TypeScript Config (`tsconfig.json`)

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
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Configuration Details:**
- **Target**: ES2020 for modern browser support
- **Libraries**: Includes DOM APIs and ES2020 features
- **Module System**: ESNext modules with bundler resolution
- **JSX**: React JSX transform (no `React.` imports needed)
- **Strict Mode**: All TypeScript strict checks enabled
- **Code Quality**: Warns about unused variables and parameters

### Build Tool TypeScript Config (`tsconfig.node.json`)

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

**Purpose:** Separate configuration for Node.js build tools (Vite config).

## Testing Framework

### Vitest Configuration (`vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist/'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

**Testing Features:**
- **JSDOM Environment**: Browser environment simulation for React components
- **Global Test Functions**: `describe`, `it`, `expect` available without imports
- **Coverage Reports**: V8-based coverage in multiple formats (text, JSON, HTML)
- **Path Aliases**: Same as main build configuration
- **Setup Files**: Test environment initialization

### Test Commands

```bash
npm run test         # Run all tests once
npm run test:watch   # Run tests in watch mode
npm run test:ui      # Run tests with web UI
npm run coverage     # Generate coverage report
```

## Styling and CSS Processing

### Tailwind CSS Configuration (`tailwind.config.js`)

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '475px',
      },
      colors: {
        // Theme-aware colors using CSS variables
        'theme-primary': 'var(--theme-primary)',
        'theme-secondary': 'var(--theme-secondary)',
        'theme-accent': 'var(--theme-accent)',
        'theme-bg-base': 'var(--theme-bg-base)',
        'theme-bg-elevated': 'var(--theme-bg-elevated)',
        'theme-bg-overlay': 'var(--theme-bg-overlay)',
        'theme-text-primary': 'var(--theme-text-primary)',
        'theme-text-secondary': 'var(--theme-text-secondary)',
        'theme-text-tertiary': 'var(--theme-text-tertiary)',
        'theme-border': 'var(--theme-border)',
        'theme-gradient-start': 'var(--theme-gradient-start)',
        'theme-gradient-end': 'var(--theme-gradient-end)',
      },
      transitionProperty: {
        'theme': 'background-color, border-color, color, fill, stroke, opacity',
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
}
```

**Key Features:**
- **Class-based Dark Mode**: Toggle with `class` strategy
- **Content Scanning**: All source files for Tailwind class detection
- **Custom Breakpoint**: `xs` at 475px for extra small screens
- **CSS Variable Colors**: Dynamic theming system
- **Custom Animations**: Subtle pulse effect for loading states

### PostCSS Configuration (`postcss.config.js`)

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**Purpose:** Processes Tailwind CSS directives and adds vendor prefixes.

### Stylelint Configuration (`.stylelintrc.json`)

```json
{
  "extends": [
    "stylelint-config-standard",
    "stylelint-config-recommended"
  ],
  "rules": {
    "at-rule-no-unknown": [ true, {
      "ignoreAtRules": [
        "tailwind",
        "apply",
        "variants",
        "responsive",
        "screen",
        "layer",
        "config"
      ]
    }],
    "property-no-unknown": [ true, {
      "ignoreProperties": ["composes"]
    }]
  }
}
```

**Purpose:** Lints CSS with Tailwind-specific rules allowed.

## Code Quality and Linting

### ESLint Configuration (`.eslintrc.cjs`)

```javascript
module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error'
  }
};
```

**Linting Rules:**
- **React Hooks**: Enforces rules of hooks
- **React Fast Refresh**: Warns about incompatible patterns
- **Console Usage**: Allows `console.warn` and `console.error`
- **Variable Declaration**: Enforces modern JavaScript practices

### Linting Commands

```bash
npm run lint     # Run ESLint
npm run lint:fix # Auto-fix ESLint issues
```

## Package Management

### Package Scripts (`package.json`)

**Development Scripts:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "coverage": "vitest --coverage",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "typecheck": "tsc --noEmit"
  }
}
```

**Build Scripts:**
```json
{
  "scripts": {
    "build:electron": "tsc && vite build && electron-builder",
    "dist": "npm run build:electron",
    "dist:win": "npm run build:electron -- --win",
    "dist:mac": "npm run build:electron -- --mac",
    "dist:linux": "npm run build:electron -- --linux",
    "clean": "rimraf dist release",
    "serve": "npm run build && npx serve dist"
  }
}
```

### Core Dependencies

**Framework & Build Tools:**
- `react`: ^18.2.0 - UI framework
- `react-dom`: ^18.2.0 - React DOM renderer
- `vite`: ^5.2.0 - Build tool and dev server
- `@vitejs/plugin-react`: ^4.2.1 - React integration for Vite
- `typescript`: ^5.2.2 - TypeScript compiler

**UI & Styling:**
- `tailwindcss`: ^3.4.4 - Utility-first CSS framework
- `postcss`: ^8.4.38 - CSS processor
- `autoprefixer`: ^10.4.19 - CSS vendor prefixing
- `lucide-react`: ^0.344.0 - Icon library

**State Management & Routing:**
- `zustand`: ^4.5.0 - Lightweight state management
- `react-router-dom`: ^6.22.3 - Client-side routing

**AI & External APIs:**
- `@google/generative-ai`: ^0.7.1 - Google Gemini AI SDK
- `openai`: ^4.38.5 - OpenAI API client
- `axios`: ^1.6.8 - HTTP client for API requests

**Utilities:**
- `date-fns`: ^3.3.1 - Date manipulation library
- `clsx`: ^2.1.0 - Conditional CSS classes
- `tailwind-merge`: ^2.2.1 - Tailwind class merging
- `react-markdown`: ^9.0.1 - Markdown rendering
- `remark-gfm`: ^4.0.0 - GitHub Flavored Markdown

**Desktop App (Electron):**
- `electron`: ^30.0.1 - Desktop application framework
- `electron-builder`: ^24.13.3 - Electron build and packaging tool

### Development Dependencies

**TypeScript:**
- `@types/react`: ^18.2.66 - React type definitions
- `@types/react-dom`: ^18.2.22 - React DOM type definitions
- `@types/node`: ^20.11.24 - Node.js type definitions

**Testing:**
- `vitest`: ^1.3.1 - Test framework
- `@testing-library/react`: ^14.2.1 - React testing utilities
- `@testing-library/jest-dom`: ^6.4.2 - Jest DOM matchers for React
- `@vitest/coverage-v8`: ^1.3.1 - Coverage reporting
- `@vitest/ui`: ^1.3.1 - Test UI interface
- `jsdom`: ^24.0.0 - DOM implementation for testing

**Code Quality:**
- `eslint`: ^8.57.0 - JavaScript/TypeScript linter
- `@typescript-eslint/parser`: ^7.2.0 - TypeScript parser for ESLint
- `@typescript-eslint/eslint-plugin`: ^7.2.0 - TypeScript ESLint rules
- `eslint-plugin-react-hooks`: ^4.6.0 - React hooks linting
- `eslint-plugin-react-refresh`: ^0.4.6 - React Fast Refresh linting
- `stylelint`: ^16.3.1 - CSS linter
- `stylelint-config-standard`: ^36.0.0 - Standard Stylelint config
- `stylelint-config-recommended`: ^14.0.0 - Recommended Stylelint config

**Development Tools:**
- `concurrently`: ^8.2.2 - Run multiple commands simultaneously
- `cross-env`: ^7.0.3 - Cross-platform environment variables
- `rimraf`: ^5.0.5 - Cross-platform rm -rf utility

## Environment Configuration

### Environment Variables (`.env`)

Create a `.env` file in the project root with the following variables:

```bash
# AI Services
VITE_GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# Weather API
VITE_WEATHERAPI_KEY=your_weather_api_key_here

# Google Search API
VITE_GOOGLE_SEARCH_API_KEY=your_google_search_api_key_here
VITE_GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here

# Application Settings
SKYNET_ENVIRONMENT=development
LOG_LEVEL=INFO
DEBUG=true

# Security
MASTER_PASSWORD=your_secure_password_here

# Performance
CACHE_TTL=3600
MAX_CONCURRENT_REQUESTS=10

# Feature Toggles
ENABLE_AUDIO=true
ENABLE_DISPLAY_CONTROL=true
ENABLE_POWER_MANAGEMENT=true
ENABLE_SMART_AUTOMATION=true
ENABLE_WEB_SCRAPING=true
```

**Important Security Notes:**
- Never commit `.env` files to version control
- Use different API keys for development and production
- Regularly rotate API keys
- Monitor API usage to avoid unexpected charges

## Git Configuration

### Git Ignore (`.gitignore`)

```gitignore
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# API Keys and sensitive data
*.key
*.pem
config/keys.json

# Release/Build files
release/
*.exe
*.dll
*.asar

# Test files
test-gemini-api.js
```

## Development Workflow

### Getting Started

1. **Clone the repository**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Set up environment variables:**
   - Copy `.env.example` to `.env`
   - Add your API keys
4. **Start development server:**
   ```bash
   npm run dev
   ```
5. **Run tests:**
   ```bash
   npm run test
   ```

### Development Commands

```bash
# Code Quality
npm run lint         # Check code quality
npm run lint:fix     # Fix linting issues
npm run typecheck    # TypeScript type checking

# Testing
npm run test         # Run tests
npm run test:watch   # Watch mode testing
npm run coverage     # Coverage report

# Building
npm run build        # Production build
npm run preview      # Preview build

# Desktop App
npm run build:electron  # Build Electron app
npm run dist           # Create distributables
```

### Code Quality Checks

The project includes several automated code quality checks:

- **ESLint**: JavaScript/TypeScript linting
- **Stylelint**: CSS linting
- **TypeScript**: Type checking
- **Vitest**: Unit testing with coverage
- **Prettier**: Code formatting (via ESLint)

### Build Process

1. **TypeScript Compilation**: Type checking and transpilation
2. **Asset Processing**: Images, fonts, and static files
3. **CSS Processing**: PostCSS with Tailwind CSS and Autoprefixer
4. **Code Splitting**: Separate chunks for vendor libraries
5. **Minification**: JavaScript and CSS optimization
6. **Source Maps**: Generated for debugging

## Deployment

### Web Deployment

```bash
# Build for production
npm run build

# The dist/ folder contains the production build
# Deploy the contents of dist/ to your web server
```

### Desktop Deployment

```bash
# Build for all platforms
npm run dist

# Build for specific platform
npm run dist:win    # Windows
npm run dist:mac    # macOS
npm run dist:linux  # Linux
```

### Electron Builder Configuration

The desktop app uses Electron Builder for packaging. Configuration is in `package.json`:

```json
{
  "build": {
    "appId": "com.anshika.app",
    "productName": "Anshika",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "mac": {
      "category": "public.app-category.productivity"
    },
    "win": {
      "target": "nsis"
    },
    "linux": {
      "target": "AppImage"
    }
  }
}
```

## Troubleshooting

### Common Build Issues

**Build Errors:**
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`
- Check TypeScript: `npm run typecheck`

**Test Failures:**
- Update snapshots: `npm run test -- -u`
- Check test environment: Verify `jsdom` is installed
- Clear test cache: `rm -rf node_modules/.vitest`

**Linting Issues:**
- Auto-fix: `npm run lint:fix`
- Check specific file: `npx eslint src/components/Example.tsx`

**Environment Issues:**
- Verify `.env` file exists and is properly formatted
- Check API keys are valid and have proper permissions
- Restart development server after environment changes

### Performance Optimization

- **Bundle Analysis**: Use `npm run build` and check bundle sizes
- **Code Splitting**: Large components are automatically split
- **Image Optimization**: Use WebP format for images
- **Caching**: Enable browser caching for static assets
- **Compression**: Enable gzip compression on the server

### Development Tips

- Use `npm run dev` for development with hot reload
- Run tests in watch mode: `npm run test:watch`
- Use VS Code extensions for better development experience:
  - TypeScript and JavaScript Language Features
  - ESLint
  - Tailwind CSS IntelliSense
  - React Extension Pack

---

*This document covers the build system, development tooling, and deployment configuration. For application-level configuration (API keys, themes, personalities), see `docs/configuration.md`.*