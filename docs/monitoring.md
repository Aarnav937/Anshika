# Monitoring Documentation

## Overview

A.N.S.H.I.K.A. implements comprehensive monitoring and observability to ensure system reliability, performance, and user experience. The monitoring system tracks application metrics, errors, user interactions, and system health across all components.

## Monitoring Architecture

### Monitoring Stack

```typescript
// src/config/monitoring.ts
export const monitoringConfig = {
  // Application Performance Monitoring
  apm: {
    enabled: true,
    serviceName: 'anshika-ai',
    environment: process.env.NODE_ENV,
    sampleRate: 0.1 // 10% sampling in production
  },

  // Error Tracking
  errorTracking: {
    enabled: true,
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.APP_VERSION
  },

  // Analytics
  analytics: {
    enabled: true,
    measurementId: process.env.GA_MEASUREMENT_ID,
    debug: process.env.NODE_ENV === 'development'
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    transports: ['console', 'file', 'remote']
  },

  // Health Checks
  healthChecks: {
    enabled: true,
    interval: 30000, // 30 seconds
    timeout: 5000   // 5 seconds
  }
};
```

### Monitoring Service

```typescript
// src/services/MonitoringService.ts
import * as Sentry from '@sentry/electron';
import { init as initApm } from '@elastic/apm-rum';
import ReactGA from 'react-ga4';
import { logger } from '../utils/logger';

export class MonitoringService {
  private static instance: MonitoringService;
  private metrics: Map<string, number> = new Map();
  private timers: Map<string, number> = new Map();

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  initialize(): void {
    this.initializeErrorTracking();
    this.initializeAPM();
    this.initializeAnalytics();
    this.initializeHealthChecks();
  }

  private initializeErrorTracking(): void {
    if (monitoringConfig.errorTracking.enabled) {
      Sentry.init({
        dsn: monitoringConfig.errorTracking.dsn,
        environment: monitoringConfig.errorTracking.environment,
        release: monitoringConfig.errorTracking.release,
        integrations: [
          new Sentry.BrowserTracing({
            tracePropagationTargets: ['localhost', /^https:\/\/.*\.anshika\.ai/]
          })
        ],
        tracesSampleRate: monitoringConfig.apm.sampleRate,
        beforeSend: (event) => {
          // Sanitize sensitive data
          return this.sanitizeEvent(event);
        }
      });

      logger.info('Error tracking initialized');
    }
  }

  private initializeAPM(): void {
    if (monitoringConfig.apm.enabled) {
      initApm({
        serviceName: monitoringConfig.apm.serviceName,
        environment: monitoringConfig.apm.environment,
        serverUrl: process.env.APM_SERVER_URL,
        sampleRate: monitoringConfig.apm.sampleRate
      });

      logger.info('APM initialized');
    }
  }

  private initializeAnalytics(): void {
    if (monitoringConfig.analytics.enabled) {
      ReactGA.initialize(monitoringConfig.analytics.measurementId, {
        debug: monitoringConfig.analytics.debug
      });

      // Track initial page view
      ReactGA.send('pageview');

      logger.info('Analytics initialized');
    }
  }

  private initializeHealthChecks(): void {
    if (monitoringConfig.healthChecks.enabled) {
      setInterval(() => {
        this.performHealthCheck();
      }, monitoringConfig.healthChecks.interval);
    }
  }

  // Error tracking methods
  trackError(error: Error, context?: Record<string, any>): void {
    logger.error('Error tracked:', error, context);

    if (monitoringConfig.errorTracking.enabled) {
      Sentry.captureException(error, {
        tags: {
          component: context?.component || 'unknown',
          userId: context?.userId
        },
        extra: context
      });
    }

    // Track in analytics
    if (monitoringConfig.analytics.enabled) {
      ReactGA.event({
        category: 'Error',
        action: error.name,
        label: error.message
      });
    }
  }

  trackMessage(message: string, level: 'info' | 'warning' | 'error', context?: Record<string, any>): void {
    logger.log(level, message, context);

    if (level === 'error' && monitoringConfig.errorTracking.enabled) {
      Sentry.captureMessage(message, Sentry.Severity.Error, {
        extra: context
      });
    }
  }

  // Performance monitoring
  startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }

  endTimer(name: string): number {
    const startTime = this.timers.get(name);
    if (!startTime) return 0;

    const duration = performance.now() - startTime;
    this.timers.delete(name);

    // Track performance metric
    this.trackMetric(`timer.${name}`, duration);

    return duration;
  }

  // Metrics tracking
  trackMetric(name: string, value: number, tags?: Record<string, string>): void {
    this.metrics.set(name, value);

    // Send to APM if enabled
    if (monitoringConfig.apm.enabled) {
      // APM metric tracking would go here
    }

    // Send to analytics
    if (monitoringConfig.analytics.enabled && name.startsWith('user.')) {
      ReactGA.event({
        category: 'Metric',
        action: name,
        value: Math.round(value)
      });
    }

    logger.debug(`Metric tracked: ${name} = ${value}`, tags);
  }

  // User interaction tracking
  trackEvent(category: string, action: string, label?: string, value?: number): void {
    if (monitoringConfig.analytics.enabled) {
      ReactGA.event({
        category,
        action,
        label,
        value
      });
    }

    logger.debug(`Event tracked: ${category}:${action}`, { label, value });
  }

  // Health check
  private async performHealthCheck(): Promise<void> {
    const checks = [
      this.checkAPIServices(),
      this.checkLocalStorage(),
      this.checkMemoryUsage(),
      this.checkNetworkConnectivity()
    ];

    try {
      const results = await Promise.all(checks);
      const allHealthy = results.every(result => result.healthy);

      if (!allHealthy) {
        this.trackMessage('Health check failed', 'warning', {
          results: results.filter(r => !r.healthy)
        });
      }

      this.trackMetric('health.overall', allHealthy ? 1 : 0);
    } catch (error) {
      this.trackError(error as Error, { component: 'health-check' });
    }
  }

  private async checkAPIServices(): Promise<HealthCheckResult> {
    try {
      // Check Gemini API connectivity
      const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1/models', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(monitoringConfig.healthChecks.timeout)
      });

      return {
        service: 'gemini-api',
        healthy: geminiResponse.ok,
        responseTime: 0 // Would need to track this
      };
    } catch (error) {
      return {
        service: 'gemini-api',
        healthy: false,
        error: error.message
      };
    }
  }

  private checkLocalStorage(): HealthCheckResult {
    try {
      const testKey = '__health_check_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);

      return {
        service: 'local-storage',
        healthy: true
      };
    } catch (error) {
      return {
        service: 'local-storage',
        healthy: false,
        error: error.message
      };
    }
  }

  private checkMemoryUsage(): HealthCheckResult {
    try {
      // @ts-ignore - performance.memory is not in types
      const memory = performance.memory;
      const usedPercent = memory.usedJSHeapSize / memory.totalJSHeapSize;

      return {
        service: 'memory',
        healthy: usedPercent < 0.9, // Alert if >90% used
        metrics: {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          percentage: usedPercent
        }
      };
    } catch (error) {
      return {
        service: 'memory',
        healthy: true, // Not critical if we can't measure
        error: error.message
      };
    }
  }

  private async checkNetworkConnectivity(): Promise<HealthCheckResult> {
    try {
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(2000)
      });

      return {
        service: 'network',
        healthy: response.ok
      };
    } catch (error) {
      return {
        service: 'network',
        healthy: false,
        error: error.message
      };
    }
  }

  private sanitizeEvent(event: any): any {
    // Remove sensitive data from error events
    if (event.exception) {
      // Sanitize stack traces, user data, etc.
    }

    return event;
  }

  // Get monitoring data for debugging
  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  getHealthStatus(): Promise<HealthCheckResult[]> {
    return Promise.all([
      this.checkAPIServices(),
      this.checkLocalStorage(),
      this.checkMemoryUsage(),
      this.checkNetworkConnectivity()
    ]);
  }
}

interface HealthCheckResult {
  service: string;
  healthy: boolean;
  error?: string;
  responseTime?: number;
  metrics?: Record<string, any>;
}
```

