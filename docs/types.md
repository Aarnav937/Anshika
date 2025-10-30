# Types Documentation

## Core Type Definitions

### Chat Types

```typescript
// Chat mode enumeration
export type ChatMode = 'online' | 'offline';

// Message interface
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  mode: ChatMode;
  isPinned?: boolean;
  editHistory?: Array<{
    content: string;
    timestamp: Date;
  }>;
  reactions?: Array<{
    emoji: string;
    count: number;
  }>;
}

// Chat state interface
export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  currentMode: ChatMode;
  selectedModel: string;
  availableModels: string[];
  onlineTemperature: number;
  offlineTemperature: number;
  webSearchEnabled: boolean;
  voiceEnabled: boolean;
}
```

### AI Service Types

```typescript
// Gemini API response
export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

// Ollama API response
export interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

// Tool calling interfaces
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  tool_call_id: string;
  content: string;
}

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

export type AvailableTools = 
  | 'web_search'
  | 'get_weather'
  | 'get_forecast'
  | 'get_time'
  | 'get_date'
  | 'set_reminder'
  | 'get_reminders'
  | 'create_task'
  | 'list_tasks'
  | 'update_task'
  | 'delete_task'
  | 'toggle_task'
  | 'get_task_stats'
  | 'generate_image';
```

### Document Types

```typescript
// Document analysis result
export interface DocumentAnalysis {
  summary: DocumentSummary;
  fullAnalysis: string;
  keyInsights: string[];
  recommendations?: string[];
  confidence: number;
  processingTime: number;
  modelUsed: string;
  analysisDate: Date;
}

// Document summary
export interface DocumentSummary {
  title: string;
  mainPoints: string[];
  keyTopics: string[];
  documentType: DocumentType;
  entities: DocumentEntity[];
  wordCount: number;
  pageCount?: number;
  language?: string;
  confidence: number;
}

// Document types
export type DocumentType = 
  | 'report'
  | 'letter'
  | 'presentation'
  | 'spreadsheet'
  | 'image'
  | 'article'
  | 'policy'
  | 'invoice'
  | 'unknown';

// Document entity
export interface DocumentEntity {
  text: string;
  type: string;
  confidence: number;
  startIndex?: number;
  endIndex?: number;
}

// Document interface
export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  uploadedAt: Date;
  lastModified: Date;
  metadata: DocumentMetadata;
}

// Document metadata
export interface DocumentMetadata {
  wordCount: number;
  pageCount?: number;
  language?: string;
  encoding?: string;
  extractedBy: string;
  extractionDate: Date;
}
```

### Image Generation Types

```typescript
// Generation modes
export enum GenerationMode {
  ONLINE = 'online',
  OFFLINE = 'offline'
}

// Generation status
export enum GenerationStatus {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Error types
export enum ErrorType {
  NETWORK_ERROR = 'network_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  HARDWARE_ERROR = 'hardware_error',
  VALIDATION_ERROR = 'validation_error',
  API_ERROR = 'api_error',
  MEMORY_ERROR = 'memory_error',
  MODEL_ERROR = 'model_error',
  UNKNOWN_ERROR = 'unknown_error'
}

// Service status
export enum ServiceStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  INITIALIZING = 'initializing',
  ERROR = 'error'
}

// Generation parameters
export interface BaseGenerationParameters {
  seed?: number;
}

export interface OnlineParameters extends BaseGenerationParameters {
  aspectRatio: AspectRatio;
  stylePreset?: string;
  safetyLevel: SafetyLevel;
  quality: ImageQuality;
}

export interface LocalParameters extends BaseGenerationParameters {
  width: number;
  height: number;
  steps: number;
  guidanceScale: number;
  scheduler: Scheduler;
}

// Generation request
export interface GenerationRequest {
  prompt: string;
  mode: GenerationMode;
  parameters: GenerationParameters;
  onProgress?: (progress: GenerationProgress) => void;
}

// Generation progress
export interface GenerationProgress {
  percentage: number;
  stage: string;
  estimatedTimeRemaining?: number;
}

// Generation result
export interface GenerationResult {
  id: string;
  image: Blob;
  metadata: ImageMetadata;
  generationTime: number;
}

// Generated image
export interface GeneratedImage {
  id: string;
  blob: Blob;
  url: string;
  metadata: ImageMetadata;
}

// Image metadata
export interface ImageMetadata {
  prompt: string;
  enhancedPrompt?: string;
  negativePrompt?: string;
  mode: GenerationMode;
  parameters: GenerationParameters;
  timestamp: Date;
  generationTime: number;
  seed?: number;
  fileSize?: number;
  resolution?: {
    width: number;
    height: number;
  };
  tags?: string[];
}

// Image record
export interface ImageRecord {
  id: string;
  filename: string;
  thumbnailPath?: string;
  metadata: ImageMetadata;
}
```

### Task Management Types

```typescript
// Task status
export type TaskStatus = 'pending' | 'completed';

// Task priority
export type TaskPriority = 'low' | 'medium' | 'high';

// Task interface
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  completedAt?: Date;
}

// Task filter
export interface TaskFilter {
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
  dueDateRange?: {
    start?: Date;
    end?: Date;
  };
}

// Task statistics
export interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  completionRate: number;
}

// Task state
export interface TaskState {
  tasks: Task[];
  filter: TaskFilter;
  isLoading: boolean;
  error?: string;
}
```

### UI Component Types

```typescript
// Theme types
export type ThemeMode = 'light' | 'dark' | 'cosmic';

// Button variants
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

// Button sizes
export type ButtonSize = 'sm' | 'md' | 'lg';

// Input types
export type InputType = 'text' | 'email' | 'password' | 'number';

// Loading states
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// Modal sizes
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

// Form field states
export interface FormFieldState {
  value: string;
  error?: string;
  touched: boolean;
  valid: boolean;
}

// Table column definition
export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string | number;
}

// Pagination state
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// Sort state
export interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

// Filter state
export interface FilterState {
  [key: string]: any;
}
```

