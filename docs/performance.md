# Performance Documentation

## Overview

A.N.S.H.I.K.A. is designed for optimal performance across various devices and network conditions. This document covers performance optimization strategies, monitoring, and best practices implemented in the application.

## Performance Architecture

### Core Performance Principles

1. **Lazy Loading**: Components and routes loaded on-demand
2. **Code Splitting**: Automatic chunk splitting for optimal bundle sizes
3. **Caching**: Multi-layer caching strategy (memory, IndexedDB, HTTP)
4. **Virtualization**: Efficient rendering of large lists and content
5. **Progressive Enhancement**: Core functionality works without JavaScript

### Bundle Optimization

```typescript
// vite.config.ts - Bundle optimization
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom'],

          // UI libraries
          'ui-vendor': ['lucide-react', 'framer-motion', 'tailwindcss'],

          // AI services
          'ai-vendor': ['@google/generative-ai'],

          // Utilities
          'utils-vendor': ['date-fns', 'lodash-es', 'crypto-js'],

          // Document processing
          'document-vendor': ['pdfjs-dist', 'mammoth'],

          // Storage
          'storage-vendor': ['dexie', 'idb']
        }
      }
    },

    // Compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    },

    // Source maps for production debugging
    sourcemap: true,

    // Chunk size warnings
    chunkSizeWarningLimit: 1000
  }
});
```

## Loading Strategies

### Lazy Loading Implementation

```typescript
// src/App.tsx - Route-based lazy loading
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load major features
const ChatInterface = lazy(() => import('./components/ChatInterface'));
const DocumentWorkspace = lazy(() => import('./components/DocumentWorkspace'));
const ImageGenerationPanel = lazy(() => import('./components/ImageGenerationPanel'));
const TaskManager = lazy(() => import('./components/TaskManager'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<ChatInterface />} />
        <Route path="/documents" element={<DocumentWorkspace />} />
        <Route path="/images" element={<ImageGenerationPanel />} />
        <Route path="/tasks" element={<TaskManager />} />
      </Routes>
    </Suspense>
  );
}
```

### Component-Level Lazy Loading

```typescript
// src/components/LazyWrapper.tsx
import React, { lazy, ComponentType, LazyExoticComponent } from 'react';
import LoadingSkeleton from './LoadingSkeleton';

interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  delay?: number;
}

export const LazyWrapper: React.FC<LazyWrapperProps> = ({
  children,
  fallback = <LoadingSkeleton />,
  delay = 100
}) => {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return showContent ? <>{children}</> : fallback;
};

// Usage
export const LazyChatInterface = lazy(() => import('./ChatInterface'));

// In parent component
<Suspense fallback={<LoadingSkeleton />}>
  <LazyWrapper delay={200}>
    <LazyChatInterface />
  </LazyWrapper>
</Suspense>
```

### Image Lazy Loading

```typescript
// src/components/LazyImage.tsx
import React, { useState, useRef, useEffect } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  placeholder,
  onLoad,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div className={`relative ${className}`} ref={imgRef}>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          {placeholder || <div className="text-gray-400">Loading...</div>}
        </div>
      )}

      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {hasError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-gray-500 text-sm">Failed to load image</div>
        </div>
      )}
    </div>
  );
};
```

## Caching Strategies

### Multi-Layer Caching

```typescript
// src/services/CacheService.ts
export class CacheService {
  private memoryCache = new Map<string, CacheEntry>();
  private readonly MAX_MEMORY_ITEMS = 100;
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private db: Dexie) {}

  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      return memoryEntry.data as T;
    }

    // Check IndexedDB cache
    try {
      const dbEntry = await this.db.cache.get(key);
      if (dbEntry && !this.isExpired(dbEntry)) {
        // Update memory cache
        this.memoryCache.set(key, dbEntry);
        return dbEntry.data as T;
      }
    } catch (error) {
      console.warn('Cache read error:', error);
    }

    return null;
  }

  async set<T>(key: string, data: T, ttl = this.DEFAULT_TTL): Promise<void> {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl
    };

    // Update memory cache
    this.memoryCache.set(key, entry);

    // Limit memory cache size
    if (this.memoryCache.size > this.MAX_MEMORY_ITEMS) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }

    // Update IndexedDB cache
    try {
      await this.db.cache.put({ key, ...entry });
    } catch (error) {
      console.warn('Cache write error:', error);
    }
  }

  async invalidate(pattern?: string): Promise<void> {
    if (pattern) {
      // Invalidate by pattern
      const keys = Array.from(this.memoryCache.keys()).filter(key =>
        key.includes(pattern)
      );
      keys.forEach(key => this.memoryCache.delete(key));

      // Also clear from IndexedDB
      const dbKeys = await this.db.cache.where('key').startsWith(pattern).keys();
      await this.db.cache.bulkDelete(dbKeys);
    } else {
      // Clear all caches
      this.memoryCache.clear();
      await this.db.cache.clear();
    }
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}
```

