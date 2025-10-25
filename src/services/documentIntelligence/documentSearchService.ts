/**
 * Advanced Document Search Service
 * 
 * Provides comprehensive search capabilities across document collection including:
 * - Semantic search using AI-powered content understanding
 * - Full-text search with advanced scoring
 * - Metadata search and filtering
 * - Smart suggestions and query expansion
 * - Search analytics and insights
 * 
 * Dependencies: Gemini API, Document Storage, Search Analytics
 */

import { 
  ProcessedDocument, 
  SearchFilters, 
  SearchOptions, 
  SearchResults, 
  SearchResult, 
  SearchSnippet, 
  SimilarityResult,
  DocumentSummary
} from '../../types/document';

// ===== CONFIGURATION =====

const SEARCH_CONFIG = {
  MAX_RESULTS: 50,
  SNIPPET_LENGTH: 200,
  CONTEXT_LENGTH: 100,
  SIMILARITY_THRESHOLD: 0.3,
  SEARCH_TIMEOUT: 5000, // 5 seconds
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  MAX_SUGGESTIONS: 10,
  MIN_QUERY_LENGTH: 2,
} as const;

// ===== SEARCH CACHE =====

interface SearchCache {
  query: string;
  filters: SearchFilters;
  results: SearchResults;
  timestamp: number;
}

const searchCache = new Map<string, SearchCache>();
const suggestionCache = new Map<string, { suggestions: string[]; timestamp: number }>();

// ===== UTILITY FUNCTIONS =====

/**
 * Generate cache key for search results
 */
function generateCacheKey(query: string, filters: SearchFilters): string {
  return `${query}-${JSON.stringify(filters)}`;
}

/**
 * Check if cache entry is still valid
 */
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < SEARCH_CONFIG.CACHE_DURATION;
}

/**
 * Clean expired cache entries
 */
function cleanCache(): void {
  const now = Date.now();
  
  // Clean search cache
  for (const [key, cache] of searchCache.entries()) {
    if (now - cache.timestamp > SEARCH_CONFIG.CACHE_DURATION) {
      searchCache.delete(key);
    }
  }
  
  // Clean suggestion cache
  for (const [key, cache] of suggestionCache.entries()) {
    if (now - cache.timestamp > SEARCH_CONFIG.CACHE_DURATION) {
      suggestionCache.delete(key);
    }
  }
}

/**
 * Calculate text similarity using simple algorithms
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().match(/\b\w+\b/g) || []);
  const words2 = new Set(text2.toLowerCase().match(/\b\w+\b/g) || []);
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Highlight search terms in text
 */
function highlightSearchTerms(text: string, query: string): string {
  const terms = query.toLowerCase().match(/\b\w+\b/g) || [];
  let highlightedText = text;
  
  terms.forEach(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    highlightedText = highlightedText.replace(regex, '<mark>$&</mark>');
  });
  
  return highlightedText;
}

/**
 * Extract context around a match
 */
function extractContext(text: string, matchStart: number, matchEnd: number): string {
  const start = Math.max(0, matchStart - SEARCH_CONFIG.CONTEXT_LENGTH);
  const end = Math.min(text.length, matchEnd + SEARCH_CONFIG.CONTEXT_LENGTH);
  
  let context = text.substring(start, end);
  
  // Add ellipsis if truncated
  if (start > 0) context = '...' + context;
  if (end < text.length) context = context + '...';
  
  return context;
}

// ===== SEARCH IMPLEMENTATIONS =====

/**
 * Perform full-text search across documents
 */
