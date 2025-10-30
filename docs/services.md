# Services Documentation

## Service Architecture

A.N.S.H.I.K.A. uses a layered service architecture that separates business logic from UI components, providing clean APIs for data management, external integrations, and core functionality.

## AI Services

### GeminiService

Primary service for Google Gemini AI interactions in online mode.

#### Core Methods

```typescript
class GeminiService {
  // Send message to Gemini AI
  static async sendMessage(
    message: string,
    addMessage: (msg: Message) => void,
    updateMessage: (content: string) => void,
    temperature: number,
    webSearchEnabled: boolean,
    signal?: AbortSignal
  ): Promise<void>

  // Upload file for processing
  static async uploadFile(
    file: File,
    displayName?: string,
    onProgress?: (progress: number) => void
  ): Promise<GeminiFileUploadResult>

  // Generate content with file context
  static async generateWithFileContext(
    prompt: string,
    fileUri: string,
    temperature?: number,
    maxTokens?: number
  ): Promise<string>

  // Test model availability
  static async testModel(modelName: string): Promise<boolean>
}
```

#### Personality System

```typescript
interface PersonalityConfig {
  currentMode: 'professional' | 'casual' | 'support' | 'creative';
  relationshipStage: 'acquaintance' | 'friend' | 'close_friend';
  interactionCount: number;
  lastInteraction: Date;
  preferences: {
    humorLevel: number;
    formalityLevel: number;
    empathyLevel: number;
  };
}

// Personality management
export function getPersonalityConfig(): PersonalityConfig;
export function updatePersonalityConfig(config: Partial<PersonalityConfig>): void;
export function resetPersonalityConfig(): void;
```

#### Context Detection

```typescript
interface ContextResult {
  mode: PersonalityMode;
  confidence: number;
  keywords: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
}

// Detect conversation context
export function detectContext(message: string): ContextResult;

// Check if personality should switch
export function shouldSwitchMode(
  currentMode: PersonalityMode,
  detectedMode: PersonalityMode,
  confidence: number
): boolean;
```

### OllamaService

Service for local AI model interactions via Ollama.

#### Core Methods

```typescript
class OllamaService {
  // Check if Ollama is running
  static async checkStatus(): Promise<boolean>;

  // List available models
  static async listModels(): Promise<ModelInfo[]>;

  // Pull a model
  static async pullModel(modelName: string): Promise<void>;

  // Generate text
  static async generate(
    prompt: string,
    model: string,
    options?: GenerateOptions
  ): Promise<GenerateResponse>;

  // Chat with model
  static async chat(
    messages: ChatMessage[],
    model: string,
    options?: ChatOptions
  ): Promise<ChatResponse>;
}
```

#### Model Management

```typescript
interface ModelInfo {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details?: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

// Pre-load common models
export async function preloadCommonModels(): Promise<void>;

// Get model info
export async function getModelInfo(modelName: string): Promise<ModelInfo>;
```

## Document Services

### DocumentAnalyzer

AI-powered document analysis and summarization service.

#### Core Methods

```typescript
class DocumentAnalyzer {
  // Analyze document content
  static async analyzeDocument(params: AnalyzeDocumentParams): Promise<DocumentAnalysis>;

  // Extract text from file
  static async extractText(file: File): Promise<string>;

  // Generate document summary
  static async generateSummary(text: string, maxLength?: number): Promise<string>;

  // Extract key insights
  static async extractInsights(text: string): Promise<string[]>;
}
```

#### Document Processing

```typescript
interface AnalyzeDocumentParams {
  documentId: string;
  documentName: string;
  text: string;
  preview: string;
  chunks: string[];
  wordCount: number;
  pageCount?: number;
  extractionMethod: string;
  language?: string;
}

interface DocumentAnalysis {
  summary: DocumentSummary;
  fullAnalysis: string;
  keyInsights: string[];
  recommendations?: string[];
  confidence: number;
  processingTime: number;
  modelUsed: string;
  analysisDate: Date;
}
```

### DocumentComparisonService

Service for comparing multiple documents.

```typescript
class DocumentComparisonService {
  // Compare two documents
  static async compareDocuments(
    doc1: Document,
    doc2: Document,
    options?: ComparisonOptions
  ): Promise<DocumentComparison>;

  // Find similarities
  static async findSimilarities(
    documents: Document[],
    threshold?: number
  ): Promise<SimilarityResult[]>;

  // Generate comparison report
  static async generateReport(
    comparison: DocumentComparison
  ): Promise<string>;
}
```

### DocumentSearchService

Full-text search and semantic search across documents.

```typescript
class DocumentSearchService {
  // Index document for search
  static async indexDocument(document: Document): Promise<void>;

  // Search documents
  static async search(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]>;

  // Semantic search
  static async semanticSearch(
    query: string,
    documents: Document[]
  ): Promise<SemanticSearchResult[]>;
}
```

