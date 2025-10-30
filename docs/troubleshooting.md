# Troubleshooting Documentation

## Overview

This guide provides solutions to common issues and problems that may occur when using A.N.S.H.I.K.A. The troubleshooting section is organized by component and includes diagnostic steps, error codes, and resolution procedures.

## Quick Diagnostics

### System Health Check

```typescript
// src/utils/diagnostics.ts
export class Diagnostics {
  static async runFullCheck(): Promise<DiagnosticResult> {
    const checks = [
      this.checkEnvironment(),
      this.checkAPIKeys(),
      this.checkNetworkConnectivity(),
      this.checkStorageAccess(),
      this.checkBrowserCompatibility(),
      this.checkMemoryUsage(),
      this.checkServiceAvailability()
    ];

    const results = await Promise.all(checks);

    return {
      timestamp: new Date().toISOString(),
      overallHealth: results.every(r => r.status === 'pass') ? 'healthy' : 'unhealthy',
      checks: results
    };
  }

  static async checkEnvironment(): Promise<DiagnosticCheck> {
    const issues: string[] = [];

    // Check Node.js version (for Electron)
    if (typeof process !== 'undefined' && process.versions) {
      const nodeVersion = process.versions.node;
      if (nodeVersion < '18.0.0') {
        issues.push(`Node.js version ${nodeVersion} is below minimum required 18.0.0`);
      }
    }

    // Check browser compatibility
    const userAgent = navigator.userAgent;
    const isSupportedBrowser = /Chrome|Firefox|Safari|Edge/.test(userAgent);
    if (!isSupportedBrowser) {
      issues.push('Browser may not be fully supported');
    }

    return {
      name: 'Environment Check',
      status: issues.length === 0 ? 'pass' : 'fail',
      issues,
      details: {
        userAgent,
        platform: navigator.platform,
        language: navigator.language
      }
    };
  }

  static async checkAPIKeys(): Promise<DiagnosticCheck> {
    const issues: string[] = [];
    const missingKeys: string[] = [];

    // Check for required API keys
    const requiredKeys = ['GEMINI_API_KEY'];
    const optionalKeys = ['WEATHER_API_KEY', 'WEB_SEARCH_API_KEY'];

    requiredKeys.forEach(key => {
      if (!process.env[key]) {
        missingKeys.push(key);
        issues.push(`Required API key ${key} is missing`);
      }
    });

    optionalKeys.forEach(key => {
      if (!process.env[key]) {
        issues.push(`Optional API key ${key} is not configured (some features may be limited)`);
      }
    });

    return {
      name: 'API Keys Check',
      status: missingKeys.length === 0 ? 'pass' : 'fail',
      issues,
      details: {
        requiredKeys: requiredKeys.length,
        optionalKeys: optionalKeys.length,
        configuredRequired: requiredKeys.length - missingKeys.length,
        configuredOptional: optionalKeys.filter(key => process.env[key]).length
      }
    };
  }

  static async checkNetworkConnectivity(): Promise<DiagnosticCheck> {
    const issues: string[] = [];

    try {
      // Test basic connectivity
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });

      // Test API endpoints
      const apiTests = [
        this.testEndpoint('https://generativelanguage.googleapis.com'),
        this.testEndpoint('https://api.openweathermap.org'), // Optional
      ];

      const apiResults = await Promise.allSettled(apiTests);

      apiResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          const endpoint = ['Gemini API', 'Weather API'][index];
          issues.push(`${endpoint} is not reachable: ${result.reason.message}`);
        }
      });

    } catch (error) {
      issues.push(`Network connectivity test failed: ${error.message}`);
    }

    return {
      name: 'Network Connectivity',
      status: issues.length === 0 ? 'pass' : 'fail',
      issues,
      details: {
        online: navigator.onLine
      }
    };
  }

  static async checkStorageAccess(): Promise<DiagnosticCheck> {
    const issues: string[] = [];

    try {
      // Test localStorage
      const testKey = '__diagnostic_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
    } catch (error) {
      issues.push(`localStorage access failed: ${error.message}`);
    }

    try {
      // Test IndexedDB
      const db = indexedDB.open('diagnostic_test', 1);
      await new Promise((resolve, reject) => {
        db.onerror = () => reject(new Error('IndexedDB not available'));
        db.onsuccess = () => {
          db.result.close();
          resolve(undefined);
        };
      });
    } catch (error) {
      issues.push(`IndexedDB access failed: ${error.message}`);
    }

    return {
      name: 'Storage Access',
      status: issues.length === 0 ? 'pass' : 'fail',
      issues
    };
  }

  static checkBrowserCompatibility(): DiagnosticCheck {
    const issues: string[] = [];

    // Check required APIs
    const requiredAPIs = [
      { name: 'Web Speech API', available: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window },
      { name: 'Web Audio API', available: !!(window.AudioContext || (window as any).webkitAudioContext) },
      { name: 'File API', available: !!(window.File && window.FileReader && window.FileList && window.Blob) },
      { name: 'IndexedDB', available: !!indexedDB },
      { name: 'Web Workers', available: !!window.Worker },
      { name: 'WebAssembly', available: !!window.WebAssembly },
      { name: 'Fetch API', available: !!window.fetch },
      { name: 'Promise', available: !!window.Promise },
      { name: 'Async/Await', available: (async () => {})() instanceof Promise }
    ];

    requiredAPIs.forEach(api => {
      if (!api.available) {
        issues.push(`${api.name} is not supported in this browser`);
      }
    });

    return {
      name: 'Browser Compatibility',
      status: issues.length === 0 ? 'pass' : 'fail',
      issues,
      details: {
        userAgent: navigator.userAgent,
        supportedAPIs: requiredAPIs.filter(api => api.available).map(api => api.name),
        unsupportedAPIs: requiredAPIs.filter(api => !api.available).map(api => api.name)
      }
    };
  }

  static checkMemoryUsage(): DiagnosticCheck {
    const issues: string[] = [];

    try {
      // @ts-ignore
      const memory = performance.memory;
      const usedPercent = memory.usedJSHeapSize / memory.totalJSHeapSize;

      if (usedPercent > 0.9) {
        issues.push(`High memory usage: ${(usedPercent * 100).toFixed(1)}%`);
      }

      return {
        name: 'Memory Usage',
        status: issues.length === 0 ? 'pass' : 'warn',
        issues,
        details: {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          percentage: usedPercent
        }
      };
    } catch (error) {
      return {
        name: 'Memory Usage',
        status: 'unknown',
        issues: ['Unable to check memory usage'],
        details: { error: error.message }
      };
    }
  }

  static async checkServiceAvailability(): Promise<DiagnosticCheck> {
    const issues: string[] = [];

    // Check if services are initialized
    const services = [
      { name: 'Chat Service', check: () => !!(window as any).chatService },
      { name: 'Document Service', check: () => !!(window as any).documentService },
      { name: 'Image Service', check: () => !!(window as any).imageService }
    ];

    services.forEach(service => {
      if (!service.check()) {
        issues.push(`${service.name} is not initialized`);
      }
    });

    return {
      name: 'Service Availability',
      status: issues.length === 0 ? 'pass' : 'fail',
      issues
    };
  }

  private static async testEndpoint(url: string): Promise<void> {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
      signal: AbortSignal.timeout(3000)
    });

    if (!response.ok && response.type !== 'opaque') {
      throw new Error(`HTTP ${response.status}`);
    }
  }
}

interface DiagnosticCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'unknown';
  issues: string[];
  details?: Record<string, any>;
}

interface DiagnosticResult {
  timestamp: string;
  overallHealth: 'healthy' | 'unhealthy';
  checks: DiagnosticCheck[];
}
```

