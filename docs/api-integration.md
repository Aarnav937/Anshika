# API Integration Documentation

## External API Services

A.N.S.H.I.K.A. integrates with multiple external APIs to provide comprehensive AI capabilities, real-time data, and enhanced user experiences.

## Google Gemini API

### Overview
Google Gemini 2.0 Flash provides the core AI intelligence for online mode conversations.

### Configuration
```typescript
// Environment variables
VITE_GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash-exp
```

### Key Features
- **Multimodal Processing**: Text, images, and documents
- **Function Calling**: Tool integration and API calls
- **Context Window**: Large context for complex conversations
- **Real-time Responses**: Low-latency text generation

### API Endpoints
```typescript
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Text generation
POST /models/gemini-2.0-flash-exp:generateContent

// File upload
POST /files

// File processing
GET /files/{fileId}
```

### Error Handling
```typescript
// Common error codes
const ERROR_CODES = {
  400: 'Bad Request - Invalid parameters',
  403: 'Forbidden - API key issues',
  429: 'Rate Limited - Too many requests',
  503: 'Service Unavailable - Temporary outage'
};
```

### Rate Limits
- **Free Tier**: 60 requests per minute
- **Paid Tier**: Higher limits based on billing
- **File Upload**: 10 files per minute
- **Context Length**: 1M tokens per request

## Ollama API (Local)

### Overview
Ollama provides offline AI capabilities through locally-hosted models.

### Configuration
```typescript
// Default Ollama server
OLLAMA_BASE_URL=http://localhost:11434

// Supported models
const AVAILABLE_MODELS = [
  'gemma3:4b',
  'llama2',
  'mistral',
  'codellama',
  'vicuna'
];
```

### API Endpoints
```typescript
// Generate text
POST /api/generate

// List models
GET /api/tags

// Model info
POST /api/show

// Embeddings
POST /api/embeddings
```

### Model Management
```typescript
// Pull a model
ollama pull gemma3:4b

// List local models
ollama list

// Remove a model
ollama rm gemma3:4b
```

## Weather API

### Overview
WeatherAPI.com provides real-time weather data and forecasts.

### Configuration
```typescript
VITE_WEATHERAPI_KEY=your_weather_api_key_here
WEATHER_API_BASE=https://api.weatherapi.com/v1
```

### Endpoints
```typescript
// Current weather
GET /current.json?key={key}&q={location}

// Weather forecast
GET /forecast.json?key={key}&q={location}&days=7

// Historical weather
GET /history.json?key={key}&q={location}&dt={date}
```

### Data Structure
```typescript
interface WeatherData {
  location: {
    name: string;
    country: string;
    lat: number;
    lon: number;
  };
  current: {
    temp_c: number;
    temp_f: number;
    condition: {
      text: string;
      icon: string;
    };
    humidity: number;
    wind_kph: number;
  };
  forecast?: {
    forecastday: Array<{
      date: string;
      day: {
        maxtemp_c: number;
        mintemp_c: number;
        condition: {
          text: string;
          icon: string;
        };
      };
    }>;
  };
}
```

## Google Search API

### Overview
Google Custom Search API enables web search capabilities.

### Configuration
```typescript
VITE_GOOGLE_SEARCH_API_KEY=your_search_api_key_here
VITE_GOOGLE_SEARCH_ENGINE_ID=your_custom_search_engine_id
```

### Endpoints
```typescript
// Custom search
GET https://www.googleapis.com/customsearch/v1?key={key}&cx={cx}&q={query}
```

### Search Parameters
```typescript
interface SearchParams {
  q: string;              // Search query
  num?: number;           // Number of results (1-10)
  start?: number;         // Start index for pagination
  safe?: 'high' | 'medium' | 'off';  // Safe search level
  lr?: string;            // Language restrict
  sort?: string;          // Sort by date/relevance
}
```

## File Processing APIs

### PDF.js
```typescript
// PDF text extraction
const pdfjsLib = await import('pdfjs-dist');

// Load PDF document
const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

// Extract text from all pages
for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  const textContent = await page.getTextContent();
  const text = textContent.items.map(item => item.str).join(' ');
}
```

### Mammoth.js (DOCX)
```typescript
import * as mammoth from 'mammoth';

// Convert DOCX to HTML/text
const result = await mammoth.convertToHtml({ arrayBuffer });
const html = result.value;
const text = await mammoth.extractRawText({ arrayBuffer });
```

### File Type Detection
```typescript
import { fileTypeFromBuffer } from 'file-type';

// Detect file type
const fileType = await fileTypeFromBuffer(buffer);
console.log(fileType?.mime); // 'application/pdf'
```

## Image Processing APIs

### Gemini Image Generation
```typescript
// Image generation request
const request = {
  contents: [{
    parts: [{
      text: "A beautiful sunset over mountains"
    }]
  }],
  generationConfig: {
    responseModalities: ["image"]
  }
};

// API call
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  }
);
```

### Image Storage & Processing
```typescript
// Canvas API for image manipulation
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

// Resize image
canvas.width = newWidth;
canvas.height = newHeight;
ctx.drawImage(img, 0, 0, newWidth, newHeight);
```

## Speech & Audio APIs