function performFullTextSearch(
  documents: ProcessedDocument[], 
  query: string, 
  options: SearchOptions
): SearchResult[] {
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.match(/\b\w+\b/g) || [];
  
  if (queryTerms.length === 0) {
    return results;
  }
  
  for (const document of documents) {
    const searchableText = [
      document.originalFile.name,
      document.summary?.title || '',
      document.extractedText || '',
      document.summary?.mainPoints?.join(' ') || '',
      document.summary?.keyTopics?.join(' ') || '',
      document.tags?.join(' ') || '',
      document.notes || ''
    ].join(' ').toLowerCase();
    
    // Calculate relevance score
    let relevanceScore = 0;
    let matchCount = 0;
    const snippets: SearchSnippet[] = [];
    
    // Check for exact phrase match (higher score)
    if (searchableText.includes(queryLower)) {
      relevanceScore += 30;
      matchCount++;
    }
    
    // Check individual terms
    queryTerms.forEach(term => {
      const termRegex = new RegExp(`\\b${term}\\b`, 'g');
      const matches = searchableText.match(termRegex);
      if (matches) {
        relevanceScore += matches.length * 10;
        matchCount++;
      }
    });
    
    // Boost for title matches
    if (document.summary?.title?.toLowerCase().includes(queryLower)) {
      relevanceScore += 40;
    }
    
    // Boost for document type matches
    if (document.summary?.documentType && queryLower.includes(document.summary.documentType)) {
      relevanceScore += 20;
    }
    
    // Create snippets from extracted text
    if (document.extractedText && matchCount > 0) {
      const text = document.extractedText;
      let lastIndex = 0;
      
      queryTerms.forEach(term => {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        let match;
        
        while ((match = regex.exec(text)) !== null && snippets.length < 3) {
          if (match.index > lastIndex + SEARCH_CONFIG.SNIPPET_LENGTH) {
            const snippetStart = Math.max(0, match.index - 50);
            const snippetEnd = Math.min(text.length, match.index + SEARCH_CONFIG.SNIPPET_LENGTH);
            const snippetText = text.substring(snippetStart, snippetEnd);
            
            snippets.push({
              text: snippetText,
              startIndex: snippetStart,
              endIndex: snippetEnd,
              score: relevanceScore / 100,
              context: extractContext(text, match.index, match.index + term.length),
              highlightedText: options.highlightMatches ? 
                highlightSearchTerms(snippetText, query) : undefined
            });
            
            lastIndex = snippetEnd;
          }
        }
      });
    }
    
    // Only include documents with meaningful matches
    if (relevanceScore > 0) {
      // Normalize score to 0-100
      const normalizedScore = Math.min(100, relevanceScore);
      
      results.push({
        document,
        relevanceScore: normalizedScore,
        matchReason: snippets.length > 0 ? 'content' : 
                    document.summary?.title?.toLowerCase().includes(queryLower) ? 'title' : 'metadata',
        matchedSnippets: snippets,
        highlightedContent: options.highlightMatches && document.extractedText ? 
          highlightSearchTerms(document.extractedText.substring(0, 1000), query) : undefined
      });
    }
  }
  
  return results;
}

/**
 * Perform semantic search using AI
 */
async function performSemanticSearch(
  documents: ProcessedDocument[],
  query: string,
  options: SearchOptions
): Promise<SearchResult[]> {
  try {
    const results: SearchResult[] = [];
    
    // Prepare document summaries for AI analysis
    const documentSummaries = documents
      .filter(doc => doc.summary && doc.extractedText)
      .map(doc => ({
        id: doc.id,
        name: doc.originalFile.name,
        title: doc.summary?.title || '',
        summary: doc.summary?.mainPoints?.join('. ') || '',
        content: doc.extractedText?.substring(0, 1500) || '', // Limit for API efficiency
        documentType: doc.summary?.documentType || 'unknown'
      }));
    
    if (documentSummaries.length === 0) {
      return results;
    }
    
    // Use AI for semantic analysis
    // For now, fall back to enhanced text similarity until we integrate proper AI
    console.log('Semantic search: Using enhanced text similarity (AI integration pending)');
    
    // Enhanced text similarity with document context
    const semanticResults: SearchResult[] = [];
    
    for (const docSummary of documentSummaries) {
      const document = documents.find(d => d.id === docSummary.id);
      if (!document) continue;
      
      // Calculate multiple similarity metrics
      const titleSimilarity = calculateTextSimilarity(query.toLowerCase(), docSummary.title.toLowerCase());
      const summarySimilarity = calculateTextSimilarity(query.toLowerCase(), docSummary.summary.toLowerCase());
      const contentSimilarity = calculateTextSimilarity(query.toLowerCase(), docSummary.content.toLowerCase());
      
      // Weighted semantic score
      const semanticScore = (titleSimilarity * 0.4) + (summarySimilarity * 0.3) + (contentSimilarity * 0.3);
      
      if (semanticScore > 0.2) { // Lower threshold for enhanced similarity
        const snippets: SearchSnippet[] = [];
        
        // Find best matching sections
        const sentences = docSummary.content.split(/[.!?]+/);
        for (const sentence of sentences) {
          const sentenceSimilarity = calculateTextSimilarity(query.toLowerCase(), sentence.toLowerCase());
          if (sentenceSimilarity > 0.3) {
            const startIndex = docSummary.content.indexOf(sentence);
            snippets.push({
              text: sentence.trim(),
              startIndex,
              endIndex: startIndex + sentence.length,
              score: sentenceSimilarity,
              context: `Semantic match in ${docSummary.documentType}`,
              highlightedText: options.highlightMatches ? 
                highlightSearchTerms(sentence, query) : undefined
            });
          }
        }
        
        semanticResults.push({
          document,
          relevanceScore: Math.round(semanticScore * 100),
          matchReason: 'semantic',
          matchedSnippets: snippets,
          semanticSimilarity: semanticScore,
          highlightedContent: options.highlightMatches && document.extractedText ?
            highlightSearchTerms(document.extractedText.substring(0, 1000), query) : undefined
        });
      }
    }
    
    return semanticResults;
    
  } catch (error) {
    console.error('Semantic search failed:', error);
    // Fall back to full-text search
    return performFullTextSearch(documents, query, options);
  }
}