### Diagnostic Component

```typescript
// src/components/DiagnosticsPanel.tsx
import React, { useState } from 'react';
import { Diagnostics } from '../utils/diagnostics';
import { useTranslation } from '../hooks/useTranslation';

export const DiagnosticsPanel: React.FC = () => {
  const [results, setResults] = useState<DiagnosticResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const { t } = useTranslation('diagnostics');

  const runDiagnostics = async () => {
    setIsRunning(true);
    try {
      const diagnosticResults = await Diagnostics.runFullCheck();
      setResults(diagnosticResults);
    } catch (error) {
      console.error('Diagnostics failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="diagnostics-panel">
      <h2>{t('title')}</h2>

      <button
        onClick={runDiagnostics}
        disabled={isRunning}
        className="run-diagnostics-btn"
      >
        {isRunning ? t('running') : t('run_diagnostics')}
      </button>

      {results && (
        <div className="diagnostic-results">
          <div className={`health-status ${results.overallHealth}`}>
            <h3>{t('overall_health')}: {results.overallHealth}</h3>
            <span className="timestamp">{results.timestamp}</span>
          </div>

          <div className="checks-list">
            {results.checks.map((check, index) => (
              <div key={index} className={`check-item ${check.status}`}>
                <div className="check-header">
                  <h4>{check.name}</h4>
                  <span className={`status-badge ${check.status}`}>
                    {check.status.toUpperCase()}
                  </span>
                </div>

                {check.issues.length > 0 && (
                  <ul className="issues-list">
                    {check.issues.map((issue, i) => (
                      <li key={i} className="issue-item">{issue}</li>
                    ))}
                  </ul>
                )}

                {check.details && (
                  <details className="check-details">
                    <summary>{t('details')}</summary>
                    <pre>{JSON.stringify(check.details, null, 2)}</pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

## Common Issues and Solutions

### Chat Issues

#### "Failed to send message" Error

**Symptoms:**
- Messages fail to send
- Error message: "Failed to send message"
- Chat interface becomes unresponsive

**Possible Causes:**
1. Network connectivity issues
2. API key configuration problems
3. Gemini API service outage
4. Rate limiting
5. Invalid message format

**Solutions:**

```typescript
// src/utils/chatTroubleshooting.ts
export class ChatTroubleshooting {
  static async diagnoseChatFailure(error: Error, context: any): Promise<TroubleshootingResult> {
    const diagnostics = [];

    // Check network connectivity
    try {
      await fetch('https://generativelanguage.googleapis.com/v1/models', {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      diagnostics.push({ check: 'Network connectivity', status: 'pass' });
    } catch {
      diagnostics.push({
        check: 'Network connectivity',
        status: 'fail',
        solution: 'Check your internet connection and try again'
      });
    }

    // Check API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      diagnostics.push({
        check: 'API key configuration',
        status: 'fail',
        solution: 'Configure your GEMINI_API_KEY in environment variables'
      });
    } else if (!apiKey.startsWith('AIza')) {
      diagnostics.push({
        check: 'API key format',
        status: 'fail',
        solution: 'Ensure GEMINI_API_KEY starts with "AIza"'
      });
    } else {
      diagnostics.push({ check: 'API key configuration', status: 'pass' });
    }