## Application Performance Monitoring (APM)

### Performance Metrics

```typescript
// src/hooks/usePerformanceMonitoring.ts
import { useEffect, useRef } from 'react';
import { MonitoringService } from '../services/MonitoringService';

export const usePerformanceMonitoring = (componentName: string) => {
  const renderCount = useRef(0);
  const mountTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current += 1;

    // Track component mount
    if (renderCount.current === 1) {
      MonitoringService.getInstance().trackEvent(
        'Component',
        'Mount',
        componentName
      );
    }

    // Track re-renders (throttled)
    if (renderCount.current > 1 && renderCount.current % 10 === 0) {
      MonitoringService.getInstance().trackEvent(
        'Component',
        'Re-render',
        componentName,
        renderCount.current
      );
    }
  });

  useEffect(() => {
    return () => {
      // Track component unmount
      const lifetime = performance.now() - mountTime.current;
      MonitoringService.getInstance().trackMetric(
        `component.${componentName}.lifetime`,
        lifetime
      );
    };
  }, [componentName]);

  return {
    trackInteraction: (action: string, details?: Record<string, any>) => {
      MonitoringService.getInstance().trackEvent(
        'User Interaction',
        action,
        componentName,
        undefined,
        details
      );
    }
  };
};
```

### Core Web Vitals Tracking