### HTTP Caching

```typescript
// src/services/HttpCache.ts
export class HttpCache {
  private cache = new Map<string, HttpCacheEntry>();

  async fetchWithCache(url: string, options: RequestInit = {}): Promise<Response> {
    const cacheKey = this.generateCacheKey(url, options);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && !this.isExpired(cached)) {
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers: cached.headers
      });
    }

    // Make request
    const response = await fetch(url, {
      ...options,
      headers: {
        'Cache-Control': 'max-age=300', // 5 minutes
        ...options.headers
      }
    });

    // Cache successful responses
    if (response.ok && response.status !== 304) {
      const body = await response.clone().text();
      this.cache.set(cacheKey, {
        body,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        timestamp: Date.now(),
        ttl: 5 * 60 * 1000 // 5 minutes
      });
    }

    return response;
  }

  private generateCacheKey(url: string, options: RequestInit): string {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  private isExpired(entry: HttpCacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  clear(): void {
    this.cache.clear();
  }
}

interface HttpCacheEntry {
  body: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  timestamp: number;
  ttl: number;
}
```

## Virtualization

### Virtualized Lists

```typescript
// src/components/VirtualizedList.tsx
import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  renderItem,
  className
}: VirtualizedListProps<T>) {
  const itemData = useMemo(() => ({ items, renderItem }), [items, renderItem]);

  return (
    <div className={className} style={{ height: '100%' }}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            itemCount={items.length}
            itemSize={itemHeight}
            itemData={itemData}
            width={width}
          >
            {({ index, style, data }) => (
              <div style={style}>
                {data.renderItem(data.items[index], index)}
              </div>
            )}
          </List>
        )}
      </AutoSizer>
    </div>
  );
}
```

### Virtualized Chat Messages

```typescript
// src/components/ChatMessageList.tsx
import React, { useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { MessageBubble } from './MessageBubble';

interface ChatMessageListProps {
  messages: Message[];
  height: number;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  height
}) => {
  const itemData = useMemo(() => ({ messages }), [messages]);

  const getItemSize = useCallback((index: number) => {
    const message = messages[index];
    // Estimate height based on message length
    const baseHeight = 60;
    const contentHeight = Math.ceil(message.content.length / 80) * 20;
    return Math.max(baseHeight, Math.min(contentHeight + 40, 200));
  }, [messages]);

  const renderItem = useCallback(({ index, style, data }: any) => {
    const message = data.messages[index];
    return (
      <div style={style} className="px-4 py-2">
        <MessageBubble message={message} />
      </div>
    );
  }, []);

  return (
    <List
      height={height}
      itemCount={messages.length}
      itemSize={getItemSize}
      itemData={itemData}
      overscanCount={5}
    >
      {renderItem}
    </List>
  );
};
```

## Memory Management

### Memory Monitoring

```typescript
// src/utils/memoryMonitor.ts
export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private memoryHistory: MemorySnapshot[] = [];
  private readonly MAX_HISTORY = 100;

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  getMemoryUsage(): MemorySnapshot | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        timestamp: Date.now()
      };
    }
    return null;
  }

  recordSnapshot(): void {
    const snapshot = this.getMemoryUsage();
    if (snapshot) {
      this.memoryHistory.push(snapshot);
      if (this.memoryHistory.length > this.MAX_HISTORY) {
        this.memoryHistory.shift();
      }
    }
  }

  getMemoryTrend(): MemoryTrend {
    if (this.memoryHistory.length < 2) {
      return { trend: 'stable', change: 0 };
    }

    const recent = this.memoryHistory.slice(-10);
    const avgRecent = recent.reduce((sum, snap) => sum + snap.used, 0) / recent.length;
    const avgOlder = this.memoryHistory.slice(-20, -10).reduce((sum, snap) => sum + snap.used, 0) / 10;

    const change = ((avgRecent - avgOlder) / avgOlder) * 100;

    if (change > 10) return { trend: 'increasing', change };
    if (change < -10) return { trend: 'decreasing', change };
    return { trend: 'stable', change };
  }

  cleanup(): void {
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }

    // Clear caches if memory usage is high
    const memory = this.getMemoryUsage();
    if (memory && memory.used > memory.limit * 0.8) {
      // Clear non-essential caches
      this.clearNonEssentialCaches();
    }
  }

  private clearNonEssentialCaches(): void {
    // Implementation to clear caches when memory is low
  }
}

interface MemorySnapshot {
  used: number;
  total: number;
  limit: number;
  timestamp: number;
}

interface MemoryTrend {
  trend: 'increasing' | 'decreasing' | 'stable';
  change: number;
}
```