### Web Speech API (Browser)
```typescript
// Speech Recognition
const recognition = new webkitSpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = 'en-US';

recognition.onresult = (event) => {
  const transcript = event.results[event.results.length - 1][0].transcript;
  // Process transcript
};

// Speech Synthesis
const synth = window.speechSynthesis;
const utterance = new SpeechSynthesisUtterance(text);
utterance.voice = voices.find(voice => voice.name === 'Google US English');
utterance.rate = 1.0;
utterance.pitch = 1.0;

synth.speak(utterance);
```

### TTS Service Integration
```typescript
// Google Text-to-Speech API
const ttsRequest = {
  input: { text },
  voice: {
    languageCode: 'en-US',
    name: 'en-US-Neural2-D'
  },
  audioConfig: {
    audioEncoding: 'MP3',
    speakingRate: 1.0
  }
};
```

## Database & Storage APIs

### IndexedDB (Dexie)
```typescript
import Dexie from 'dexie';

// Database schema
class AnshikaDB extends Dexie {
  conversations!: Table<Conversation>;
  documents!: Table<Document>;
  tasks!: Table<Task>;

  constructor() {
    super('AnshikaDB');
    this.version(1).stores({
      conversations: '++id, title, createdAt, updatedAt',
      documents: '++id, name, type, size, uploadedAt',
      tasks: '++id, title, status, priority, dueDate'
    });
  }
}

const db = new AnshikaDB();
```

### Local Storage API
```typescript
// Secure storage wrapper
class SecureStorage {
  async setApiKey(key: string, value: string): Promise<void> {
    const encrypted = await this.encrypt(value);
    localStorage.setItem(key, encrypted);
  }

  async getApiKey(key: string): Promise<string | null> {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    return await this.decrypt(encrypted);
  }
}
```

## Real-time Communication APIs

### WebSocket Integration
```typescript
// Real-time updates for collaborative features
class WebSocketManager {
  private ws: WebSocket | null = null;

  connect(url: string): void {
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onclose = () => {
      // Reconnection logic
      setTimeout(() => this.connect(url), 1000);
    };
  }

  sendMessage(type: string, payload: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }
}
```

## Authentication & Security APIs

### OAuth Integration
```typescript
// Google OAuth for enhanced features
const oauthConfig = {
  clientId: 'your_google_client_id',
  scopes: [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/gmail.readonly'
  ],
  redirectUri: window.location.origin + '/oauth/callback'
};
```

### API Key Management
```typescript
// Encrypted API key storage
interface ApiKeyConfig {
  gemini: string;
  weather: string;
  search: string;
  // ... other keys
}

class ApiKeyManager {
  private encryptionKey: string;

  constructor() {
    this.encryptionKey = this.generateEncryptionKey();
  }

  async storeKeys(config: ApiKeyConfig): Promise<void> {
    const encrypted = await this.encrypt(JSON.stringify(config));
    localStorage.setItem('api_keys', encrypted);
  }

  async loadKeys(): Promise<ApiKeyConfig | null> {
    const encrypted = localStorage.getItem('api_keys');
    if (!encrypted) return null;

    const decrypted = await this.decrypt(encrypted);
    return JSON.parse(decrypted);
  }
}
```

## Error Handling & Monitoring APIs

### Error Reporting
```typescript
// Sentry integration for error tracking
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'your_sentry_dsn',
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0
});
```

### Performance Monitoring
```typescript
// Web Vitals tracking
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

## Third-party Service Integrations

### Analytics
```typescript
// Google Analytics 4
gtag('config', 'GA_MEASUREMENT_ID', {
  custom_map: {
    'custom_parameter_1': 'value1'
  }
});

// Mixpanel for product analytics
mixpanel.init('your_project_token', {
  debug: process.env.NODE_ENV === 'development'
});
```

### CDN & Asset Delivery
```typescript
// Cloudinary for image optimization
const cloudinaryConfig = {
  cloud_name: 'your_cloud_name',
  api_key: 'your_api_key',
  api_secret: 'your_api_secret'
};

// Upload and transform images
const imageUrl = `https://res.cloudinary.com/${cloud_name}/image/upload/w_300,h_300,c_fill/${publicId}`;
```

## API Rate Limiting & Caching

### Rate Limiting Implementation
```typescript
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  canMakeRequest(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;

    const requestTimes = this.requests.get(key) || [];
    const recentRequests = requestTimes.filter(time => time > windowStart);

    if (recentRequests.length >= limit) {
      return false;
    }

    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    return true;
  }
}
```

### Response Caching
```typescript
class ApiCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  get(key: string, ttlMs: number): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}
```

## Environment-Specific Configurations

### Development Environment
```typescript
const devConfig = {
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    timeout: 30000,
    retries: 3
  },
  ollama: {
    baseUrl: 'http://localhost:11434',
    timeout: 60000
  },
  logging: {
    level: 'debug',
    remote: false
  }
};
```

### Production Environment
```typescript
const prodConfig = {
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    timeout: 15000,
    retries: 2
  },
  ollama: {
    baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    timeout: 30000
  },
  logging: {
    level: 'warn',
    remote: true
  }
};
```

---

*Last updated: October 30, 2025*</content>
<parameter name="filePath">c:\Users\Aarnav\Desktop\Anshika\docs\api-integration.md