    // Check rate limiting
    if (error.message.includes('rate limit') || error.message.includes('quota')) {
      diagnostics.push({
        check: 'Rate limiting',
        status: 'fail',
        solution: 'Wait a few minutes before sending more messages, or upgrade your API plan'
      });
    }

    // Check message format
    if (context?.message?.length > 10000) {
      diagnostics.push({
        check: 'Message length',
        status: 'fail',
        solution: 'Break your message into smaller parts (max 10,000 characters)'
      });
    }

    return {
      issue: 'Chat message failure',
      diagnostics,
      recommendations: this.generateRecommendations(diagnostics)
    };
  }

  private static generateRecommendations(diagnostics: any[]): string[] {
    const recommendations = [];

    const failedChecks = diagnostics.filter(d => d.status === 'fail');

    if (failedChecks.some(d => d.check === 'Network connectivity')) {
      recommendations.push('1. Check your internet connection');
      recommendations.push('2. Try disabling VPN or proxy if active');
      recommendations.push('3. Restart your router/modem');
    }

    if (failedChecks.some(d => d.check.includes('API key'))) {
      recommendations.push('1. Verify GEMINI_API_KEY is set in your environment');
      recommendations.push('2. Check that the API key is valid and not expired');
      recommendations.push('3. Ensure the API key has the necessary permissions');
    }

    if (failedChecks.some(d => d.check === 'Rate limiting')) {
      recommendations.push('1. Wait 1-2 minutes before retrying');
      recommendations.push('2. Consider upgrading your Google AI Studio plan');
      recommendations.push('3. Implement message queuing for high-volume usage');
    }

    return recommendations;
  }
}

