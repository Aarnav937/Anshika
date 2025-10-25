// ===== IMAGE GENERATION TYPES =====
// Following the established pattern from your codebase

export type GenerationMode = 'online' | 'smart';
export type QualityTier = 'fast' | 'medium' | 'high';
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3';
export type ImageFormat = 'png' | 'jpeg' | 'webp';

// Generation stages for progress tracking
export type GenerationStage = 
  | 'idle'
  | 'initializing'
  | 'processing_prompt'
  | 'loading_model'
  | 'generating'
  | 'finalizing'
  | 'complete'
  | 'error'
  | 'cancelled';

// Quality tier definitions matching your requirements
export interface QualityTierConfig {
  name: QualityTier;
  steps: number;
  resolution: { width: number; height: number };
  guidance: number;
  estimatedTime: number; // seconds
  model: string;
}

// Generation parameters for online mode (Gemini)
export interface OnlineGenerationParams {
  prompt: string;
  enhancedPrompt?: string;
  aspectRatio: AspectRatio;
  quality: 'standard' | 'hd';
  stylePreset?: string;
  seed?: number;
  negativePrompt?: string;
  // Image-to-image transformation
  referenceImage?: Blob;
  transformationStrength?: number; // 0.0 - 1.0
}

// LocalGenerationParams removed - offline mode no longer supported

// Generated image with metadata
export interface GeneratedImage {
  id: string;
  blob: Blob;
  url: string; // Object URL for display
  metadata: ImageMetadata;
  thumbnail?: Blob;
  thumbnailUrl?: string;
}

// Comprehensive metadata
export interface ImageMetadata {
  prompt: string;
  enhancedPrompt?: string;
  negativePrompt?: string;
  mode: GenerationMode;
  qualityTier?: QualityTier;
  model: string;
  parameters: OnlineGenerationParams;
  timestamp: Date;
  generationTime: number; // seconds
  seed?: number;
  fileSize: number;
  resolution: { width: number; height: number };
  aiRating?: number; // 0-5
  userRating?: number; // 0-5
  tags?: string[];
  favorite?: boolean;
}

// Progress tracking (CRITICAL - must work reliably)
export interface GenerationProgress {
  percentage: number; // 0-100
  stage: GenerationStage;
  currentStep?: number;
  totalSteps?: number;
  estimatedTimeRemaining?: number; // seconds
  message: string;
}

// Hardware information (RTX 4050 detection)
export interface HardwareInfo {
  gpu: {
    model: string;
    vramTotal: number; // MB
    vramAvailable: number; // MB
    driverVersion?: string;
  };
  ram: {
    total: number; // MB
    available: number; // MB
  };
  cpu: {
    model: string;
    cores: number;
  };
  recommendedTier: QualityTier;
}

// Smart mode recommendation
export interface RecommendedMode {
  mode: GenerationMode;
  tier?: QualityTier;
  reason: string;
  confidence: number; // 0-1
  alternatives?: RecommendedMode[];
}

// Service status
export interface ServiceStatus {
  available: boolean;
  initializing: boolean;
  error?: string;
  lastCheck: Date;
}

// Enhanced prompt result
export interface EnhancedPrompt {
  original: string;
  enhanced: string;
  changes: string[];
  confidence: number;
}

// Storage info
export interface StorageInfo {
  used: number; // bytes
  available: number; // bytes
  total: number; // bytes
  percentage: number; // 0-100
  imageCount: number;
}

// Gallery filter
export interface GalleryFilter {
  mode?: GenerationMode;
  qualityTier?: QualityTier;
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  favorite?: boolean;
  searchQuery?: string;
}

// Style preset
export interface StylePreset {
  id: string;
  name: string;
  description: string;
  promptSuffix: string;
  negativePrompt: string;
  guidance: number;
  icon: string;
  thumbnail?: string;
}

// Image record for IndexedDB
export interface ImageRecord {
  id: string;
  blob: Blob;
  thumbnailBlob?: Blob;
  metadata: ImageMetadata;
  createdAt: Date;
  updatedAt: Date;
  favorite: boolean;
  tags: string[];
  userRating?: number;
}

// VRAM monitoring
export interface VRAMInfo {
  total: number; // MB
  used: number; // MB
  available: number; // MB
  percentage: number; // 0-100
}

// Generation request
export interface GenerationRequest {
  mode: GenerationMode;
  params: OnlineGenerationParams;
  onProgress?: (progress: GenerationProgress) => void;
}

// Generation error
export interface GenerationError {
  type: 'network' | 'hardware' | 'api' | 'memory' | 'unknown';
  message: string;
  details?: string;
  recoverable: boolean;
  suggestedAction?: string;
}

// State for useImageGeneration hook
export interface ImageGenerationState {
  currentMode: GenerationMode;
  availableModes: GenerationMode[];
  qualityTier: QualityTier;
  isGenerating: boolean;
  progress: GenerationProgress | null;
  currentImage: GeneratedImage | null;
  error: GenerationError | null;
  hardwareInfo: HardwareInfo | null;
  serviceStatus: {
    online: ServiceStatus;
  };
}

// State for useImageGallery hook
export interface ImageGalleryState {
  images: GeneratedImage[];
  filteredImages: GeneratedImage[];
  filter: GalleryFilter;
  sortBy: 'newest' | 'oldest' | 'rating' | 'size';
  viewMode: 'grid' | 'list' | 'timeline';
  selectedImages: string[];
  isLoading: boolean;
  storageInfo: StorageInfo | null;
  error: string | null;
}

// Complexity score for prompt analysis
export interface ComplexityScore {
  score: number; // 0-1
  level: 'simple' | 'medium' | 'complex';
  factors: {
    wordCount: number;
    subjects: number;
    details: number;
    composition: number;
  };
}

// Optimal parameters suggestion
export interface OptimalParams {
  qualityTier: QualityTier;
  steps: number;
  guidance: number;
  resolution: { width: number; height: number };
  estimatedTime: number;
  reasoning: string;
}

// ===== IMAGE HISTORY & VERSIONING =====

// Image version for tracking prompt variations
export interface ImageVersion {
  id: string;
  parentId?: string; // Links to original if this is a variation
  imageId: string; // References the actual image in storage
  prompt: string;
  enhancedPrompt?: string;
  parameters: OnlineGenerationParams;
  timestamp: Date;
  generationTime: number;
  versionNumber: number; // Sequential version number
  notes?: string;
}

// Image generation session (groups related versions)
export interface ImageSession {
  id: string;
  basePrompt: string; // Original prompt that started the session
  versions: ImageVersion[];
  createdAt: Date;
  updatedAt: Date;
  totalGenerations: number;
  tags?: string[];
}

// Version comparison data
export interface VersionComparison {
  version1: ImageVersion;
  version2: ImageVersion;
  differences: {
    prompt: boolean;
    parameters: string[]; // List of parameter names that differ
    seed: boolean;
    quality: boolean;
    aspectRatio: boolean;
  };
  similarity: number; // 0-1 score of how similar the versions are
}

// History statistics
export interface HistoryStats {
  totalSessions: number;
  totalVersions: number;
  averageVersionsPerSession: number;
  mostUsedPrompts: { prompt: string; count: number }[];
  mostUsedStyles: { style: string; count: number }[];
  averageGenerationTime: number;
  oldestSession: Date;
  newestSession: Date;
}