```typescript
// src/utils/webVitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
import { MonitoringService } from '../services/MonitoringService';

export const trackWebVitals = (): void => {
  const monitoring = MonitoringService.getInstance();

  // Cumulative Layout Shift
  getCLS((metric) => {
    monitoring.trackMetric('web-vitals.cls', metric.value);
    monitoring.trackEvent('Web Vitals', 'CLS', metric.rating, metric.value);
  });

  // First Input Delay
  getFID((metric) => {
    monitoring.trackMetric('web-vitals.fid', metric.value);
    monitoring.trackEvent('Web Vitals', 'FID', metric.rating, metric.value);
  });

  // First Contentful Paint
  getFCP((metric) => {
    monitoring.trackMetric('web-vitals.fcp', metric.value);
    monitoring.trackEvent('Web Vitals', 'FCP', metric.rating, metric.value);
  });

  // Largest Contentful Paint
  getLCP((metric) => {
    monitoring.trackMetric('web-vitals.lcp', metric.value);
    monitoring.trackEvent('Web Vitals', 'LCP', metric.rating, metric.value);
  });

  // Time to First Byte
  getTTFB((metric) => {
    monitoring.trackMetric('web-vitals.ttfb', metric.value);
    monitoring.trackEvent('Web Vitals', 'TTFB', metric.rating, metric.value);
  });
};
```

## Error Tracking and Logging

### Error Boundary with Monitoring

```typescript
// src/components/ErrorBoundary.tsx
import React from 'react';
import { ErrorFallback } from './ErrorFallback';
import { MonitoringService } from '../services/MonitoringService';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallback?: React.ComponentType<any> }>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{ fallback?: React.ComponentType<any> }>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Track error with monitoring service
    MonitoringService.getInstance().trackError(error, {
      component: 'ErrorBoundary',
      errorInfo: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    });

    // Log additional context
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || ErrorFallback;
      return <FallbackComponent error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

### Structured Logging

```typescript
// src/utils/logger.ts
import { MonitoringService } from '../services/MonitoringService';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private level: LogLevel;
  private monitoring: MonitoringService;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
    this.monitoring = MonitoringService.getInstance();
  }

  debug(message: string, context?: Record<string, any>): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${message}`, context);
      this.monitoring.trackMessage(message, 'info', { ...context, level: 'debug' });
    }
  }

  info(message: string, context?: Record<string, any>): void {
    if (this.level <= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, context);
      this.monitoring.trackMessage(message, 'info', context);
    }
  }

  warn(message: string, context?: Record<string, any>): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, context);
      this.monitoring.trackMessage(message, 'warning', context);
    }
  }

  error(message: string | Error, context?: Record<string, any>): void {
    if (this.level <= LogLevel.ERROR) {
      const errorMessage = message instanceof Error ? message.message : message;
      const error = message instanceof Error ? message : new Error(message);

      console.error(`[ERROR] ${errorMessage}`, context);
      this.monitoring.trackError(error, context);
    }
  }

  // Performance logging
  time(label: string): void {
    console.time(label);
    this.monitoring.startTimer(label);
  }

  timeEnd(label: string): void {
    console.timeEnd(label);
    this.monitoring.endTimer(label);
  }
}

// Global logger instance
export const logger = new Logger(
  LogLevel[process.env.LOG_LEVEL?.toUpperCase() as keyof typeof LogLevel] || LogLevel.INFO
);
```

