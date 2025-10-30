# Architecture Documentation

## System Overview

A.N.S.H.I.K.A. follows a modern React architecture with modular design, emphasizing separation of concerns, reusability, and maintainability. The application is built as a single-page application (SPA) with support for both web and desktop deployment.

## Core Architecture Principles

### 1. Component-Based Architecture
- **Atomic Design**: Components are organized in hierarchical layers (atoms, molecules, organisms)
- **Composition over Inheritance**: Components are composed rather than extended
- **Single Responsibility**: Each component has one clear purpose

### 2. State Management
- **Context + Hooks**: React Context for global state, custom hooks for local state
- **Immutable Updates**: All state mutations follow immutable patterns
- **Selective Re-renders**: Optimized rendering through proper dependency arrays

### 3. Service Layer Architecture
- **Separation of Concerns**: Business logic separated from UI components
- **Dependency Injection**: Services injected through React Context
- **Error Boundaries**: Comprehensive error handling at service and component levels

## Application Structure

```
src/
├── components/          # UI Components
│   ├── ui/             # Reusable UI primitives
│   ├── ImageGeneration/# Feature-specific components
│   └── ...             # Other feature components
├── contexts/           # React Context providers
├── hooks/              # Custom React hooks
├── services/           # Business logic services
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── config/             # Configuration files
└── main.tsx           # Application entry point
```

## Component Architecture

### Component Hierarchy

```
App (Root)
├── ThemeProvider
├── ChatProvider
├── ToastProvider
├── TTSProvider
├── SpeechRecognitionProvider
│
├── LeftSidebar (Navigation)
├── Main Content Area
│   ├── BreadcrumbNavigation
│   ├── Header
│   │   ├── Mode Controls
│   │   ├── Model Selector
│   │   └── Status Indicators
│   └── Tab Content
│       ├── ChatInterface
│       ├── DocumentWorkspace
│       └── ImageGenerationPanel
│
├── Modal Overlays
│   ├── KeyboardShortcutsModal
│   ├── TypographySettings
│   ├── VoiceSettingsPanel
│   └── ApiKeysPanel
```

### Component Patterns

#### 1. Container/Presentational Pattern
- **Containers**: Handle data fetching, state management, business logic
- **Presentational**: Focus on UI rendering, receive data via props

#### 2. Compound Components
- Related components grouped together with shared state
- Example: `ImageGenerationPanel` with sub-components

#### 3. Render Props / Children as Functions
- Used for flexible component composition
- Example: `PullToRefresh` component

#### 4. Higher-Order Components (HOCs)
- Used sparingly for cross-cutting concerns
- Example: Error boundaries, authentication wrappers

## State Management Architecture

### Global State Structure

```typescript
// Chat State
interface ChatState {
  messages: Message[];
  isLoading: boolean;
  currentMode: 'online' | 'offline';
  selectedModel: string;
  availableModels: string[];
  onlineTemperature: number;
  offlineTemperature: number;
  webSearchEnabled: boolean;
  voiceEnabled: boolean;
}

// Theme State
interface ThemeState {
  mode: 'light' | 'dark' | 'cosmic';
  primaryColor: string;
  fontSize: 'small' | 'medium' | 'large';
}

// TTS State
interface TTSState {
  isSpeaking: boolean;
  currentVoice: string;
  availableVoices: string[];
  rate: number;
  pitch: number;
  volume: number;
}
```

### Context Providers

1. **ChatProvider**: Manages conversation state, messages, AI model settings
2. **ThemeProvider**: Handles theme switching, color schemes, typography
3. **ToastProvider**: Manages notification system
4. **TTSProvider**: Controls text-to-speech functionality
5. **SpeechRecognitionProvider**: Handles speech-to-text input

### State Flow

```
User Interaction
    ↓
Component Event
    ↓
Context Action
    ↓
State Update
    ↓
Re-render
    ↓
UI Update
```

## Service Layer Architecture

### Service Categories

#### 1. AI Services
- **GeminiService**: Online AI interactions with Google Gemini
- **OllamaService**: Offline AI interactions with local models
- **PersonalityPromptGenerator**: Dynamic personality adaptation

#### 2. Document Services
- **DocumentAnalyzer**: AI-powered document analysis
- **DocumentComparisonService**: Compare multiple documents
- **DocumentSearchService**: Full-text search across documents

#### 3. Image Services
- **GeminiImageService**: AI image generation
- **ImageStorageService**: Image persistence and management
- **ImageExportService**: Export images in various formats

#### 4. Utility Services
- **WeatherService**: Weather information retrieval
- **WebSearchService**: Web search functionality
- **TaskService**: Task management operations

