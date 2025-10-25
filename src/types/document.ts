// Document Intelligence Type Definitions
// Comprehensive types for file processing, analysis, and Q&A

export type DocumentStatus =
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'error'
  | 'analyzing'
  | 'queued';

export type SupportedFileType = 'pdf' | 'docx' | 'txt' | 'jpg' | 'jpeg' | 'png' | 'webp';

export interface FileMetadata {
  name: string;
  type: string;
  size: number;
  lastModified: number;
  extension: string;
  mimeType: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number; // 0-100
  status: DocumentStatus;
  error?: string;
  startTime: Date;
  estimatedTimeRemaining?: number;
}

export interface UploadCallbacks {
  onFileQueued?: (fileId: string, file: File) => void;
  onFileCompleted?: (fileId: string) => void;
}

export type ExtractionMethod = 'pdf' | 'docx' | 'txt' | 'image-ocr' | 'mixed' | 'unknown';

export interface ExtractionDetails {
  method: ExtractionMethod;
  language?: string;
  ocrModel?: string;
  pageCount?: number;
  wordCount?: number;
  characterCount?: number;
  warnings?: string[];
  durationMs: number;
  processedAt: Date;
}

export interface GeminiFileRef {
  name: string;
  displayName: string;
  mimeType: string;
  sizeBytes: string;
  createTime: string;
  updateTime: string;
  expirationTime: string;
  sha256Hash: string;
  uri: string;
  state: 'ACTIVE' | 'FAILED';
  videoMetadata?: any;
}

export interface ExtractedEntity {
  text: string;
  type: 'person' | 'organization' | 'location' | 'date' | 'money' | 'percentage' | 'other';
  confidence: number;
  startIndex?: number;
  endIndex?: number;
}

export interface DocumentSummary {
  title: string;
  mainPoints: string[];
  keyTopics: string[];
  documentType: 'report' | 'letter' | 'presentation' | 'spreadsheet' | 'image' | 'article' | 'policy' | 'invoice' | 'research' | 'manual' | 'unknown';
  entities: ExtractedEntity[];
  wordCount?: number;
  pageCount?: number;
  language?: string;
  confidence: number;
}

export interface DocumentAnalysis {
  summary: DocumentSummary;
  fullAnalysis: string;
  keyInsights: string[];
  recommendations?: string[];
  confidence: number;
  processingTime: number;
  modelUsed: 'flash' | 'pro';
  analysisDate: Date;
}

export interface ProcessedDocument {
  // Core identification
  id: string;
  originalFile: FileMetadata;
  originalBlob?: Blob;
  
  // Processing status
  status: DocumentStatus;
  uploadedAt: Date;
  processedAt?: Date;
  
  // Gemini integration
  geminiFileRef?: GeminiFileRef;
  
  // Analysis results
  summary?: DocumentSummary;
  analysis?: DocumentAnalysis;
  extractedText?: string;
  contentChunks?: string[];
  extractionDetails?: ExtractionDetails;
  
  // UI enhancements
  thumbnail?: string; // Base64 or blob URL
  previewText?: string; // First few lines for quick preview
  
  // Error handling
  error?: DocumentError;
  retryCount?: number;
  
  // User metadata
  tags?: string[];
  notes?: string;
  isFavorite?: boolean;
}

export interface DocumentError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  isRecoverable: boolean;
}

export interface DocumentSource {
  documentId: string;
  documentName: string;
  pageNumber?: number;
  sectionTitle?: string;
  excerpt: string;
  relevanceScore: number;
}

export interface QueryResponse {
  answer: string;
  sources: DocumentSource[];
  confidence: number;
  followUpSuggestions: string[];
  processingTime: number;
  modelUsed: 'flash' | 'pro';
  timestamp: Date;
}

export interface ComparisonResult {
  summary: string;
  similarities: string[];
  differences: string[];
  keyFindings: string[];
  documentsCompared: string[];
  confidence: number;
}

// ===== DOCUMENT COMPARISON ENGINE TYPES =====