/**
 * Perform metadata-based search
 */
function performMetadataSearch(
  documents: ProcessedDocument[],
  query: string,
  _options: SearchOptions
): SearchResult[] {
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();
  
  for (const document of documents) {
    let relevanceScore = 0;
    let matchReason: SearchResult['matchReason'] = 'metadata';
    
    // Check file name
    if (document.originalFile.name.toLowerCase().includes(queryLower)) {
      relevanceScore += 50;
    }
    
    // Check document type
    if (document.summary?.documentType?.includes(queryLower)) {
      relevanceScore += 40;
    }
    
    // Check tags
    if (document.tags?.some(tag => tag.toLowerCase().includes(queryLower))) {
      relevanceScore += 30;
    }
    
    // Check file extension
    if (document.originalFile.extension.toLowerCase() === queryLower) {
      relevanceScore += 20;
    }
    
    // Check notes
    if (document.notes?.toLowerCase().includes(queryLower)) {
      relevanceScore += 25;
    }
    
    if (relevanceScore > 0) {
      results.push({
        document,
        relevanceScore,
        matchReason,
        matchedSnippets: [],
        highlightedContent: undefined
      });
    }
  }
  
  return results;
}

/**
 * Apply search filters to document collection
 */
function applyFilters(documents: ProcessedDocument[], filters: SearchFilters): ProcessedDocument[] {
  return documents.filter(doc => {
    // Document type filter
    if (filters.documentTypes?.length && 
        (!doc.summary?.documentType || !filters.documentTypes.includes(doc.summary.documentType))) {
      return false;
    }
    
    // Date range filter
    if (filters.dateRange) {
      const docDate = doc.processedAt || doc.uploadedAt;
      if (docDate < filters.dateRange.start || docDate > filters.dateRange.end) {
        return false;
      }
    }
    
    // Size range filter
    if (filters.sizeRange) {
      const size = doc.originalFile.size;
      if (size < filters.sizeRange.min || size > filters.sizeRange.max) {
        return false;
      }
    }
    
    // Confidence range filter
    if (filters.confidenceRange && doc.summary) {
      const confidence = doc.summary.confidence;
      if (confidence < filters.confidenceRange.min || confidence > filters.confidenceRange.max) {
        return false;
      }
    }
    
    // Tags filter
    if (filters.tags?.length) {
      const docTags = doc.tags || [];
      const hasMatchingTag = filters.tags.some(filterTag => 
        docTags.some(docTag => docTag.toLowerCase().includes(filterTag.toLowerCase()))
      );
      if (!hasMatchingTag) {
        return false;
      }
    }
    
    // Analysis filter
    if (filters.hasAnalysis !== undefined) {
      const hasAnalysis = !!(doc.analysis || doc.summary);
      if (filters.hasAnalysis !== hasAnalysis) {
        return false;
      }
    }
    
    // Status filter
    if (filters.status?.length && !filters.status.includes(doc.status)) {
      return false;
    }
    
    return true;
  });
}

/**
 * Sort search results
 */
function sortResults(results: SearchResult[], sortBy: string, sortOrder: string): SearchResult[] {
  return results.sort((a, b) => {
    let aValue: any;
    let bValue: any;
    
    switch (sortBy) {
      case 'relevance':
        aValue = a.relevanceScore;
        bValue = b.relevanceScore;
        break;
      case 'date':
        aValue = a.document.processedAt || a.document.uploadedAt;
        bValue = b.document.processedAt || b.document.uploadedAt;
        break;
      case 'size':
        aValue = a.document.originalFile.size;
        bValue = b.document.originalFile.size;
        break;
      case 'name':
        aValue = a.document.originalFile.name.toLowerCase();
        bValue = b.document.originalFile.name.toLowerCase();
        break;
      case 'confidence':
        aValue = a.document.summary?.confidence || 0;
        bValue = b.document.summary?.confidence || 0;
        break;
      default:
        aValue = a.relevanceScore;
        bValue = b.relevanceScore;
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    }
  });
}

// ===== MAIN SEARCH FUNCTIONS =====

/**
 * Search documents with comprehensive options
 */