## Analytics and User Behavior Tracking

### User Interaction Tracking

```typescript
// src/hooks/useAnalytics.ts
import { useEffect } from 'react';
import { MonitoringService } from '../services/MonitoringService';

export const useAnalytics = () => {
  const monitoring = MonitoringService.getInstance();

  useEffect(() => {
    // Track page views
    monitoring.trackEvent('Navigation', 'Page View', window.location.pathname);

    // Track session start
    monitoring.trackEvent('Session', 'Start');
  }, []);

  return {
    trackButtonClick: (buttonName: string, context?: Record<string, any>) => {
      monitoring.trackEvent('Button', 'Click', buttonName, undefined, context);
    },

    trackFeatureUsage: (feature: string, action: string, details?: Record<string, any>) => {
      monitoring.trackEvent('Feature', action, feature, undefined, details);
    },

    trackConversion: (event: string, value?: number, context?: Record<string, any>) => {
      monitoring.trackEvent('Conversion', event, undefined, value, context);
    },

    trackError: (error: Error, context?: Record<string, any>) => {
      monitoring.trackError(error, context);
    }
  };
};
```

### Chat Analytics

```typescript
// src/hooks/useChatAnalytics.ts
import { useEffect } from 'react';
import { useChat } from '../contexts/ChatContext';
import { MonitoringService } from '../services/MonitoringService';

export const useChatAnalytics = () => {
  const { messages, currentMode } = useChat();
  const monitoring = MonitoringService.getInstance();

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];

      if (lastMessage.role === 'user') {
        monitoring.trackEvent('Chat', 'User Message', currentMode, lastMessage.content.length);
      } else if (lastMessage.role === 'assistant') {
        monitoring.trackEvent('Chat', 'Assistant Response', currentMode, lastMessage.content.length);
        monitoring.trackMetric('chat.response_time', lastMessage.timestamp - (messages[messages.length - 2]?.timestamp || 0));
      }
    }
  }, [messages, currentMode]);

  return {
    trackModeSwitch: (fromMode: string, toMode: string) => {
      monitoring.trackEvent('Chat', 'Mode Switch', `${fromMode} -> ${toMode}`);
    },

    trackError: (error: string, context?: Record<string, any>) => {
      monitoring.trackError(new Error(error), { ...context, component: 'chat' });
    }
  };
};
```

## System Health Monitoring

### Resource Usage Monitoring

```typescript
// src/utils/resourceMonitor.ts
import { MonitoringService } from '../services/MonitoringService';

export class ResourceMonitor {
  private monitoring: MonitoringService;
  private intervalId?: NodeJS.Timeout;

  constructor() {
    this.monitoring = MonitoringService.getInstance();
  }

  start(intervalMs: number = 60000): void {
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private collectMetrics(): void {
    // Memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.monitoring.trackMetric('system.memory.used', memory.usedJSHeapSize);
      this.monitoring.trackMetric('system.memory.total', memory.totalJSHeapSize);
      this.monitoring.trackMetric('system.memory.limit', memory.jsHeapSizeLimit);
    }

    // Storage usage
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(estimate => {
        this.monitoring.trackMetric('system.storage.used', estimate.usage || 0);
        this.monitoring.trackMetric('system.storage.quota', estimate.quota || 0);
      });
    }

    // Network information
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        this.monitoring.trackMetric('network.effective_type', this.getConnectionSpeedValue(connection.effectiveType));
        this.monitoring.trackMetric('network.downlink', connection.downlink);
        this.monitoring.trackMetric('network.rtt', connection.rtt);
      }
    }

    // Battery status (if available)
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        this.monitoring.trackMetric('battery.level', battery.level * 100);
        this.monitoring.trackMetric('battery.charging', battery.charging ? 1 : 0);
      });
    }
  }

  private getConnectionSpeedValue(type: string): number {
    const speeds = {
      'slow-2g': 1,
      '2g': 2,
      '3g': 3,
      '4g': 4
    };
    return speeds[type as keyof typeof speeds] || 0;
  }
}
```