### Component Cleanup

```typescript
// src/hooks/useMemoryCleanup.ts
import { useEffect, useRef } from 'react';

export const useMemoryCleanup = (cleanupFn?: () => void) => {
  const cleanupRef = useRef(cleanupFn);

  useEffect(() => {
    cleanupRef.current = cleanupFn;
  }, [cleanupFn]);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);
};

// Usage in components
export const HeavyComponent: React.FC = () => {
  const [largeData, setLargeData] = useState(null);

  useMemoryCleanup(() => {
    // Cleanup large data when component unmounts
    setLargeData(null);
  });

  // Component logic...
};
```

## Network Optimization

### Request Batching

```typescript
// src/services/BatchRequestService.ts
export class BatchRequestService {
  private requestQueue: QueuedRequest[] = [];
  private isProcessing = false;
  private readonly BATCH_SIZE = 5;
  private readonly BATCH_DELAY = 100; // ms

  async addRequest<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        request,
        resolve,
        reject,
        timestamp: Date.now()
      });

      this.scheduleProcessing();
    });
  }

  private scheduleProcessing(): void {
    if (this.isProcessing) return;

    setTimeout(() => {
      this.processBatch();
    }, this.BATCH_DELAY);
  }

  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) return;

    this.isProcessing = true;

    const batch = this.requestQueue.splice(0, this.BATCH_SIZE);

    try {
      // Process requests in parallel with concurrency limit
      const results = await Promise.allSettled(
        batch.map(item => this.executeWithTimeout(item.request))
      );

      results.forEach((result, index) => {
        const item = batch[index];
        if (result.status === 'fulfilled') {
          item.resolve(result.value);
        } else {
          item.reject(result.reason);
        }
      });
    } finally {
      this.isProcessing = false;

      // Process remaining requests
      if (this.requestQueue.length > 0) {
        this.scheduleProcessing();
      }
    }
  }

  private async executeWithTimeout<T>(request: () => Promise<T>): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), 30000)
    );

    return Promise.race([request(), timeoutPromise]);
  }
}

interface QueuedRequest {
  request: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timestamp: number;
}
```

### Progressive Loading

```typescript
// src/hooks/useProgressiveData.ts
import { useState, useEffect, useCallback } from 'react';

interface ProgressiveDataOptions<T> {
  fetcher: (page: number, pageSize: number) => Promise<T[]>;
  pageSize?: number;
  initialLoad?: number;
}

export function useProgressiveData<T>({
  fetcher,
  pageSize = 20,
  initialLoad = 10
}: ProgressiveDataOptions<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const initialData = await fetcher(0, initialLoad);
      setData(initialData);
      setPage(1);
      setHasMore(initialData.length === initialLoad);
    } finally {
      setLoading(false);
    }
  }, [fetcher, initialLoad]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const newData = await fetcher(page, pageSize);
      if (newData.length === 0) {
        setHasMore(false);
      } else {
        setData(prev => [...prev, ...newData]);
        setPage(prev => prev + 1);
        setHasMore(newData.length === pageSize);
      }
    } finally {
      setLoading(false);
    }
  }, [fetcher, page, pageSize, loading, hasMore]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  return {
    data,
    loading,
    hasMore,
    loadMore,
    reload: loadInitial
  };
}
```

## Performance Monitoring

### Core Web Vitals