### Service Dependencies

```typescript
// Service injection pattern
const services = {
  gemini: GeminiService,
  ollama: OllamaService,
  documentAnalyzer: DocumentAnalyzer,
  imageGenerator: ImageGenerator,
  // ... other services
};
```

## Data Flow Architecture

### Unidirectional Data Flow

```
User Input
    ↓
Event Handler
    ↓
Action Creator
    ↓
State Update
    ↓
Selector
    ↓
Component Props
    ↓
Render
```

### Data Persistence

#### 1. Local Storage
- User preferences
- Theme settings
- API keys (encrypted)

#### 2. IndexedDB
- Chat history
- Document storage
- Image gallery
- Task data

#### 3. File System (Electron)
- Large file storage
- Export data
- Cache files

## API Integration Architecture

### External API Structure

```typescript
// API Client Pattern
class ApiClient {
  private baseUrl: string;
  private apiKey: string;

  async request(endpoint: string, options: RequestOptions): Promise<Response> {
    // Authentication, retry logic, error handling
  }
}

// Service-specific clients
const geminiClient = new GeminiClient();
const weatherClient = new WeatherClient();
const searchClient = new SearchClient();
```

### Error Handling

#### 1. Network Errors
- Automatic retry with exponential backoff
- Offline mode fallback
- User-friendly error messages

#### 2. API Errors
- Rate limiting handling
- Authentication error recovery
- Service degradation graceful handling

## Performance Architecture

### Optimization Strategies

#### 1. Code Splitting
- Route-based splitting
- Component lazy loading
- Vendor chunk separation

#### 2. Memoization
- React.memo for components
- useMemo for expensive calculations
- useCallback for event handlers

#### 3. Virtual Scrolling
- Large list virtualization
- Document viewer optimization
- Image gallery lazy loading

### Bundle Analysis

```javascript
// Vite bundle analyzer
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
    }),
  ],
});
```

## Security Architecture

### Data Protection

#### 1. API Key Management
- Encrypted local storage
- Secure key rotation
- Environment variable fallback

#### 2. Content Security
- Input sanitization
- XSS prevention
- File upload validation

#### 3. Network Security
- HTTPS enforcement
- CORS configuration
- Request signing

## Testing Architecture

### Testing Pyramid

```
End-to-End Tests (E2E)
    ↓
Integration Tests
    ↓
Unit Tests
```

### Test Categories

#### 1. Unit Tests
- Component rendering
- Hook logic
- Utility functions
- Service methods

#### 2. Integration Tests
- Component interactions
- API integrations
- State management

#### 3. E2E Tests
- User workflows
- Cross-browser compatibility
- Performance validation

## Deployment Architecture

### Build Pipeline

```yaml
# CI/CD Pipeline
stages:
  - test
  - build
  - deploy

# Build outputs
dist/
├── web/          # Web deployment
├── electron/     # Desktop deployment
└── mobile/       # Future mobile builds
```

### Environment Configuration

```typescript
// Environment-specific config
const config = {
  development: {
    apiUrl: 'http://localhost:3000',
    debug: true,
  },
  production: {
    apiUrl: 'https://api.anshika.ai',
    debug: false,
  },
};
```

## Monitoring and Observability

### Logging Strategy

```typescript
// Structured logging
const logger = {
  info: (message: string, context?: object) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      context,
      timestamp: new Date().toISOString(),
    }));
  },
  error: (error: Error, context?: object) => {
    console.error(JSON.stringify({
      level: 'error',
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    }));
  },
};
```

### Performance Monitoring

- **Core Web Vitals**: LCP, FID, CLS tracking
- **Bundle Size**: Automatic bundle analysis
- **Memory Usage**: Heap monitoring in production
- **Error Tracking**: Sentry integration for error reporting

## Scalability Considerations

### Horizontal Scaling
- Stateless service design
- CDN for static assets
- API rate limiting
- Database connection pooling

### Vertical Scaling
- Memory optimization
- CPU-intensive task offloading
- Caching strategies
- Lazy loading implementation

## Future Architecture Evolution

### Planned Improvements

1. **Microservices Migration**: Break down monolithic services
2. **GraphQL API**: Replace REST with GraphQL for flexible data fetching
3. **Real-time Features**: WebSocket integration for live collaboration
4. **Progressive Web App**: Service worker implementation
5. **Multi-tenant Support**: Organization-based isolation
6. **Plugin System**: Extensible architecture for third-party integrations

---

*Last updated: October 30, 2025*</content>
<parameter name="filePath">c:\Users\Aarnav\Desktop\Anshika\docs\architecture.md