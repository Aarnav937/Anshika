export type ChatMode = 'online' | 'offline';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  mode: ChatMode;
  isPinned?: boolean;
  isStreaming?: boolean;
  images?: Array<{
    file: File;
    preview: string;
  }>;
  editHistory?: Array<{
    content: string;
    timestamp: Date;
  }>;
  reactions?: Array<{
    emoji: string;
    count: number;
  }>;
}

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
  // Streaming state
  isStreaming: boolean;
  currentStreamId: string | null;
  streamingMessage: Message | null;
  streamingEnabled: boolean;
  streamingChunkDelay: number;
  streamingAutoScroll: boolean;
  streamingShowTypingIndicator: boolean;
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export interface EmbeddingsConfig {
  model: string;
  dimensions: number;
  persistPath: string;
}

// Tool-related types
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

export type AvailableTools = 'web_search' | 'get_weather' | 'get_forecast' | 'get_time' | 'get_date' | 'set_reminder' | 'get_reminders' | 'create_task' | 'list_tasks' | 'update_task' | 'delete_task' | 'toggle_task' | 'get_task_stats' | 'generate_image';

// Task Management Types
export type TaskStatus = 'pending' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

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

export interface TaskFilter {
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
  dueDateRange?: {
    start?: Date;
    end?: Date;
  };
}

export interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  completionRate: number;
}

export interface TaskState {
  tasks: Task[];
  filter: TaskFilter;
  isLoading: boolean;
  error?: string;
}

// ===== IMAGE GENERATION TYPES =====

// Core enums for generation modes and parameters
export enum GenerationMode {
  ONLINE = 'online',
  OFFLINE = 'offline'
}

export enum GenerationStatus {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

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

export enum ServiceStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  INITIALIZING = 'initializing',
  ERROR = 'error'
}

// Online generation parameter enums
export enum AspectRatio {
  SQUARE = '1:1',
  LANDSCAPE = '16:9',
  PORTRAIT = '9:16',
  STANDARD = '4:3'
}

export enum SafetyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum ImageQuality {
  STANDARD = 'standard',
  HD = 'hd'
}

// Local generation parameter enums
export enum Scheduler {
  EULER = 'euler',
  DPM = 'dpm',
  DDIM = 'ddim'
}

export enum ExportFormat {
  PNG = 'png',
  JPEG = 'jpeg',
  WEBP = 'webp'
}

// Base interfaces for generation parameters
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

export type GenerationParameters = OnlineParameters | LocalParameters;

// Core generation interfaces
export interface GenerationRequest {
  prompt: string;
  mode: GenerationMode;
  parameters: GenerationParameters;
  onProgress?: (progress: GenerationProgress) => void;
}

export interface GenerationProgress {
  percentage: number;
  stage: string;
  estimatedTimeRemaining?: number;
}

export interface GenerationResult {
  id: string;
  image: Blob;
  metadata: ImageMetadata;
  generationTime: number;
}

export interface GenerationError {
  type: ErrorType;
  message: string;
  details?: string;
  recoverable: boolean;
  suggestedAction?: string;
}

// Image metadata and storage interfaces
export interface ImageMetadata {
  prompt: string;
  mode: GenerationMode;
  parameters: GenerationParameters;
  timestamp: Date;
  generationTime: number;
  modelUsed?: string;
  fileSize?: number;
}

export interface ImageRecord {
  id: string;
  filename: string;
  thumbnailPath?: string;
  metadata: ImageMetadata;
  tags?: string[];
}

// Hardware and system interfaces
export interface HardwareCapabilities {
  gpuModel: string;
  vramTotal: number;
  vramAvailable: number;
  cudaVersion?: string;
  recommendedModels: string[];
  supportsLocalGeneration: boolean;
}

export interface GPUMemoryInfo {
  total: number;
  used: number;
  available: number;
  percentage: number;
}

// Configuration interfaces
export interface GoogleAPIConfig {
  projectId: string;
  location: string;
  apiKey?: string;
  serviceAccountPath?: string;
}

export interface LocalModelConfig {
  modelPath: string;
  modelName: string;
  memoryOptimized: boolean;
  quantized: boolean;
  loraAdapters?: string[];
}

export interface AppConfig {
  defaultMode: GenerationMode;
  googleAPI: GoogleAPIConfig;
  localModel: LocalModelConfig;
  imageStorage: {
    maxStorageSize: number;
    compressionEnabled: boolean;
    autoCleanup: boolean;
    retentionDays: number;
  };
  ui: {
    showProgressDetails: boolean;
    autoSwitchOnError: boolean;
    confirmCancellation: boolean;
  };
}

// Component interfaces
export interface GenerationManager {
  generateImage(request: GenerationRequest): Promise<GenerationResult>;
  switchMode(mode: GenerationMode): Promise<void>;
  getAvailableModes(): GenerationMode[];
  cancelGeneration(id: string): Promise<void>;
  getStatus(): GenerationStatus;
}

export interface OnlineGenerator {
  initialize(config: GoogleAPIConfig): Promise<void>;
  generate(prompt: string, params: OnlineParameters): Promise<Blob>;
  checkStatus(): Promise<ServiceStatus>;
  validateParameters(params: OnlineParameters): boolean;
}

export interface LocalGenerator {
  initialize(): Promise<void>;
  loadModel(modelPath: string): Promise<void>;
  generate(prompt: string, params: LocalParameters): Promise<Blob>;
  getMemoryUsage(): GPUMemoryInfo;
  optimizeForHardware(): Promise<void>;
  unloadModel(): Promise<void>;
}

export interface ImageManager {
  saveImage(image: Blob, metadata: ImageMetadata): Promise<string>;
  getImageHistory(limit?: number): Promise<ImageRecord[]>;
  getImage(id: string): Promise<Blob>;
  deleteImage(id: string): Promise<void>;
  exportImage(id: string, format: ExportFormat): Promise<Blob>;
  searchImages(query: string): Promise<ImageRecord[]>;
  getStorageInfo(): Promise<{ used: number; available: number }>;
}

export interface ConfigurationManager {
  getConfig(): Promise<AppConfig>;
  updateConfig(config: Partial<AppConfig>): Promise<void>;
  validateHardware(): Promise<HardwareCapabilities>;
  resetToDefaults(): Promise<void>;
}

// State management interfaces
export interface GenerationState {
  currentMode: GenerationMode;
  availableModes: GenerationMode[];
  status: GenerationStatus;
  progress?: GenerationProgress;
  currentRequest?: GenerationRequest;
  lastResult?: GenerationResult;
  error?: GenerationError;
  hardwareCapabilities?: HardwareCapabilities;
}

export interface ImageHistoryState {
  images: ImageRecord[];
  isLoading: boolean;
  searchQuery: string;
  selectedImage?: ImageRecord;
  error?: string;
}

export interface ConfigState {
  config: AppConfig;
  isLoading: boolean;
  isDirty: boolean;
  error?: string;
}
// ===== DOCUMENT COMPARISON EXPORTS =====
export type {
  ComparisonStatus,
  ComparisonType,
  SimilarityLevel,
  ComparisonMetrics,
  ComparisonSection,
  DocumentComparison,
  ComparisonRequest,
  ComparisonOptions,
  ComparisonProgress,
  ComparisonFilter,
  ComparisonStats,
  UseDocumentComparisonReturn
} from './document';




