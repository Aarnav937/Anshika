# Deployment Documentation

## Overview

A.N.S.H.I.K.A. supports multiple deployment targets including web browsers, Electron desktop applications, and containerized environments. This document covers build processes, packaging, distribution, and deployment strategies.

## Build Process

### Development Build

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Development server runs on http://localhost:5173
```

### Production Build

```bash
# Create optimized production build
npm run build

# Build artifacts are generated in the 'dist' directory
```

### Build Configuration

The build process uses Vite with the following optimizations:

- **Code Splitting**: Automatic chunk splitting for vendor libraries
- **Tree Shaking**: Removal of unused code
- **Minification**: Terser minification for JavaScript
- **Asset Optimization**: Image compression and font subsetting
- **CSS Optimization**: PostCSS processing with Tailwind CSS purging

```typescript
// vite.config.ts build configuration
export default defineConfig({
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
  }
});
```

## Web Deployment

### Static Hosting

Deploy the `dist` directory to any static hosting service:

#### Netlify

```yaml
# netlify.toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Vercel

```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

#### GitHub Pages

```bash
# Install gh-pages
npm install --save-dev gh-pages

# Add to package.json scripts
"scripts": {
  "deploy": "gh-pages -d dist"
}

# Deploy
npm run build
npm run deploy
```

### CDN Deployment

For global distribution with CDN caching:

```bash
# Build with asset hashing
npm run build

# Upload dist/ to CDN (Cloudflare, AWS CloudFront, etc.)
# Configure CDN to serve index.html for all routes
```

## Electron Desktop Application

### Electron Build Process

```bash
# Install Electron dependencies
npm install --save-dev electron electron-builder

# Build for current platform
npm run electron:build

# Build for all platforms
npm run electron:build:all
```

### Electron Configuration

```json
// package.json electron configuration
{
  "main": "electron/main.js",
  "scripts": {
    "electron": "electron .",
    "electron:build": "electron-builder",
    "electron:build:all": "electron-builder --publish=never -mwl"
  },
  "build": {
    "appId": "com.anshika.app",
    "productName": "A.N.S.H.I.K.A.",
    "directories": {
      "output": "electron-dist"
    },
    "files": [
      "dist/**/*",
      "electron/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "mac": {
      "category": "public.app-category.productivity",
      "target": [
        {
          "target": "dmg",
          "arch": ["x64", "arm64"]
        }
      ]
    },
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    },
    "linux": {
      "target": "AppImage",
      "category": "Utility"
    }
  }
}
```

### Electron Main Process

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

### Electron Preload Script

```typescript
// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  getPlatform: () => process.platform,
  getVersion: () => ipcRenderer.invoke('get-version')
});
```

## Container Deployment

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf
events {
  worker_connections 1024;
}

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;

  server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
      try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
      expires 1y;
      add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
  }
}
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  anshika:
    build: .
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    volumes:
      - ./config:/app/config:ro
    restart: unless-stopped

  # Optional: Reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/sites-enabled:/etc/nginx/sites-enabled:ro
    depends_on:
      - anshika
    restart: unless-stopped
```

## Cloud Deployment

### AWS Deployment

#### AWS Amplify

```yaml
# amplify.yml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

#### AWS S3 + CloudFront

```bash
# Build and deploy to S3
npm run build
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

### Azure Deployment

#### Azure Static Web Apps

```yaml
# .github/workflows/azure-static-web-apps.yml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches:
      - main
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main

jobs:
  build_and_deploy_job:
    runs-on: ubuntu-latest
    name: Build and Deploy Job
    steps:
      - uses: actions/checkout@v3
      - name: Build And Deploy
        id: builddeploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/"
          api_location: ""
          output_location: "dist"
```

#### Azure App Service

```json
// .deployment
{
  "app_name": "anshika",
  "app_service_name": "anshika-app",
  "resource_group": "anshika-rg",
  "package_path": "dist",
  "slot_name": "production"
}
```

### Google Cloud Platform

#### Firebase Hosting

```json
// firebase.json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

```bash
# Deploy to Firebase
npm run build
firebase deploy --only hosting
```

## CI/CD Pipelines

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run test
      - run: npm run build

  deploy-web:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v1.2
        with:
          publish-dir: './dist'
          production-branch: main
          github-token: ${{ secrets.GITHUB_TOKEN }}
          deploy-message: "Deploy from GitHub Actions"
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}

  deploy-electron:
    needs: test
    runs-on: ${{ matrix.os }}
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    strategy:
      matrix:
        os: [macos-latest, ubuntu-latest, windows-latest]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - name: Build Electron App
        run: npm run electron:build
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - name: Upload Release Assets
        uses: actions/upload-artifact@v3
        with:
          name: electron-app-${{ matrix.os }}
          path: electron-dist/
```