export type ComparisonStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ComparisonType = 
  | 'content'      // Text content analysis
  | 'structure'    // Document structure comparison
  | 'metadata'     // File properties and metadata
  | 'semantic'     // AI-powered semantic analysis
  | 'full';        // Complete comprehensive comparison

export type SimilarityLevel = 'very-low' | 'low' | 'medium' | 'high' | 'very-high';

export interface ComparisonMetrics {
  textSimilarity: number;          // 0-100: Content text similarity
  structuralSimilarity: number;    // 0-100: Document structure similarity
  semanticSimilarity: number;      // 0-100: AI-powered semantic similarity
  overallScore: number;            // 0-100: Weighted average score
  confidenceLevel: SimilarityLevel;
}

export interface ComparisonSection {
  sectionType: 'similar' | 'different' | 'unique-to-doc1' | 'unique-to-doc2';
  title: string;
  content: string;
  doc1Extract?: string;
  doc2Extract?: string;
  similarity: number;
  importance: 'high' | 'medium' | 'low';
}

export interface DocumentComparison {
  // Core identification
  id: string;
  document1Id: string;
  document2Id: string;
  
  // Comparison metadata
  comparisonType: ComparisonType;
  status: ComparisonStatus;
  createdAt: Date;
  completedAt?: Date;
  processingTime?: number;
  
  // Results
  metrics: ComparisonMetrics;
  sections: ComparisonSection[];
  
  // AI Analysis
  aiSummary: string;
  keyInsights: string[];
  recommendations: string[];
  relationshipType: 'identical' | 'similar' | 'related' | 'different' | 'contradictory';
  
  // Additional metadata
  modelUsed: 'flash' | 'pro';
  confidence: number;
  error?: DocumentError;
}

export interface ComparisonRequest {
  document1Id: string;
  document2Id: string;
  comparisonType: ComparisonType;
  options?: ComparisonOptions;
}

export interface ComparisonOptions {
  includeStructural?: boolean;     // Include document structure analysis
  includeMetadata?: boolean;       // Include file metadata comparison
  focusAreas?: string[];          // Specific areas to focus on (e.g., ['conclusions', 'methodology'])
  detailLevel?: 'basic' | 'detailed' | 'comprehensive';
  generateRecommendations?: boolean;
}

export interface ComparisonProgress {
  comparisonId: string;
  stage: 'extracting' | 'analyzing' | 'comparing' | 'generating-report';
  progress: number; // 0-100
  stageDescription: string;
  estimatedTimeRemaining?: number;
}