export async function searchDocuments(
  documents: ProcessedDocument[],
  query: string,
  filters: SearchFilters = {},
  options: SearchOptions = { searchType: 'hybrid' }
): Promise<SearchResults> {
  const startTime = Date.now();
  
  try {
    // Clean cache periodically
    if (Math.random() < 0.1) {
      cleanCache();
    }
    
    // Check cache first
    const cacheKey = generateCacheKey(query, filters);
    const cached = searchCache.get(cacheKey);
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.results;
    }
    
    // Validate input
    if (!query || query.trim().length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
      return {
        query,
        results: [],
        totalResults: 0,
        searchTime: Date.now() - startTime,
        searchType: options.searchType,
        filters,
        suggestions: await generateQuerySuggestions(documents, query)
      };
    }
    
    // Apply filters first to reduce search space
    const filteredDocuments = applyFilters(documents, filters);
    
    if (filteredDocuments.length === 0) {
      return {
        query,
        results: [],
        totalResults: 0,
        searchTime: Date.now() - startTime,
        searchType: options.searchType,
        filters,
        suggestions: ['Try removing some filters', 'Check your filter criteria']
      };
    }
    
    // Perform search based on type
    let searchResults: SearchResult[] = [];
    
    switch (options.searchType) {
      case 'fulltext':
        searchResults = performFullTextSearch(filteredDocuments, query, options);
        break;
        
      case 'semantic':
        searchResults = await performSemanticSearch(filteredDocuments, query, options);
        break;
        
      case 'metadata':
        searchResults = performMetadataSearch(filteredDocuments, query, options);
        break;
        
      case 'hybrid':
      default:
        // Combine multiple search types
        const fulltextResults = performFullTextSearch(filteredDocuments, query, options);
        const metadataResults = performMetadataSearch(filteredDocuments, query, options);
        
        // Merge results, avoiding duplicates
        const resultMap = new Map<string, SearchResult>();
        
        fulltextResults.forEach(result => {
          resultMap.set(result.document.id, result);
        });
        
        metadataResults.forEach(result => {
          const existing = resultMap.get(result.document.id);
          if (existing) {
            // Combine scores for documents found by multiple methods
            existing.relevanceScore = Math.max(existing.relevanceScore, result.relevanceScore);
            if (existing.matchReason === 'content' || result.matchReason === 'title') {
              existing.matchReason = result.matchReason;
            }
          } else {
            resultMap.set(result.document.id, result);
          }
        });
        
        searchResults = Array.from(resultMap.values());
        
        // Try semantic search for top results if we have few matches
        if (searchResults.length < 3 && filteredDocuments.length > 3) {
          try {
            const semanticResults = await performSemanticSearch(filteredDocuments, query, options);
            semanticResults.forEach(result => {
              const existing = resultMap.get(result.document.id);
              if (existing) {
                // Boost semantic matches
                existing.relevanceScore = Math.max(existing.relevanceScore, result.relevanceScore + 10);
                existing.semanticSimilarity = result.semanticSimilarity;
              } else if (result.semanticSimilarity && result.semanticSimilarity > (filters.similarityThreshold || SEARCH_CONFIG.SIMILARITY_THRESHOLD)) {
                resultMap.set(result.document.id, result);
              }
            });
            searchResults = Array.from(resultMap.values());
          } catch (error) {
            // Continue with existing results if semantic search fails
            console.warn('Semantic search enhancement failed:', error);
          }
        }
        break;
    }
    
    // Sort results
    const sortBy = options.sortBy || 'relevance';
    const sortOrder = options.sortOrder || 'desc';
    searchResults = sortResults(searchResults, sortBy, sortOrder);
    
    // Limit results
    const maxResults = options.maxResults || SEARCH_CONFIG.MAX_RESULTS;
    const limitedResults = searchResults.slice(0, maxResults);
    
    const searchTime = Date.now() - startTime;
    
    // Prepare final results
    const results: SearchResults = {
      query,
      results: limitedResults,
      totalResults: searchResults.length,
      searchTime,
      searchType: options.searchType,
      filters,
      suggestions: limitedResults.length === 0 ? 
        await generateQuerySuggestions(documents, query) : undefined
    };
    
    // Cache results
    searchCache.set(cacheKey, {
      query,
      filters,
      results,
      timestamp: Date.now()
    });
    
    return results;
    
  } catch (error) {
    console.error('Search failed:', error);
    
    return {
      query,
      results: [],
      totalResults: 0,
      searchTime: Date.now() - startTime,
      searchType: options.searchType,
      filters,
      suggestions: ['Try a different search term', 'Check your spelling']
    };
  }
}