### API Monitoring

```typescript
// src/services/APIMonitoringService.ts
import { MonitoringService } from './MonitoringService';

export class APIMonitoringService {
  private monitoring: MonitoringService;

  constructor() {
    this.monitoring = MonitoringService.getInstance();
  }

  async monitoredFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const startTime = performance.now();
    const monitoring = this.monitoring;

    try {
      monitoring.trackEvent('API', 'Request Start', url);

      const response = await fetch(url, options);
      const duration = performance.now() - startTime;

      monitoring.trackMetric('api.request.duration', duration);
      monitoring.trackMetric('api.request.status', response.status);

      if (response.ok) {
        monitoring.trackEvent('API', 'Request Success', url, Math.round(duration));
      } else {
        monitoring.trackEvent('API', 'Request Error', `${url} (${response.status})`, Math.round(duration));
        monitoring.trackError(new Error(`API Error: ${response.status} ${response.statusText}`), {
          url,
          status: response.status,
          duration
        });
      }

      return response;
    } catch (error) {
      const duration = performance.now() - startTime;

      monitoring.trackMetric('api.request.duration', duration);
      monitoring.trackEvent('API', 'Request Failure', url, Math.round(duration));
      monitoring.trackError(error as Error, {
        url,
        duration,
        component: 'api-monitoring'
      });

      throw error;
    }
  }

  trackAPIUsage(endpoint: string, method: string, responseTime: number, success: boolean): void {
    this.monitoring.trackEvent('API', method, endpoint, Math.round(responseTime));
    this.monitoring.trackMetric(`api.${endpoint}.response_time`, responseTime);
    this.monitoring.trackMetric(`api.${endpoint}.success_rate`, success ? 1 : 0);
  }
}
```

## Monitoring Dashboard

### Real-time Metrics Dashboard

```typescript
// src/components/MonitoringDashboard.tsx
import React, { useState, useEffect } from 'react';
import { MonitoringService } from '../services/MonitoringService';
import { useTranslation } from '../hooks/useTranslation';

export const MonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [healthStatus, setHealthStatus] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation('monitoring');

  useEffect(() => {
    const loadMonitoringData = async () => {
      const monitoring = MonitoringService.getInstance();

      try {
        const [metricsData, healthData] = await Promise.all([
          monitoring.getMetrics(),
          monitoring.getHealthStatus()
        ]);

        setMetrics(metricsData);
        setHealthStatus(healthData);
      } catch (error) {
        console.error('Failed to load monitoring data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMonitoringData();

    // Refresh every 30 seconds
    const interval = setInterval(loadMonitoringData, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <div className="loading">{t('loading')}</div>;
  }

  return (
    <div className="monitoring-dashboard">
      <h2>{t('dashboard.title')}</h2>

      <div className="metrics-grid">
        <div className="metric-card">
          <h3>{t('metrics.memory')}</h3>
          <div className="metric-value">
            {metrics['system.memory.used'] ? `${Math.round(metrics['system.memory.used'] / 1024 / 1024)} MB` : 'N/A'}
          </div>
        </div>

        <div className="metric-card">
          <h3>{t('metrics.api_response_time')}</h3>
          <div className="metric-value">
            {metrics['api.request.duration'] ? `${Math.round(metrics['api.request.duration'])} ms` : 'N/A'}
          </div>
        </div>

        <div className="metric-card">
          <h3>{t('metrics.health_score')}</h3>
          <div className="metric-value">
            {metrics['health.overall'] === 1 ? t('status.healthy') : t('status.unhealthy')}
          </div>
        </div>
      </div>

      <div className="health-checks">
        <h3>{t('health_checks.title')}</h3>
        {healthStatus.map((check, index) => (
          <div key={index} className={`health-check ${check.healthy ? 'healthy' : 'unhealthy'}`}>
            <span className="service-name">{check.service}</span>
            <span className="status">{check.healthy ? '✓' : '✗'}</span>
            {check.error && <span className="error">{check.error}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Alerting and Notifications

### Alert Configuration

```typescript
// src/config/alerts.ts
export const alertConfig = {
  memory: {
    threshold: 0.8, // 80% memory usage
    cooldown: 300000, // 5 minutes
    severity: 'warning'
  },

  api_errors: {
    threshold: 5, // 5 errors per minute
    cooldown: 60000, // 1 minute
    severity: 'error'
  },

  response_time: {
    threshold: 5000, // 5 seconds
    cooldown: 60000,
    severity: 'warning'
  },

  health_checks: {
    failure_threshold: 3, // 3 consecutive failures
    cooldown: 300000,
    severity: 'critical'
  }
};
```

### Alert Manager

```typescript
// src/services/AlertManager.ts
import { MonitoringService } from './MonitoringService';
import { alertConfig } from '../config/alerts';