export interface ComparisonFilter {
  status?: ComparisonStatus[];
  comparisonType?: ComparisonType[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  similarityRange?: {
    min: number;
    max: number;
  };
  documentIds?: string[];
}

export interface ComparisonStats {
  totalComparisons: number;
  completedComparisons: number;
  averageSimilarity: number;
  mostSimilarPair: {
    doc1Name: string;
    doc2Name: string;
    similarity: number;
  };
  commonPatterns: string[];
}

// ===== ADVANCED SEARCH SYSTEM TYPES =====

export type SearchType = 
  | 'fulltext'     // Traditional keyword matching
  | 'semantic'     // AI-powered meaning-based search  
  | 'metadata'     // Search by document properties
  | 'hybrid';      // Combined approach for optimal relevance

export interface SearchFilters {
  documentTypes?: DocumentSummary['documentType'][];
  dateRange?: {
    start: Date;
    end: Date;
  };
  sizeRange?: {
    min: number;  // bytes
    max: number;  // bytes
  };
  confidenceRange?: {
    min: number;  // 0-100
    max: number;  // 0-100
  };
  tags?: string[];
  hasAnalysis?: boolean;
  status?: DocumentStatus[];
  similarityThreshold?: number; // 0-1 for semantic search
}

export interface SearchOptions {
  searchType: SearchType;
  maxResults?: number;
  includeSnippets?: boolean;
  highlightMatches?: boolean;
  sortBy?: 'relevance' | 'date' | 'size' | 'name' | 'confidence';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchSnippet {
  text: string;
  startIndex: number;
  endIndex: number;
  score: number;
  context: string; // Surrounding text for context
  highlightedText?: string; // HTML with <mark> tags
}

export interface SearchResult {
  document: ProcessedDocument;
  relevanceScore: number;       // 0-100 overall relevance
  matchReason: 'content' | 'metadata' | 'semantic' | 'title' | 'tags';
  matchedSnippets: SearchSnippet[];
  highlightedContent?: string;  // Content with highlighted search terms
  semanticSimilarity?: number;  // 0-1 for semantic searches
}

export interface SearchResults {
  query: string;
  results: SearchResult[];
  totalResults: number;
  searchTime: number;           // milliseconds
  searchType: SearchType;
  filters: SearchFilters;
  suggestions?: string[];       // Query suggestions for no results
}

export interface SearchSuggestion {
  text: string;
  type: 'content' | 'document-name' | 'tag' | 'entity' | 'topic';
  frequency: number;
  relevanceScore: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
  options: SearchOptions;
  createdAt: Date;
  lastUsed: Date;
  useCount: number;
  notifyOnNewResults?: boolean;
  resultCount: number;         // Last known result count
}

export interface SearchAnalytics {
  query: string;
  timestamp: Date;
  resultCount: number;
  searchTime: number;
  searchType: SearchType;
  filtersUsed: boolean;
  userId?: string;
}

export interface QueryAnalytics {
  query: string;
  searchCount: number;
  avgResultCount: number;
  avgSearchTime: number;
  successRate: number;         // % of searches that returned results
  lastSearched: Date;
}

export interface SearchInsights {
  totalSearches: number;
  uniqueQueries: number;
  avgResultCount: number;
  avgSearchTime: number;
  popularQueries: QueryAnalytics[];
  searchSuccessRate: number;
  mostSearchedDocumentTypes: Array<{
    type: DocumentSummary['documentType'];
    count: number;
  }>;
  peakSearchTimes: Array<{
    hour: number;
    searchCount: number;
  }>;
  // Extended intelligence (Task 3.2.3 - Phase B)
  trendingQueries?: Array<{
    query: string;
    delta: number;          // increase in searches vs previous window
    currentCount: number;
  }>;
  lowResultAlerts?: Array<{
    query: string;
    averageResults: number;
    searches: number;
  }>;
  filterEffectiveness?: Array<{
    filterType: string;      // e.g., 'documentTypes', 'tags'
    usageCount: number;
    avgResults: number;
  }>;
}

export interface SimilarityResult {
  document: ProcessedDocument;
  similarity: number;          // 0-1
  matchingSections: Array<{
    section: string;
    similarity: number;
    snippet: string;
  }>;
}

export interface DocumentUploadConfig {
  maxFileSize: number; // bytes
  maxFiles: number;
  supportedTypes: SupportedFileType[];
  allowMultiple: boolean;
  autoAnalyze: boolean;
}

export interface DocumentStorageStats {
  totalDocuments: number;
  totalSize: number;
  storageQuotaUsed: number;
  storageQuotaTotal: number;
  oldestDocument?: Date;
  newestDocument?: Date;
}

// Event types for document processing
export type DocumentEvent = 
  | { type: 'upload_started'; payload: { fileId: string; fileName: string } }
  | { type: 'upload_progress'; payload: UploadProgress }
  | { type: 'upload_complete'; payload: { fileId: string; document: ProcessedDocument } }
  | { type: 'upload_error'; payload: { fileId: string; error: DocumentError } }
  | { type: 'processing_started'; payload: { documentId: string } }
  | { type: 'processing_complete'; payload: { documentId: string; document: ProcessedDocument } }
  | { type: 'processing_error'; payload: { documentId: string; error: DocumentError } }
  | { type: 'analysis_started'; payload: { documentId: string } }
  | { type: 'analysis_complete'; payload: { documentId: string; analysis: DocumentAnalysis } }
  | { type: 'analysis_error'; payload: { documentId: string; error: DocumentError } };

// Hook interfaces
export interface UseDocumentUploadReturn {
  uploadFiles: (files: File[], callbacks?: UploadCallbacks) => Promise<void>;
  uploadProgress: Map<string, UploadProgress>;
  isUploading: boolean;
  cancelUpload: (fileId: string) => void;
  clearCompleted: () => void;
}

export interface UseDocumentStorageReturn {
  documents: ProcessedDocument[];
  loading: boolean;
  error: DocumentError | null;
  addDocument: (document: ProcessedDocument) => Promise<void>;
  upsertFromFile: (fileId: string, file: File) => Promise<ProcessedDocument>;
  updateDocument: (id: string, updates: Partial<ProcessedDocument>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  getDocument: (id: string) => Promise<ProcessedDocument | null>;
  searchDocuments: (query: string) => ProcessedDocument[];
  clearAllDocuments: () => Promise<void>;
  getStorageStats: () => Promise<DocumentStorageStats>;
}

export interface UseDocumentChatReturn {
  askQuestion: (query: string, documentIds?: string[]) => Promise<QueryResponse>;
  isProcessing: boolean;
  lastResponse: QueryResponse | null;
  error: DocumentError | null;
  chatHistory: Array<{
    query: string;
    response: QueryResponse;
    timestamp: Date;
  }>;
  clearHistory: () => void;
}

export interface UseDocumentComparisonReturn {
  compareDocuments: (request: ComparisonRequest) => Promise<DocumentComparison>;
  comparisons: DocumentComparison[];
  isComparing: boolean;
  progress: ComparisonProgress | null;
  error: DocumentError | null;
  getComparison: (id: string) => DocumentComparison | null;
  deleteComparison: (id: string) => Promise<void>;
  getComparisonHistory: (filter?: ComparisonFilter) => DocumentComparison[];
  getComparisonStats: () => ComparisonStats;
  clearHistory: () => void;
}

export interface UseDocumentSearchReturn {
  // Search execution
  search: (query: string, filters?: SearchFilters, options?: SearchOptions) => Promise<SearchResults>;
  
