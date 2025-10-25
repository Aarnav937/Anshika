/**
 * useDocumentSearch Hook
 * 
 * Custom React hook that provides a complete search experience with state management,
 * caching, and integration with search intelligence services.
 * 
 * Features:
 * - Centralized search state management
 * - Debounced search execution
 * - Result caching for performance
 * - Filter management
 * - Saved search integration
 * - Search history tracking
 * 
 * @example
 * ```typescript
 * const { 
 *   query, 
 *   results, 
 *   search, 
 *   updateFilters 
 * } = useDocumentSearch(documents);
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { documentSearchService } from '../services/documentIntelligence/documentSearchService';
import { searchIntelligenceService } from '../services/documentIntelligence/searchIntelligenceService';
import { 
  compressSearchResults, 
  decompressSearchResults, 
  shouldCompress,
  formatCompressionStats,
  type CompressedData
} from '../utils/compressionUtils';
import {
  ProcessedDocument,
  SearchResults,
  SearchFilters,
  SearchOptions,
  SavedSearch
} from '../types/document';

// ===== CONFIGURATION =====

const SEARCH_CONFIG = {
  DEBOUNCE_MS: 300,           // Delay before executing search
  CACHE_TTL_MS: 5 * 60 * 1000, // Cache results for 5 minutes
  MIN_QUERY_LENGTH: 2,         // Minimum characters to trigger search
  MAX_CACHE_SIZE: 50           // Maximum cached search results
} as const;

// ===== TYPES =====

/**
 * Search cache entry with timestamp for TTL management
 * Supports both raw and compressed storage for memory optimization
 */
interface CacheEntry {
  results?: SearchResults;      // Uncompressed results (for small datasets)
  compressed?: CompressedData;  // Compressed results (for large datasets)
  timestamp: number;
  isCompressed: boolean;
}

/**
 * Return type of useDocumentSearch hook
 */
export interface UseDocumentSearchReturn {
  // Current search state
  query: string;
  results: SearchResults | null;
  filters: SearchFilters;
  searchOptions: SearchOptions;
  isSearching: boolean;
  error: string | null;
  
  // Search actions
  search: (newQuery: string) => void;
  executeSearch: () => Promise<void>;
  clearSearch: () => void;
  
  // Filter management
  updateFilters: (newFilters: Partial<SearchFilters>) => void;
  clearFilters: () => void;
  
  // Search options
  updateSearchOptions: (options: Partial<SearchOptions>) => void;
  
  // Saved searches
  savedSearches: SavedSearch[];
  saveCurrentSearch: (name: string) => void;
  loadSavedSearch: (searchId: string) => void;
  deleteSavedSearch: (searchId: string) => void;
  
  // Cache management
  clearCache: () => void;
  getCacheStats: () => { size: number; hitRate: number };
}

// ===== HOOK IMPLEMENTATION =====

/**
 * Main hook for document search functionality
 * 
 * @param documents - Array of documents to search through
 * @param initialFilters - Optional initial filter state
 * @param initialOptions - Optional initial search options
 * @returns Search state and control functions
 */