### Context Types

```typescript
// Chat context type
export interface ChatContextType extends ChatState {
  setMode: (mode: ChatMode) => void;
  setLoading: (isLoading: boolean) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  clearMessages: () => void;
  setSelectedModel: (model: string) => void;
  setAvailableModels: (models: string[]) => void;
  setOnlineTemperature: (temperature: number) => void;
  setOfflineTemperature: (temperature: number) => void;
  setWebSearchEnabled: (enabled: boolean) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  editMessage: (id: string, newContent: string) => void;
  pinMessage: (id: string) => void;
  deleteMessage: (id: string) => void;
  addReaction: (id: string, emoji: string) => void;
}

// Theme context type
export interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  fontSize: 'small' | 'medium' | 'large';
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
}

// Toast context type
export interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: (id: string) => void;
  clearToasts: () => void;
}

// TTS context type
export interface TTSContextType {
  isSpeaking: boolean;
  currentVoice: SpeechSynthesisVoice | null;
  availableVoices: SpeechSynthesisVoice[];
  rate: number;
  pitch: number;
  volume: number;
  autoSpeakEnabled: boolean;
  setVoice: (voice: SpeechSynthesisVoice) => void;
  setRate: (rate: number) => void;
  setPitch: (pitch: number) => void;
  setVolume: (volume: number) => void;
  setAutoSpeakEnabled: (enabled: boolean) => void;
  speak: (text: string) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

// Speech recognition context type
export interface SpeechRecognitionContextType {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  error: string | null;
  startListening: (options?: SpeechRecognitionOptions) => void;
  stopListening: () => void;
  resetTranscript: () => void;
}
```

### API Response Types

```typescript
// Generic API response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

// API error
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
  timestamp: string;
}

// Paginated response
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// File upload response
export interface FileUploadResponse {
  fileId: string;
  filename: string;
  size: number;
  mimeType: string;
  url: string;
  uploadedAt: string;
}

// Search response
export interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalResults: number;
  searchTime: number;
  suggestions?: string[];
}

// Search result
export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  url: string;
  relevanceScore: number;
  metadata?: Record<string, any>;
}
```

### Configuration Types

```typescript
// Application configuration
export interface AppConfig {
  version: string;
  environment: 'development' | 'staging' | 'production';
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
  };
  features: {
    chat: boolean;
    documents: boolean;
    images: boolean;
    tasks: boolean;
    voice: boolean;
  };
  ui: {
    theme: ThemeMode;
    language: string;
    animations: boolean;
    compactMode: boolean;
  };
  storage: {
    maxFileSize: number;
    allowedFileTypes: string[];
    cacheSize: number;
  };
}

// User preferences
export interface UserPreferences {
  theme: ThemeMode;
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
}

// API key configuration
export interface ApiKeyConfig {
  gemini: string;
  weather: string;
  search: string;
  [key: string]: string;
}
```

### Error Types

```typescript
// Base error class
export class AppError extends Error {
  code: string;
  statusCode: number;
  details?: any;

  constructor(message: string, code: string, statusCode = 500, details?: any) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Specific error types
export class NetworkError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', 0, details);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400, { field });
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
  }
}
```

### Event Types

```typescript
// Custom events
export interface CustomEventMap {
  'chat:message': CustomEvent<Message>;
  'chat:mode-change': CustomEvent<{ mode: ChatMode }>;
  'document:uploaded': CustomEvent<Document>;
  'document:analyzed': CustomEvent<DocumentAnalysis>;
  'image:generated': CustomEvent<GeneratedImage>;
  'task:created': CustomEvent<Task>;
  'task:updated': CustomEvent<Task>;
  'task:deleted': CustomEvent<{ taskId: string }>;
  'toast:show': CustomEvent<Toast>;
  'theme:changed': CustomEvent<{ theme: ThemeMode }>;
  'voice:started': CustomEvent<{ text: string }>;
  'voice:ended': CustomEvent<void>;
  'error:occurred': CustomEvent<AppError>;
}

// Event payloads
export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// WebSocket message types
export type WebSocketMessageType =
  | 'chat:message'
  | 'document:update'
  | 'image:progress'
  | 'task:update'
  | 'notification'
  | 'system:status';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: any;
  timestamp: string;
  userId?: string;
}
```

### Utility Types

```typescript
// Generic utility types
export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// Function types
export type AsyncFunction<T = void> = () => Promise<T>;
export type CallbackFunction<T = void> = (data?: any) => T;
export type EventHandler<T = Event> = (event: T) => void;

// Component prop types
export type ComponentProps<T extends React.ComponentType<any>> = React.ComponentProps<T>;
export type ComponentRef<T extends React.ComponentType<any>> = React.ComponentRef<T>;

// API function types
export type ApiFunction<TInput, TOutput> = (input: TInput) => Promise<TOutput>;
export type ApiMutation<TInput, TOutput> = (input: TInput) => Promise<TOutput>;
export type ApiQuery<TInput, TOutput> = (input: TInput) => Promise<TOutput>;

// Storage types
export type StorageValue = string | number | boolean | object | null;
export type StorageKey = string;

// Validation types
export interface ValidationRule<T = any> {
  validate: (value: T) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// Loading states
export interface LoadingState<T = any> {
  loading: boolean;
  data?: T;
  error?: Error;
}

// Pagination types
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

---

*Last updated: October 30, 2025*</content>
<parameter name="filePath">c:\Users\Aarnav\Desktop\Anshika\docs\types.md