  // Search state
  currentQuery: string;
  results: SearchResults | null;
  isSearching: boolean;
  error: DocumentError | null;
  
  // Search suggestions
  suggestions: SearchSuggestion[];
  generateSuggestions: (partialQuery: string) => Promise<string[]>;
  
  // Filters and options
  filters: SearchFilters;
  updateFilters: (filters: Partial<SearchFilters>) => void;
  clearFilters: () => void;
  
  // Saved searches
  savedSearches: SavedSearch[];
  saveSearch: (name: string) => Promise<SavedSearch>;
  loadSavedSearch: (searchId: string) => Promise<void>;
  deleteSavedSearch: (searchId: string) => Promise<void>;
  
  // Analytics and insights
  searchHistory: SearchAnalytics[];
  getSearchInsights: () => Promise<SearchInsights>;
  
  // Utility functions
  clearSearch: () => void;
  findSimilarDocuments: (documentId: string, threshold?: number) => Promise<SimilarityResult[]>;
}

// Constants
export const DOCUMENT_CONSTANTS = {
  MAX_FILE_SIZE: 200 * 1024 * 1024, // 200MB per file
  MAX_FILES: 5,
  SUPPORTED_TYPES: ['pdf', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'webp'] as SupportedFileType[],
  OCR_ONLY_TYPES: ['jpg', 'jpeg', 'png', 'webp'] as SupportedFileType[],
  THUMBNAIL_SIZE: { width: 200, height: 200 },
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  RETRY_ATTEMPTS: 3,
  PROCESSING_TIMEOUT: 300000, // 5 minutes
  TEXT_CHUNK_CHAR_TARGET: 1500,
  PREVIEW_CHAR_LIMIT: 400,
} as const;

export const MIME_TYPE_MAP: Record<SupportedFileType, string[]> = {
  pdf: ['application/pdf'],
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-word.document.macroEnabled.12'
  ],
  txt: ['text/plain', 'text/csv'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  webp: ['image/webp'],
};

export const ERROR_CODES = {
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_TYPE: 'UNSUPPORTED_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  ANALYSIS_FAILED: 'ANALYSIS_FAILED',
  GEMINI_API_ERROR: 'GEMINI_API_ERROR',
   EXTRACTION_FAILED: 'EXTRACTION_FAILED',
   OCR_FAILED: 'OCR_FAILED',
  STORAGE_ERROR: 'STORAGE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
} as const;