```typescript
// src/utils/webVitals.ts
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

export const initWebVitals = () => {
  // Cumulative Layout Shift
  onCLS((metric) => {
    console.log('CLS:', metric);
    reportMetric('CLS', metric);
  });

  // First Input Delay
  onFID((metric) => {
    console.log('FID:', metric);
    reportMetric('FID', metric);
  });

  // First Contentful Paint
  onFCP((metric) => {
    console.log('FCP:', metric);
    reportMetric('FCP', metric);
  });

  // Largest Contentful Paint
  onLCP((metric) => {
    console.log('LCP:', metric);
    reportMetric('LCP', metric);
  });

  // Time to First Byte
  onTTFB((metric) => {
    console.log('TTFB:', metric);
    reportMetric('TTFB', metric);
  });
};

const reportMetric = (name: string, metric: any) => {
  // Send to analytics service
  if (window.gtag) {
    window.gtag('event', name, {
      value: Math.round(metric.value * 1000) / 1000,
      event_category: 'Web Vitals',
      event_label: metric.id,
      non_interaction: true
    });
  }

  // Store locally for debugging
  const vitals = JSON.parse(localStorage.getItem('web_vitals') || '[]');
  vitals.push({
    name,
    value: metric.value,
    timestamp: Date.now(),
    id: metric.id
  });

  // Keep only last 50 measurements
  if (vitals.length > 50) {
    vitals.shift();
  }

  localStorage.setItem('web_vitals', JSON.stringify(vitals));
};
```

### Performance Budget

```typescript
// src/utils/performanceBudget.ts
export const performanceBudget = {
  // Bundle sizes
  bundles: {
    'react-vendor': { size: 150, unit: 'KB' },
    'ui-vendor': { size: 200, unit: 'KB' },
    'ai-vendor': { size: 100, unit: 'KB' },
    main: { size: 300, unit: 'KB' }
  },

  // Core Web Vitals
  webVitals: {
    LCP: { max: 2500, unit: 'ms' },
    FID: { max: 100, unit: 'ms' },
    CLS: { max: 0.1, unit: 'score' }
  },

  // Runtime performance
  runtime: {
    memoryUsage: { max: 50, unit: 'MB' },
    cpuUsage: { max: 80, unit: '%' }
  }
};

export const checkPerformanceBudget = () => {
  // Check bundle sizes
  if (import.meta.env.PROD) {
    import('vite-bundle-analyzer').then(({ analyzeBundle }) => {
      analyzeBundle().then((report) => {
        Object.entries(performanceBudget.bundles).forEach(([name, budget]) => {
          const bundle = report.bundles.find(b => b.name.includes(name));
          if (bundle && bundle.size > budget.size * 1024) {
            console.warn(`Bundle ${name} exceeds budget: ${bundle.size / 1024}KB > ${budget.size}KB`);
          }
        });
      });
    });
  }
};
```

### Performance Profiling

```typescript
// src/utils/performanceProfiler.ts
export class PerformanceProfiler {
  private marks = new Map<string, number>();
  private measures = new Map<string, PerformanceMeasure[]>();

  startMark(name: string): void {
    this.marks.set(name, performance.now());
  }

  endMark(name: string): number | null {
    const startTime = this.marks.get(name);
    if (!startTime) return null;

    const duration = performance.now() - startTime;
    this.marks.delete(name);

    // Create performance measure
    try {
      performance.measure(name, { start: startTime, end: performance.now() });
    } catch (error) {
      // Measure already exists
    }

    // Store measure
    const measures = this.measures.get(name) || [];
    measures.push(performance.getEntriesByName(name, 'measure')[0] as PerformanceMeasure);
    this.measures.set(name, measures);

    return duration;
  }

  getAverageDuration(name: string): number | null {
    const measures = this.measures.get(name);
    if (!measures || measures.length === 0) return null;

    const total = measures.reduce((sum, measure) => sum + measure.duration, 0);
    return total / measures.length;
  }

  getAllMeasures(): Record<string, { average: number; count: number; last: number }> {
    const result: Record<string, { average: number; count: number; last: number }> = {};

    this.measures.forEach((measures, name) => {
      const average = measures.reduce((sum, m) => sum + m.duration, 0) / measures.length;
      const last = measures[measures.length - 1].duration;

      result[name] = {
        average,
        count: measures.length,
        last
      };
    });

    return result;
  }

  clear(): void {
    this.marks.clear();
    this.measures.clear();
    performance.clearMarks();
    performance.clearMeasures();
  }
}

// Global profiler instance
export const profiler = new PerformanceProfiler();
```

---

*Last updated: October 30, 2025*</content>
<parameter name="filePath">c:\Users\Aarnav\Desktop\Anshika\docs\performance.md