export class AlertManager {
  private monitoring: MonitoringService;
  private alerts: Map<string, AlertState> = new Map();

  constructor() {
    this.monitoring = MonitoringService.getInstance();
  }

  checkThreshold(metric: string, value: number): void {
    const config = (alertConfig as any)[metric];

    if (!config) return;

    const alertKey = `${metric}_threshold`;
    const currentState = this.alerts.get(alertKey);

    const isAboveThreshold = value > config.threshold;
    const shouldAlert = !currentState || (
      isAboveThreshold &&
      Date.now() - currentState.lastAlert > config.cooldown
    );

    if (shouldAlert && isAboveThreshold) {
      this.fireAlert(metric, value, config.severity);
      this.alerts.set(alertKey, {
        lastAlert: Date.now(),
        consecutiveCount: (currentState?.consecutiveCount || 0) + 1
      });
    } else if (!isAboveThreshold) {
      // Reset consecutive count
      this.alerts.set(alertKey, {
        lastAlert: currentState?.lastAlert || 0,
        consecutiveCount: 0
      });
    }
  }

  private fireAlert(metric: string, value: number, severity: string): void {
    const message = `Alert: ${metric} exceeded threshold with value ${value}`;

    this.monitoring.trackMessage(message, severity as any, {
      metric,
      value,
      threshold: (alertConfig as any)[metric].threshold,
      severity
    });

    // In a real implementation, this would send notifications
    // via email, Slack, SMS, etc.
    this.sendNotification(message, severity);
  }

  private sendNotification(message: string, severity: string): void {
    // Placeholder for notification logic
    console.log(`[${severity.toUpperCase()}] ${message}`);

    // Could integrate with:
    // - Email service (SendGrid, AWS SES)
    // - Slack webhooks
    // - SMS service (Twilio)
    // - Push notifications
  }

  getActiveAlerts(): AlertState[] {
    return Array.from(this.alerts.values()).filter(
      state => Date.now() - state.lastAlert < 3600000 // Active in last hour
    );
  }
}

interface AlertState {
  lastAlert: number;
  consecutiveCount: number;
}
```

## Privacy and Data Protection

### Data Sanitization

```typescript
// src/utils/dataSanitizer.ts
export class DataSanitizer {
  static sanitizeObject(obj: any, sensitiveKeys: string[] = []): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const sanitized = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value, sensitiveKeys);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  static sanitizeError(error: Error): Error {
    const sanitized = new Error(error.message);

    // Remove sensitive information from stack trace
    if (error.stack) {
      sanitized.stack = error.stack
        .split('\n')
        .filter(line => !line.includes('password') && !line.includes('token'))
        .join('\n');
    }

    return sanitized;
  }

  static sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove query parameters that might contain sensitive data
      const sensitiveParams = ['password', 'token', 'key', 'secret'];
      sensitiveParams.forEach(param => {
        urlObj.searchParams.delete(param);
      });
      return urlObj.toString();
    } catch {
      return url;
    }
  }
}
```

---

*Last updated: October 30, 2025*</content>
<parameter name="filePath">c:\Users\Aarnav\Desktop\Anshika\docs\monitoring.md