## Image Services

### GeminiImageService

AI image generation using Google Gemini.

```typescript
class GeminiImageService {
  // Initialize service
  async initialize(): Promise<void>;

  // Generate image
  async generateImage(
    params: OnlineGenerationParams,
    progressTracker?: ProgressTracker
  ): Promise<GeneratedImage>;

  // Cancel generation
  async cancelGeneration(): Promise<void>;

  // Check service status
  async checkStatus(): Promise<ServiceStatus>;
}
```

### ImageStorageService

Local image storage and management.

```typescript
class ImageStorageService {
  // Save generated image
  static async saveImage(
    image: Blob,
    metadata: ImageMetadata
  ): Promise<string>;

  // Get image by ID
  static async getImage(imageId: string): Promise<Blob>;

  // List user's images
  static async listImages(
    limit?: number,
    offset?: number
  ): Promise<ImageRecord[]>;

  // Delete image
  static async deleteImage(imageId: string): Promise<void>;

  // Search images
  static async searchImages(query: string): Promise<ImageRecord[]>;
}
```

### ImageExportService

Image export and format conversion.

```typescript
class ImageExportService {
  // Export image in different formats
  static async exportImage(
    imageId: string,
    format: ExportFormat,
    options?: ExportOptions
  ): Promise<Blob>;

  // Batch export images
  static async batchExport(
    imageIds: string[],
    format: ExportFormat
  ): Promise<Blob>;

  // Generate image variations
  static async generateVariations(
    imageId: string,
    count: number
  ): Promise<GeneratedImage[]>;
}
```

## Utility Services

### WeatherService

Weather information and forecasting service.

```typescript
class WeatherService {
  // Get current weather
  static async getCurrentWeather(location: string): Promise<WeatherData>;

  // Get weather forecast
  static async getForecast(
    location: string,
    days: number
  ): Promise<ForecastData>;

  // Search locations
  static async searchLocations(query: string): Promise<LocationResult[]>;
}
```

### WebSearchService

Web search functionality with result summarization.

```typescript
class WebSearchService {
  // Perform web search
  static async search(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]>;

  // Get search suggestions
  static async getSuggestions(query: string): Promise<string[]>;

  // Summarize search results
  static async summarizeResults(results: SearchResult[]): Promise<string>;
}
```

### TaskService

Task management and organization service.

```typescript
class TaskService {
  // Create new task
  static async createTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<Task>;

  // Get task by ID
  static async getTask(taskId: string): Promise<Task>;

  // Update task
  static async updateTask(taskId: string, updates: Partial<Task>): Promise<Task>;

  // Delete task
  static async deleteTask(taskId: string): Promise<void>;

  // List tasks with filters
  static async listTasks(filter?: TaskFilter): Promise<Task[]>;

  // Get task statistics
  static async getStats(): Promise<TaskStats>;
}
```

## Speech & Audio Services

### TTSService

Text-to-speech synthesis service.

```typescript
class TTSService {
  // Synthesize speech
  static async synthesize(
    text: string,
    options?: TTSOptions
  ): Promise<AudioBlob>;

  // Get available voices
  static async getVoices(): Promise<Voice[]>;

  // Preload voice
  static async preloadVoice(voiceId: string): Promise<void>;

  // Stop current speech
  static stop(): void;
}
```

### SpeechRecognitionService

Speech-to-text recognition service.

```typescript
class SpeechRecognitionService {
  // Start recognition
  static async startRecognition(
    options?: RecognitionOptions
  ): Promise<RecognitionResult>;

  // Stop recognition
  static stopRecognition(): void;

  // Check browser support
  static isSupported(): boolean;

  // Get available languages
  static getSupportedLanguages(): string[];
}
```

## Storage Services

### SecureStorageService

Encrypted local storage for sensitive data.

```typescript
class SecureStorageService {
  // Store API key securely
  static async setApiKey(key: string, value: string): Promise<void>;

  // Retrieve API key
  static async getApiKey(key: string): Promise<string | null>;

  // Store encrypted data
  static async setEncrypted(key: string, value: any): Promise<void>;

  // Retrieve decrypted data
  static async getDecrypted(key: string): Promise<any | null>;

  // Clear all stored data
  static async clear(): Promise<void>;
}
```

### ConversationStorageService

Persistent storage for chat conversations.

```typescript
class ConversationStorageService {
  // Save conversation
  static async saveConversation(conversation: Conversation): Promise<void>;

  // Load conversation
  static async loadConversation(conversationId: string): Promise<Conversation>;

  // List conversations
  static async listConversations(): Promise<ConversationSummary[]>;

  // Delete conversation
  static async deleteConversation(conversationId: string): Promise<void>;

  // Search conversations
  static async searchConversations(query: string): Promise<ConversationSummary[]>;
}
```

