/**
 * Simplified tests for useDocumentSearch hook
 * Focus on core functionality without complex timer mocking
 */

import { renderHook, act } from '@testing-library/react';
import { useDocumentSearch } from '../useDocumentSearch';
import * as documentSearchService from '../../services/documentIntelligence/documentSearchService';
import * as searchIntelligenceService from '../../services/documentIntelligence/searchIntelligenceService';
import type { ProcessedDocument, SearchResults, SavedSearch } from '../../types/document';

// Mock the services
jest.mock('../../services/documentIntelligence/documentSearchService');
jest.mock('../../services/documentIntelligence/searchIntelligenceService');

const mockSearchService = documentSearchService as jest.Mocked<typeof documentSearchService>;
const mockIntelligenceService = searchIntelligenceService as jest.Mocked<typeof searchIntelligenceService>;

describe('useDocumentSearch Hook (Simplified Tests)', () => {
  const mockDocument: ProcessedDocument = {
    id: '1',
    originalFile: {
      name: 'Test Doc.pdf',
      size: 1024,
      type: 'application/pdf',
      lastModified: 1704067200000,
      mimeType: 'application/pdf',
      extension: 'pdf'
    },
    uploadedAt: new Date('2024-01-01'),
    processedAt: new Date('2024-01-01'),
    status: 'ready' as const,
    extractedText: 'Test content',
    summary: {
      title: 'Test',
      mainPoints: ['Point 1'],
      keyTopics: ['AI'],
      entities: [],
      documentType: 'report' as const,
      confidence: 85
    },
    tags: ['AI']
  };

  const mockSearchResults: SearchResults = {
    results: [{
      document: mockDocument,
      relevanceScore: 95,
      matchedSnippets: [{
        text: 'test',
        startIndex: 0,
        endIndex: 4,
        score: 0.9,
        context: 'test content'
      }],
      matchReason: 'content' as const
    }],
    totalResults: 1,
    searchTime: 50,
    searchType: 'hybrid' as const,
    filters: {},
    query: 'test',
    suggestions: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchService.searchDocuments.mockResolvedValue(mockSearchResults);
    (mockIntelligenceService.searchIntelligenceService.getSavedSearches as jest.Mock).mockReturnValue([]);
  });

  describe('Basic Functionality', () => {
    it('should initialize with correct defaults', () => {
      const { result } = renderHook(() => useDocumentSearch([mockDocument]));
      
      expect(result.current.query).toBe('');
      expect(result.current.results).toBeNull();
      expect(result.current.isSearching).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should update query state when search is called', () => {
      const { result } = renderHook(() => useDocumentSearch([mockDocument]));
      
      act(() => {
        result.current.search('test query');
      });
      
      expect(result.current.query).toBe('test query');
    });

    it('should clear search state', () => {
      const { result } = renderHook(() => useDocumentSearch([mockDocument]));
      
      act(() => {
        result.current.search('test');
      });
      
      act(() => {
        result.current.clearSearch();
      });
      
      expect(result.current.query).toBe('');
      expect(result.current.results).toBeNull();
    });

    it('should not search if query is too short', async () => {
      const { result } = renderHook(() => useDocumentSearch([mockDocument]));
      
      act(() => {
        result.current.search('a'); // Only 1 character
      });
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 350));
      
      expect(mockSearchService.searchDocuments).not.toHaveBeenCalled();
      expect(result.current.results).toBeNull();
    });
  });

  describe('Filter Management', () => {
    it('should update filters', () => {
      const { result } = renderHook(() => useDocumentSearch([mockDocument]));
      
      act(() => {
        result.current.updateFilters({ documentTypes: ['report'] });
      });
      
      expect(result.current.filters.documentTypes).toEqual(['report']);
    });

    it('should clear filters', () => {
      const { result } = renderHook(() => 
        useDocumentSearch([mockDocument], { documentTypes: ['report'] })
      );
      
      act(() => {
        result.current.clearFilters();
      });
      
      expect(result.current.filters).toEqual({});
    });
  });

  describe('Search Options', () => {
    it('should update search options', () => {
      const { result } = renderHook(() => useDocumentSearch([mockDocument]));
      
      act(() => {
        result.current.updateSearchOptions({ searchType: 'semantic' });
      });
      
      expect(result.current.searchOptions.searchType).toBe('semantic');
    });
  });

  describe('Cache Management', () => {
    it('should provide cache statistics', () => {
      const { result } = renderHook(() => useDocumentSearch([mockDocument]));
      
      const stats = result.current.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hitRate');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
    });

    it('should clear cache', () => {
      const { result } = renderHook(() => useDocumentSearch([mockDocument]));
      
      act(() => {
        result.current.clearCache();
      });
      
      const stats = result.current.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Saved Searches', () => {
    it('should load saved searches on mount', () => {
      const savedSearch: SavedSearch = {
        id: 'saved1',
        name: 'My Search',
        query: 'test',
        filters: {},
        options: { searchType: 'hybrid' },
        createdAt: new Date(),
        lastUsed: new Date(),
        useCount: 1,
        resultCount: 10
      };

      (mockIntelligenceService.searchIntelligenceService.getSavedSearches as jest.Mock).mockReturnValue([savedSearch]);

      const { result } = renderHook(() => useDocumentSearch([mockDocument]));
      
      expect(result.current.savedSearches).toHaveLength(1);
      expect(result.current.savedSearches[0].name).toBe('My Search');
    });

    it('should not save empty search', () => {
      const { result } = renderHook(() => useDocumentSearch([mockDocument]));
      
      act(() => {
        result.current.saveCurrentSearch('Empty');
      });
      
      expect((mockIntelligenceService.searchIntelligenceService.saveSearch as jest.Mock)).not.toHaveBeenCalled();
      expect(result.current.error).toBe('Cannot save empty search');
    });

    it('should delete saved search', () => {
      const { result } = renderHook(() => useDocumentSearch([mockDocument]));
      
      act(() => {
        result.current.deleteSavedSearch('saved1');
      });
      
      expect((mockIntelligenceService.searchIntelligenceService.deleteSavedSearch as jest.Mock)).toHaveBeenCalledWith('saved1');
    });
  });
});