export function useDocumentSearch(
  documents: ProcessedDocument[],
  initialFilters: SearchFilters = {},
  initialOptions: SearchOptions = {
    searchType: 'hybrid',
    includeSnippets: true,
    highlightMatches: true,
    maxResults: 20,
    sortBy: 'relevance',
    sortOrder: 'desc'
  }
): UseDocumentSearchReturn {
  
  // ===== STATE =====
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [searchOptions, setSearchOptions] = useState<SearchOptions>(initialOptions);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  
  // ===== REFS =====
  
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const cacheHitsRef = useRef(0);
  const cacheMissesRef = useRef(0);
  
  // ===== CACHE UTILITIES =====
  
  /**
   * Generate unique cache key from search parameters
   */
  const generateCacheKey = useCallback((
    searchQuery: string,
    searchFilters: SearchFilters,
    options: SearchOptions
  ): string => {
    return `${searchQuery}|${JSON.stringify(searchFilters)}|${JSON.stringify(options)}`;
  }, []);
  
  /**
   * Check if cached entry is still valid based on TTL
   */
  const isCacheValid = useCallback((entry: CacheEntry): boolean => {
    return Date.now() - entry.timestamp < SEARCH_CONFIG.CACHE_TTL_MS;
  }, []);
  
  /**
   * Get cached result if available and valid
   * Automatically decompresses if cached data is compressed
   */
  const getCachedResult = useCallback((
    searchQuery: string,
    searchFilters: SearchFilters,
    options: SearchOptions
  ): SearchResults | null => {
    const key = generateCacheKey(searchQuery, searchFilters, options);
    const cached = cacheRef.current.get(key);
    
    if (cached && isCacheValid(cached)) {
      cacheHitsRef.current++;
      
      // Decompress if needed
      if (cached.isCompressed && cached.compressed) {
        try {
          const decompressed = decompressSearchResults(cached.compressed);
          return decompressed;
        } catch (error) {
          console.error('[useDocumentSearch] Decompression failed:', error);
          cacheRef.current.delete(key);
          return null;
        }
      }
      
      // Return raw results
      return cached.results || null;
    }
    
    // Remove stale entry if exists
    if (cached) {
      cacheRef.current.delete(key);
    }
    
    cacheMissesRef.current++;
    return null;
  }, [generateCacheKey, isCacheValid]);
  
  /**
   * Store result in cache with current timestamp
   * Automatically compresses large datasets to save memory
   */
  const setCachedResult = useCallback((
    searchQuery: string,
    searchFilters: SearchFilters,
    options: SearchOptions,
    searchResults: SearchResults
  ): void => {
    const key = generateCacheKey(searchQuery, searchFilters, options);
    
    // Enforce cache size limit (LRU-style by removing oldest)
    if (cacheRef.current.size >= SEARCH_CONFIG.MAX_CACHE_SIZE) {
      const firstKey = cacheRef.current.keys().next().value;
      if (firstKey) {
        cacheRef.current.delete(firstKey);
      }
    }
    
    // Determine if we should compress this result
    const dataSize = JSON.stringify(searchResults).length;
    const useCompression = shouldCompress(dataSize);
    
    if (useCompression) {
      try {
        const compressed = compressSearchResults(searchResults);
        const stats = formatCompressionStats(compressed.stats);
        console.log(`[useDocumentSearch] Compressed cache entry: ${stats}`);
        
        cacheRef.current.set(key, {
          compressed,
          timestamp: Date.now(),
          isCompressed: true
        });
      } catch (error) {
        console.error('[useDocumentSearch] Compression failed, storing raw:', error);
        // Fallback to uncompressed storage
        cacheRef.current.set(key, {
          results: searchResults,
          timestamp: Date.now(),
          isCompressed: false
        });
      }
    } else {
      // Store without compression for small datasets
      cacheRef.current.set(key, {
        results: searchResults,
        timestamp: Date.now(),
        isCompressed: false
      });
    }
  }, [generateCacheKey]);
  
  /**
   * Clear all cached results
   */
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    cacheHitsRef.current = 0;
    cacheMissesRef.current = 0;
  }, []);
  
  /**
   * Get cache statistics for monitoring
   */
  const getCacheStats = useCallback(() => {
    const totalRequests = cacheHitsRef.current + cacheMissesRef.current;
    const hitRate = totalRequests > 0 
      ? (cacheHitsRef.current / totalRequests) * 100 
      : 0;
    
    return {
      size: cacheRef.current.size,
      hitRate: Number(hitRate.toFixed(2))
    };
  }, []);
  
  // ===== SEARCH EXECUTION =====
  
  /**
   * Execute search with current parameters
   * Includes caching, error handling, and analytics tracking
   */
  const executeSearch = useCallback(async (): Promise<void> => {
    // Validate query length
    if (!query || query.trim().length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
      setResults(null);
      setError(null);
      return;
    }
    
    // Check cache first
    const cachedResult = getCachedResult(query, filters, searchOptions);
    if (cachedResult) {
      setResults(cachedResult);
      setError(null);
      return;
    }
    
    setIsSearching(true);
    setError(null);
    
    try {
      const searchResults = await documentSearchService.searchDocuments(
        documents,
        query,
        filters,
        searchOptions
      );
      
      setResults(searchResults);
      
      // Cache successful results
      setCachedResult(query, filters, searchOptions, searchResults);
      
      // Record analytics
      searchIntelligenceService.recordSearch({
        query,
        resultCount: searchResults.totalResults,
        searchTime: searchResults.searchTime,
        searchType: searchResults.searchType,
        filtersUsed: Object.keys(filters).length > 0
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      setResults(null);
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, [query, filters, searchOptions, documents, getCachedResult, setCachedResult]);
  
  /**
   * Update query and trigger debounced search
   */
  const search = useCallback((newQuery: string) => {
    setQuery(newQuery);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Don't search if query too short
    if (!newQuery || newQuery.trim().length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
      setResults(null);
      return;
    }
    
    // Debounce search execution
    searchTimeoutRef.current = setTimeout(() => {
      executeSearch();
    }, SEARCH_CONFIG.DEBOUNCE_MS);
  }, [executeSearch]);
  
  /**
   * Clear search state and results
   */
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults(null);
    setError(null);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, []);
  
  // ===== FILTER MANAGEMENT =====
  
  /**
   * Update search filters and re-execute search
   */
  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    
    // Re-execute search if query exists
    if (query && query.trim().length >= SEARCH_CONFIG.MIN_QUERY_LENGTH) {
      // Small delay to allow state update
      setTimeout(() => executeSearch(), 50);
    }
  }, [query, executeSearch]);
  
  /**
   * Clear all active filters
   */
  const clearFilters = useCallback(() => {
    setFilters({});
    
    // Re-execute search if query exists
    if (query && query.trim().length >= SEARCH_CONFIG.MIN_QUERY_LENGTH) {
      setTimeout(() => executeSearch(), 50);
    }
  }, [query, executeSearch]);
  
  // ===== SEARCH OPTIONS MANAGEMENT =====
  
  /**
   * Update search options (type, sort, etc.)
   */
  const updateSearchOptions = useCallback((options: Partial<SearchOptions>) => {
    setSearchOptions(prev => ({ ...prev, ...options }));
    
    // Re-execute search if query exists
    if (query && query.trim().length >= SEARCH_CONFIG.MIN_QUERY_LENGTH) {
      setTimeout(() => executeSearch(), 50);
    }
  }, [query, executeSearch]);
  
  // ===== SAVED SEARCHES =====
  
  /**
   * Load saved searches from intelligence service
   */
  const refreshSavedSearches = useCallback(() => {
    setSavedSearches(searchIntelligenceService.getSavedSearches());
  }, []);
  
  /**
   * Save current search configuration
   */
  const saveCurrentSearch = useCallback((name: string) => {
    if (!query.trim()) {
      setError('Cannot save empty search');
      return;
    }
    
    searchIntelligenceService.saveSearch(name, query, filters, searchOptions);
    refreshSavedSearches();
  }, [query, filters, searchOptions, refreshSavedSearches]);
  
  /**
   * Load and execute a saved search
   */
  const loadSavedSearch = useCallback((searchId: string) => {
    const saved = searchIntelligenceService.getSavedSearch(searchId);
    if (!saved) {
      setError('Saved search not found');
      return;
    }
    
    setQuery(saved.query);
    setFilters(saved.filters);
    setSearchOptions(saved.options);
    
    // Touch saved search (update usage stats)
    searchIntelligenceService.touchSavedSearch(searchId);
    refreshSavedSearches();
    
    // Execute the search
    setTimeout(() => executeSearch(), 50);
  }, [refreshSavedSearches, executeSearch]);
  
  /**
   * Delete a saved search
   */
  const deleteSavedSearch = useCallback((searchId: string) => {
    searchIntelligenceService.deleteSavedSearch(searchId);
    refreshSavedSearches();
  }, [refreshSavedSearches]);
  
  // ===== INITIALIZATION =====
  
  // Load saved searches on mount
  useEffect(() => {
    refreshSavedSearches();
  }, [refreshSavedSearches]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);
  
  // ===== RETURN =====
  
  return {
    // State
    query,
    results,
    filters,
    searchOptions,
    isSearching,
    error,
    
    // Search actions
    search,
    executeSearch,
    clearSearch,
    
    // Filter management
    updateFilters,
    clearFilters,
    
    // Options management
    updateSearchOptions,
    
    // Saved searches
    savedSearches,
    saveCurrentSearch,
    loadSavedSearch,
    deleteSavedSearch,
    
    // Cache management
    clearCache,
    getCacheStats
  };
}

export default useDocumentSearch;