interface TroubleshootingResult {
  issue: string;
  diagnostics: Array<{
    check: string;
    status: 'pass' | 'fail';
    solution?: string;
  }>;
  recommendations: string[];
}
```

#### "AI responses are slow or timeout"

**Symptoms:**
- Long wait times for AI responses
- Timeout errors
- Unresponsive chat interface

**Solutions:**
1. Check network speed and stability
2. Verify API quota and rate limits
3. Switch to offline mode if Gemini API is slow
4. Clear browser cache and cookies
5. Check for background processes consuming bandwidth

### Document Processing Issues

#### "Failed to process document" Error

**Symptoms:**
- Document upload fails
- Error message: "Failed to process document"
- Unsupported file format errors

**Possible Causes:**
1. Unsupported file format
2. File size too large
3. Corrupted file
4. PDF.js or Mammoth.js library issues
5. Memory constraints

**Solutions:**

```typescript
// src/utils/documentTroubleshooting.ts
export class DocumentTroubleshooting {
  static diagnoseDocumentFailure(file: File, error: Error): TroubleshootingResult {
    const diagnostics = [];
    const recommendations = [];

    // Check file size
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      diagnostics.push({
        check: 'File size',
        status: 'fail',
        solution: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed size (10MB)`
      });
      recommendations.push('Reduce file size by compressing or splitting the document');
    } else {
      diagnostics.push({ check: 'File size', status: 'pass' });
    }

    // Check file type
    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/msword'
    ];

    if (!supportedTypes.includes(file.type)) {
      diagnostics.push({
        check: 'File type',
        status: 'fail',
        solution: `Unsupported file type: ${file.type}`
      });
      recommendations.push('Convert to supported format: PDF, DOCX, DOC, or TXT');
    } else {
      diagnostics.push({ check: 'File type', status: 'pass' });
    }

    // Check file corruption
    if (error.message.includes('corrupt') || error.message.includes('invalid')) {
      diagnostics.push({
        check: 'File integrity',
        status: 'fail',
        solution: 'File appears to be corrupted or invalid'
      });
      recommendations.push('Try repairing the file or using a different copy');
    }

    // Check memory usage
    try {
      // @ts-ignore
      const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize;
      if (memoryUsage > 0.8) {
        diagnostics.push({
          check: 'Memory usage',
          status: 'warn',
          solution: 'High memory usage may affect document processing'
        });
        recommendations.push('Close other browser tabs and try again');
      }
    } catch {
      // Memory API not available
    }

    return {
      issue: 'Document processing failure',
      diagnostics,
      recommendations
    };
  }
}
```

### Image Generation Issues

#### "Failed to generate image" Error

**Symptoms:**
- Image generation fails
- Error message: "Failed to generate image"
- Blank or corrupted image output

**Solutions:**
1. Check prompt length and content
2. Verify API key configuration
3. Check quota limits
4. Ensure stable network connection
5. Try different prompt wording

### Voice and Speech Issues

#### "Microphone access denied" Error

**Symptoms:**
- Voice input doesn't work
- Error message: "Microphone access denied"
- Speech recognition fails to start

**Solutions:**
1. Grant microphone permissions in browser
2. Check microphone hardware
3. Verify HTTPS connection (required for microphone access)
4. Restart browser and try again

#### "Speech synthesis not working" Error

**Symptoms:**
- Text-to-speech doesn't produce audio
- No sound output
- TTS settings not saving

**Solutions:**
1. Check browser TTS support
2. Verify audio output device
3. Adjust TTS settings (voice, rate, pitch)
4. Clear browser cache

### Storage and Data Issues

#### "Failed to save data" Error

**Symptoms:**
- Settings not saving
- Chat history lost
- Error message: "Failed to save data"

**Solutions:**
1. Check browser storage quota
2. Clear browser data for the app
3. Verify IndexedDB support
4. Check for browser extensions blocking storage

### Performance Issues

#### "Application is slow or unresponsive"

**Symptoms:**
- Slow UI response times
- High CPU/memory usage
- Freezing or crashing

**Solutions:**
1. Clear browser cache and cookies
2. Close unnecessary browser tabs
3. Update browser to latest version
4. Check for browser extensions causing issues
5. Restart the application

### Network and Connectivity Issues

#### "Connection timeout" Errors

**Symptoms:**
- API calls timing out
- "Connection timeout" errors
- Intermittent connectivity issues

**Solutions:**
1. Check internet connection speed
2. Try different network (WiFi vs cellular)
3. Disable VPN or proxy temporarily
4. Check firewall/antivirus settings
5. Contact network administrator

## Error Codes and Meanings

### API Error Codes

```typescript
// src/constants/errorCodes.ts
export const ERROR_CODES = {
  // Network errors
  NETWORK_TIMEOUT: 'NET_001',
  NETWORK_OFFLINE: 'NET_002',
  NETWORK_CORS: 'NET_003',

  // API errors
  API_INVALID_KEY: 'API_001',
  API_QUOTA_EXCEEDED: 'API_002',
  API_RATE_LIMITED: 'API_003',
  API_SERVICE_UNAVAILABLE: 'API_004',
  API_INVALID_REQUEST: 'API_005',

  // Authentication errors
  AUTH_INVALID_TOKEN: 'AUTH_001',
  AUTH_EXPIRED_TOKEN: 'AUTH_002',
  AUTH_MISSING_PERMISSIONS: 'AUTH_003',

  // File processing errors
  FILE_TOO_LARGE: 'FILE_001',
  FILE_INVALID_FORMAT: 'FILE_002',
  FILE_CORRUPTED: 'FILE_003',
  FILE_PROCESSING_FAILED: 'FILE_004',

  // Storage errors
  STORAGE_QUOTA_EXCEEDED: 'STOR_001',
  STORAGE_NOT_AVAILABLE: 'STOR_002',
  STORAGE_WRITE_FAILED: 'STOR_003',

  // Application errors
  APP_INITIALIZATION_FAILED: 'APP_001',
  APP_MEMORY_LIMIT_EXCEEDED: 'APP_002',
  APP_CRASH: 'APP_003'
} as const;

export const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.NETWORK_TIMEOUT]: 'Request timed out. Please check your internet connection and try again.',
  [ERROR_CODES.NETWORK_OFFLINE]: 'You appear to be offline. Please check your internet connection.',
  [ERROR_CODES.API_INVALID_KEY]: 'Invalid API key. Please check your configuration.',
  [ERROR_CODES.API_QUOTA_EXCEEDED]: 'API quota exceeded. Please try again later or upgrade your plan.',
  [ERROR_CODES.FILE_TOO_LARGE]: 'File is too large. Please choose a smaller file.',
  [ERROR_CODES.FILE_INVALID_FORMAT]: 'Unsupported file format. Please use PDF, DOCX, DOC, or TXT files.',
  // ... more error messages
};
```

## Advanced Troubleshooting

### Debug Mode

```typescript
// src/utils/debugMode.ts
export class DebugMode {
  private static enabled = false;
  private static logs: DebugLog[] = [];

  static enable(): void {
    this.enabled = true;
    console.log('🔧 Debug mode enabled');

    // Override console methods to capture logs
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      this.captureLog('log', args);
      originalLog(...args);
    };

    console.error = (...args) => {
      this.captureLog('error', args);
      originalError(...args);
    };

    console.warn = (...args) => {
      this.captureLog('warn', args);
      originalWarn(...args);
    };
  }

  static disable(): void {
    this.enabled = false;
    console.log('🔧 Debug mode disabled');
  }

  private static captureLog(level: string, args: any[]): void {
    if (!this.enabled) return;

    const log: DebugLog = {
      timestamp: new Date().toISOString(),
      level,
      message: args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '),
      stack: level === 'error' ? new Error().stack : undefined
    };

    this.logs.push(log);

    // Keep only last 100 logs
    if (this.logs.length > 100) {
      this.logs.shift();
    }
  }

  static getLogs(): DebugLog[] {
    return [...this.logs];
  }

  static exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  static clearLogs(): void {
    this.logs = [];
  }
}

interface DebugLog {
  timestamp: string;
  level: string;
  message: string;
  stack?: string;
}
```

### Performance Profiling

```typescript
// src/utils/performanceProfiler.ts
export class PerformanceProfiler {
  private static marks: Map<string, number> = new Map();
  private static measures: PerformanceMeasure[] = [];

  static startMark(name: string): void {
    const startTime = performance.now();
    this.marks.set(name, startTime);
    performance.mark(`${name}-start`);
  }

  static endMark(name: string): number {
    const startTime = this.marks.get(name);
    if (!startTime) {
      console.warn(`Performance mark '${name}' not found`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);

    this.marks.delete(name);

    return duration;
  }

  static measureFunction<T>(name: string, fn: () => T): T {
    this.startMark(name);
    try {
      const result = fn();
      this.endMark(name);
      return result;
    } catch (error) {
      this.endMark(name);
      throw error;
    }
  }

  static async measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startMark(name);
    try {
      const result = await fn();
      this.endMark(name);
      return result;
    } catch (error) {
      this.endMark(name);
      throw error;
    }
  }

  static getPerformanceReport(): PerformanceReport {
    const measures = performance.getEntriesByType('measure');

    return {
      timestamp: new Date().toISOString(),
      measures: measures.map(measure => ({
        name: measure.name,
        duration: measure.duration,
        startTime: measure.startTime,
        endTime: measure.startTime + measure.duration
      })),
      memory: this.getMemoryInfo(),
      navigation: this.getNavigationInfo()
    };
  }

  private static getMemoryInfo(): MemoryInfo | null {
    try {
      // @ts-ignore
      return performance.memory;
    } catch {
      return null;
    }
  }

  private static getNavigationInfo(): NavigationInfo {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    return {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
      tcpConnect: navigation.connectEnd - navigation.connectStart,
      serverResponse: navigation.responseEnd - navigation.requestStart
    };
  }

  static clearMarks(): void {
    this.marks.clear();
    performance.clearMarks();
    performance.clearMeasures();
  }
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface NavigationInfo {
  domContentLoaded: number;
  loadComplete: number;
  dnsLookup: number;
  tcpConnect: number;
  serverResponse: number;
}

interface PerformanceReport {
  timestamp: string;
  measures: Array<{
    name: string;
    duration: number;
    startTime: number;
    endTime: number;
  }>;
  memory: MemoryInfo | null;
  navigation: NavigationInfo;
}
```

## Getting Help

### Support Resources

1. **Documentation**: Check this troubleshooting guide first
2. **GitHub Issues**: Search existing issues or create a new one
3. **Community Forum**: Ask questions in the community discussions
4. **Diagnostic Report**: Run diagnostics and include the report with your issue

### Creating a Support Ticket

When creating a support ticket, please include:

1. **Diagnostic Report**: Run the full diagnostics and include the output
2. **Steps to Reproduce**: Detailed steps to reproduce the issue
3. **Environment Information**:
   - Operating system and version
   - Browser type and version (for web version)
   - A.N.S.H.I.K.A. version
   - Node.js version (for Electron version)
4. **Error Messages**: Exact error messages and stack traces
5. **Performance Data**: If applicable, include performance profiling data
6. **Configuration**: Relevant configuration settings (without sensitive data)

### Emergency Contacts

- **Critical Issues**: For complete application failure or data loss
- **Security Issues**: For security vulnerabilities or breaches
- **Performance Issues**: For severe performance degradation affecting usability

---

*Last updated: October 30, 2025*</content>
<parameter name="filePath">c:\Users\Aarnav\Desktop\Anshika\docs\troubleshooting.md