/**
 * Find documents similar to a given document
 */
export async function findSimilarDocuments(
  documents: ProcessedDocument[],
  targetDocumentId: string,
  threshold: number = SEARCH_CONFIG.SIMILARITY_THRESHOLD
): Promise<SimilarityResult[]> {
  const targetDoc = documents.find(d => d.id === targetDocumentId);
  if (!targetDoc || !targetDoc.extractedText) {
    return [];
  }
  
  const results: SimilarityResult[] = [];
  const targetText = targetDoc.extractedText;
  const targetSummary = targetDoc.summary?.mainPoints?.join(' ') || '';
  
  for (const doc of documents) {
    if (doc.id === targetDocumentId || !doc.extractedText) continue;
    
    // Calculate text similarity
    const textSimilarity = calculateTextSimilarity(targetText, doc.extractedText);
    
    // Calculate summary similarity
    const summaryText = doc.summary?.mainPoints?.join(' ') || '';
    const summarySimilarity = calculateTextSimilarity(targetSummary, summaryText);
    
    // Combined similarity score
    const similarity = (textSimilarity * 0.7) + (summarySimilarity * 0.3);
    
    if (similarity > threshold) {
      results.push({
        document: doc,
        similarity,
        matchingSections: [] // Could be enhanced with section-level analysis
      });
    }
  }
  
  return results.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Generate search suggestions based on document content
 */
export async function generateQuerySuggestions(
  documents: ProcessedDocument[],
  partialQuery: string = ''
): Promise<string[]> {
  try {
    // Check suggestion cache
    const cacheKey = `suggestions-${partialQuery}`;
    const cached = suggestionCache.get(cacheKey);
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.suggestions;
    }
    
    const suggestions = new Set<string>();
    
    // Extract common terms from documents
    const allTerms = new Map<string, number>();
    
    documents.forEach(doc => {
      // Extract from various document fields
      const text = [
        doc.originalFile.name,
        doc.summary?.title || '',
        doc.summary?.mainPoints?.join(' ') || '',
        doc.summary?.keyTopics?.join(' ') || '',
        doc.tags?.join(' ') || ''
      ].join(' ').toLowerCase();
      
      const words = text.match(/\b\w{3,}\b/g) || [];
      words.forEach(word => {
        if (word.length >= 3) {
          allTerms.set(word, (allTerms.get(word) || 0) + 1);
        }
      });
    });
    
    // Sort by frequency and filter by partial query
    const sortedTerms = Array.from(allTerms.entries())
      .sort(([, a], [, b]) => b - a)
      .filter(([term]) => partialQuery ? term.includes(partialQuery.toLowerCase()) : true)
      .slice(0, SEARCH_CONFIG.MAX_SUGGESTIONS)
      .map(([term]) => term);
    
    // Add document type suggestions
    const documentTypes = [...new Set(documents
      .map(d => d.summary?.documentType)
      .filter(Boolean))] as DocumentSummary['documentType'][];
      
    documentTypes.forEach(type => {
      if (!partialQuery || type.includes(partialQuery.toLowerCase())) {
        suggestions.add(type);
      }
    });
    
    // Add common search patterns
    const commonPatterns = [
      'policy documents',
      'research reports',
      'curriculum guidelines',
      'assessment methods',
      'technical documentation'
    ];
    
    commonPatterns.forEach(pattern => {
      if (!partialQuery || pattern.includes(partialQuery.toLowerCase())) {
        suggestions.add(pattern);
      }
    });
    
    // Combine all suggestions
    const finalSuggestions = [
      ...Array.from(suggestions),
      ...sortedTerms
    ].slice(0, SEARCH_CONFIG.MAX_SUGGESTIONS);
    
    // Cache suggestions
    suggestionCache.set(cacheKey, {
      suggestions: finalSuggestions,
      timestamp: Date.now()
    });
    
    return finalSuggestions;
    
  } catch (error) {
    console.error('Failed to generate suggestions:', error);
    return [];
  }
}

/**
 * Clear search cache
 */
export function clearSearchCache(): void {
  searchCache.clear();
  suggestionCache.clear();
}

/**
 * Get search cache statistics
 */
export function getSearchCacheStats() {
  return {
    searchCacheSize: searchCache.size,
    suggestionCacheSize: suggestionCache.size,
    cacheHitRate: 0 // Could be tracked with additional metrics
  };
}

// ===== EXPORT MAIN INTERFACE =====

export const documentSearchService = {
  searchDocuments,
  findSimilarDocuments,
  generateQuerySuggestions,
  clearSearchCache,
  getSearchCacheStats
};

export default documentSearchService;