## Tool Management

### ToolManager

Manages available tools and their execution.

```typescript
class ToolManager {
  // Get enabled tools
  static getEnabledTools(webSearchEnabled?: boolean): Tool[];

  // Execute tool
  static async executeTool(toolCall: ToolCall): Promise<ToolResult>;

  // Register custom tool
  static registerTool(tool: Tool): void;

  // Unregister tool
  static unregisterTool(toolName: string): void;
}
```

#### Built-in Tools

```typescript
// Available tools
const AVAILABLE_TOOLS = {
  web_search: {
    name: 'web_search',
    description: 'Search the web for information',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        num_results: { type: 'number', description: 'Number of results to return' }
      },
      required: ['query']
    }
  },

  get_weather: {
    name: 'get_weather',
    description: 'Get current weather for a location',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City or location name' }
      },
      required: ['location']
    }
  },

  get_time: {
    name: 'get_time',
    description: 'Get current time and date',
    parameters: {
      type: 'object',
      properties: {
        timezone: { type: 'string', description: 'Timezone (optional)' }
      }
    }
  },

  create_task: {
    name: 'create_task',
    description: 'Create a new task',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Task description' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        due_date: { type: 'string', description: 'Due date (ISO format)' }
      },
      required: ['title']
    }
  }
};
```

## Error Handling Services

### EnhancedErrorService

Comprehensive error handling and reporting.

```typescript
class EnhancedErrorService {
  // Report error
  static async reportError(
    error: Error,
    context?: ErrorContext
  ): Promise<void>;

  // Get error suggestions
  static getErrorSuggestions(error: Error): ErrorSuggestion[];

  // Log error with context
  static logError(
    level: 'error' | 'warn' | 'info',
    message: string,
    context?: any
  ): void;

  // Handle API errors
  static handleApiError(error: ApiError): UserFriendlyError;
}
```

### LiveConnectionManager

Manages real-time connections and WebSocket communications.

```typescript
class LiveConnectionManager {
  // Connect to real-time service
  static async connect(url: string): Promise<void>;

  // Send message
  static async sendMessage(type: string, payload: any): Promise<void>;

  // Subscribe to events
  static subscribe(
    eventType: string,
    callback: (data: any) => void
  ): () => void;

  // Disconnect
  static disconnect(): void;

  // Check connection status
  static getConnectionStatus(): ConnectionStatus;
}
```

## Configuration Services

### ConfigurationManager

Manages application configuration and settings.

```typescript
class ConfigurationManager {
  // Load configuration
  static async loadConfig(): Promise<AppConfig>;

  // Save configuration
  static async saveConfig(config: AppConfig): Promise<void>;

  // Reset to defaults
  static async resetToDefaults(): Promise<void>;

  // Validate configuration
  static validateConfig(config: AppConfig): ValidationResult;

  // Export configuration
  static exportConfig(): string;

  // Import configuration
  static async importConfig(configJson: string): Promise<void>;
}
```

### HardwareDetectionService

Detects and manages hardware capabilities.

```typescript
class HardwareDetectionService {
  // Detect GPU capabilities
  static async detectGPU(): Promise<GPUCapabilities>;

  // Check memory availability
  static async checkMemory(): Promise<MemoryInfo>;

  // Get system information
  static async getSystemInfo(): Promise<SystemInfo>;

  // Monitor hardware usage
  static startHardwareMonitoring(
    callback: (usage: HardwareUsage) => void
  ): () => void;
}
```

## Service Integration Patterns

### Dependency Injection

```typescript
// Service container
class ServiceContainer {
  private services: Map<string, any> = new Map();

  register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }
    return service;
  }

  has(name: string): boolean {
    return this.services.has(name);
  }
}

// Usage
const container = new ServiceContainer();
container.register('gemini', new GeminiService());
container.register('weather', new WeatherService());

const geminiService = container.get<GeminiService>('gemini');
```

### Service Composition

```typescript
// Composite service pattern
class AIService {
  constructor(
    private geminiService: GeminiService,
    private ollamaService: OllamaService,
    private personalityService: PersonalityService
  ) {}

  async sendMessage(message: string, mode: 'online' | 'offline'): Promise<string> {
    const personalityPrompt = await this.personalityService.getPrompt();

    if (mode === 'online') {
      return this.geminiService.sendMessage(message, personalityPrompt);
    } else {
      return this.ollamaService.sendMessage(message, personalityPrompt);
    }
  }
}
```

### Error Recovery

```typescript
// Circuit breaker pattern
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }
}
```

---

*Last updated: October 30, 2025*</content>
<parameter name="filePath">c:\Users\Aarnav\Desktop\Anshika\docs\services.md