## Environment Configuration

### Environment Variables

```bash
# Production environment variables
NODE_ENV=production
VITE_API_BASE_URL=https://api.anshika.ai
VITE_ENVIRONMENT=production
VITE_VERSION=1.0.0

# API Keys (set via deployment platform secrets)
VITE_GEMINI_API_KEY=${GEMINI_API_KEY}
VITE_WEATHER_API_KEY=${WEATHER_API_KEY}
VITE_SEARCH_API_KEY=${SEARCH_API_KEY}

# Feature flags
VITE_ENABLE_VOICE=true
VITE_ENABLE_DOCUMENTS=true
VITE_ENABLE_IMAGES=true
VITE_ENABLE_TASKS=true
VITE_ENABLE_WEB_SEARCH=true

# Analytics (optional)
VITE_ANALYTICS_ID=${ANALYTICS_ID}
VITE_SENTRY_DSN=${SENTRY_DSN}
```

### Runtime Configuration

```typescript
// src/config/runtime.ts
export const getRuntimeConfig = () => {
  return {
    version: import.meta.env.VITE_VERSION || '1.0.0',
    environment: import.meta.env.VITE_ENVIRONMENT || 'development',
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
    features: {
      voice: import.meta.env.VITE_ENABLE_VOICE === 'true',
      documents: import.meta.env.VITE_ENABLE_DOCUMENTS === 'true',
      images: import.meta.env.VITE_ENABLE_IMAGES === 'true',
      tasks: import.meta.env.VITE_ENABLE_TASKS === 'true',
      webSearch: import.meta.env.VITE_ENABLE_WEB_SEARCH === 'true'
    },
    analytics: {
      enabled: !!import.meta.env.VITE_ANALYTICS_ID,
      id: import.meta.env.VITE_ANALYTICS_ID
    },
    errorReporting: {
      enabled: !!import.meta.env.VITE_SENTRY_DSN,
      dsn: import.meta.env.VITE_SENTRY_DSN
    }
  };
};
```

## Performance Optimization

### Build Optimizations

```typescript
// vite.config.ts optimizations
export default defineConfig({
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['lucide-react', 'framer-motion'],
          'ai-vendor': ['@google/generative-ai'],
          'utils-vendor': ['date-fns', 'lodash-es']
        }
      }
    }
  }
});
```

### CDN and Caching

```nginx
# nginx.conf caching configuration
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
  add_header X-Frame-Options "SAMEORIGIN";
  add_header X-Content-Type-Options "nosniff";
}

location ~* \.(html)$ {
  expires 1h;
  add_header Cache-Control "public, must-revalidate, proxy-revalidate";
}
```

## Monitoring and Analytics

### Error Tracking

```typescript
// src/utils/errorTracking.ts
import * as Sentry from '@sentry/react';

export const initErrorTracking = () => {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.VITE_ENVIRONMENT,
      integrations: [
        new Sentry.BrowserTracing(),
        new Sentry.Replay()
      ],
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0
    });
  }
};
```

### Performance Monitoring

```typescript
// src/utils/performance.ts
export const initPerformanceMonitoring = () => {
  if ('PerformanceObserver' in window) {
    // Monitor Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure') {
          console.log(`${entry.name}: ${entry.duration}ms`);
          // Send to analytics service
        }
      }
    });

    observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
  }
};
```

## Security Considerations

### Content Security Policy

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://api.anshika.ai https://generativelanguage.googleapis.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
">
```

### HTTPS Enforcement

```nginx
# nginx.conf SSL configuration
server {
  listen 443 ssl http2;
  server_name anshika.ai;

  ssl_certificate /etc/nginx/ssl/cert.pem;
  ssl_certificate_key /etc/nginx/ssl/key.pem;

  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
  ssl_prefer_server_ciphers off;

  # HSTS
  add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

  location / {
    try_files $uri $uri/ /index.html;
  }
}

# Redirect HTTP to HTTPS
server {
  listen 80;
  server_name anshika.ai;
  return 301 https://$server_name$request_uri;
}
```

---

*Last updated: October 30, 2025*</content>
<parameter name="filePath">c:\Users\Aarnav\Desktop\Anshika\docs\deployment.md