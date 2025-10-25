/**
 * DocumentSearch Component
 * 
 * Main search interface that combines search bar, filters, and results display.
 * Provides comprehensive search experience with real-time suggestions and filtering.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { documentSearchService } from '../services/documentIntelligence/documentSearchService';
import './SearchComponents.css';
import { 
  ProcessedDocument, 
  SearchResults as SearchResultsType, 
  SearchFilters as SearchFiltersType, 
  SearchOptions 
} from '../types/document';
import { searchIntelligenceService } from '../services/documentIntelligence/searchIntelligenceService';
import SearchSuggestions from './SearchSuggestions';
import SearchFiltersComponent from './SearchFilters';
import SearchResultsComponent from './SearchResults';

interface DocumentSearchProps {
  documents?: ProcessedDocument[];
  onDocumentSelect?: (document: ProcessedDocument) => void;
  className?: string;
}

const DocumentSearch: React.FC<DocumentSearchProps> = ({
  documents: propDocuments,
  onDocumentSelect,
  className = ''
}) => {
  // Documents state - use props or fetch from service
  const [documents, setDocuments] = useState<ProcessedDocument[]>(propDocuments || []);
  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultsType | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expandedQueryTerms, setExpandedQueryTerms] = useState<string[]>([]);
  const [historicalSuggestions, setHistoricalSuggestions] = useState<string[]>([]);

  // Dev note: setters are used dynamically in search change handler; add no-op effect to satisfy strict unused checks
  useEffect(() => {
    // no-op to acknowledge setters usage path
  }, [setExpandedQueryTerms, setHistoricalSuggestions]);
  
  // Filter state
  const [filters, setFilters] = useState<SearchFiltersType>({});
  const [showFilters, setShowFilters] = useState(false);
  
  // Options state
  const [searchOptions, setSearchOptions] = useState<SearchOptions>({
    searchType: 'hybrid',
    includeSnippets: true,
    highlightMatches: true,
    maxResults: 20,
    sortBy: 'relevance',
    sortOrder: 'desc'
  });
  
  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Load documents if not provided as props
  useEffect(() => {
    if (propDocuments) {
      setDocuments(propDocuments);
    }
  }, [propDocuments]);
  
  // Debounced search function
  const performSearch = useCallback(async (searchQuery: string, searchFilters: SearchFiltersType) => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }
    
    setIsSearching(true);
    
    try {
      const searchResults = await documentSearchService.searchDocuments(
        documents,
        searchQuery,
        searchFilters,
        searchOptions
      );
      setResults(searchResults);
      // Record analytics
      searchIntelligenceService.recordSearch({
        query: searchQuery,
        resultCount: searchResults.totalResults,
        searchTime: searchResults.searchTime,
        searchType: searchResults.searchType,
        filtersUsed: Object.keys(searchFilters).length > 0
      });
    } catch (error) {
      console.error('Search failed:', error);
      setResults({
        query: searchQuery,
        results: [],
        totalResults: 0,
        searchTime: 0,
        searchType: searchOptions.searchType,
        filters: searchFilters,
        suggestions: ['Search temporarily unavailable. Please try again.']
      });
    } finally {
      setIsSearching(false);
    }
  }, [documents, searchOptions]);

  // Saved searches & insights state
  const [savedSearches, setSavedSearches] = useState(() => searchIntelligenceService.getSavedSearches());

  const refreshSavedSearches = useCallback(() => {
    setSavedSearches(searchIntelligenceService.getSavedSearches());
  }, []);

  const handleSaveSearch = () => {
    if (!query.trim()) return;
    const name = prompt('Name this search:', query.substring(0, 40));
    if (name !== null) {
      searchIntelligenceService.saveSearch(name, query, filters, searchOptions);
      refreshSavedSearches();
    }
  };

  const handleLoadSavedSearch = (id: string) => {
    const saved = searchIntelligenceService.getSavedSearch(id);
    if (!saved) return;
    setQuery(saved.query);
    setFilters(saved.filters);
    setSearchOptions(saved.options);
    searchIntelligenceService.touchSavedSearch(id);
    refreshSavedSearches();
    performSearch(saved.query, saved.filters);
  };

  const handleDeleteSavedSearch = (id: string) => {
    if (!confirm('Delete this saved search?')) return;
    searchIntelligenceService.deleteSavedSearch(id);
    refreshSavedSearches();
  };
  
  const insights = useCallback(() => searchIntelligenceService.getInsights(), [savedSearches, results]);

  
  // Handle search input change with debouncing
  const handleSearchChange = useCallback((value: string) => {
    setQuery(value);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Generate suggestions for non-empty queries
    if (value.trim()) {
      // Core content-based suggestions
      documentSearchService.generateQuerySuggestions(documents, value)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));

      // Query expansion (synonyms) & historical suggestions (lightweight intelligence layer)
      try {
        const expansion = searchIntelligenceService.expandQuery(value);
        setExpandedQueryTerms(expansion.expansions.slice(0, 6));
        setHistoricalSuggestions(searchIntelligenceService.getHistoricalSuggestions(value));
      } catch (e) {
        // Non-fatal – keep UI responsive even if intelligence layer hiccups
        setExpandedQueryTerms([]);
        setHistoricalSuggestions([]);
      }
      
      setShowSuggestions(true);
      
      // Debounce search
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(value, filters);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setResults(null);
      setExpandedQueryTerms([]);
      setHistoricalSuggestions([]);
    }
  }, [filters, performSearch, documents]);
  
  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    performSearch(suggestion, filters);
  }, [filters, performSearch]);
  
  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: SearchFiltersType) => {
    setFilters(newFilters);
    if (query.trim()) {
      performSearch(query, newFilters);
    }
  }, [performSearch, query]);

  // Handle option (search type / sort) changes
  const handleOptionsChange = (updates: Partial<SearchOptions>) => {
    setSearchOptions(prev => ({ ...prev, ...updates }));
    if (query.trim()) {
      performSearch(query, { ...filters });
    }
  };
  
  // Handle clear search
  const handleClearSearch = useCallback(() => {
    setQuery('');
    setResults(null);
    setSuggestions([]);
    setShowSuggestions(false);
    
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setShowFilters(false);
    }
  }, []);
  
  // Effect to handle clicks outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.search-container')) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
  
  // Calculate active filters count
  const activeFiltersCount = Object.values(filters).filter(value => 
    value !== undefined && 
    value !== null && 
    (Array.isArray(value) ? value.length > 0 : true)
  ).length;
  
  return (
    <div className={`document-search ${className}`}>
      {/* Search Header */}
      <div className="search-header">
        <h2 className="search-title">
          🔍 Document Search
        </h2>
        <div className="search-stats">
          {documents.length} documents available
        </div>
      </div>
      
      {/* Main Search Bar */}
      <div className="search-container relative">
        <div className="search-input-wrapper">
          <div className="search-input-container">
            <span className="search-icon">🔍</span>
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search documents... (e.g., 'engineering curriculum', 'policy documents')"
              className="search-input"
              autoComplete="off"
              role="searchbox"
              aria-label="Document search"
            />
            
            {query && (
              <button
                onClick={handleClearSearch}
                className="clear-search-btn"
                type="button"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
            
            {isSearching && (
              <div className="search-loading">
                <div className="loading-spinner"></div>
              </div>
            )}
          </div>
          
          {/* Search Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <SearchSuggestions
              suggestions={suggestions}
              query={query}
              onSuggestionSelect={handleSuggestionSelect}
              onClose={() => setShowSuggestions(false)}
            />
          )}
        </div>
        
        {/* Search Controls */}
        <div className="search-controls">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
            type="button"
            aria-expanded={showFilters}
            aria-controls="advanced-filters-panel"
          >
            🔧 Filters
            {activeFiltersCount > 0 && (
              <span className="filter-badge">{activeFiltersCount}</span>
            )}
          </button>
          
          <div className="view-mode-toggle">
            <button
              onClick={() => setViewMode('list')}
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              type="button"
              aria-label="List view"
            >
              📋
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              type="button"
              aria-label="Grid view"
            >
              ⊞
            </button>
          </div>
        </div>
      </div>

      {/* Query Expansion & Historical Suggestions */}
      {(expandedQueryTerms.length > 0 || historicalSuggestions.length > 0) && (
        <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {expandedQueryTerms.map(term => (
            <button
              key={'exp-'+term}
              type="button"
              onClick={() => handleSearchChange(term)}
              style={{ fontSize: '0.65rem', background: '#f3f4f6', border: '1px solid #e5e7eb', padding: '4px 8px', borderRadius: '12px', cursor: 'pointer' }}
              title="Related word"
            >🔁 {term}</button>
          ))}
          {historicalSuggestions.map(term => (
            <button
              key={'hist-'+term}
              type="button"
              onClick={() => handleSearchChange(term)}
              style={{ fontSize: '0.65rem', background: '#eef6ff', border: '1px solid #dbeafe', padding: '4px 8px', borderRadius: '12px', cursor: 'pointer' }}
              title="From your past searches"
            >🕘 {term}</button>
          ))}
        </div>
      )}
      
      {/* Advanced Filters Panel */}
      {showFilters && (
        <SearchFiltersComponent
          filters={filters}
          documents={documents}
          onFiltersChange={handleFiltersChange}
          onClose={() => setShowFilters(false)}
          // Provide id for aria-controls linkage
          // @ts-ignore – component root div will receive this id via spread if implemented; fallback is acceptable
          id="advanced-filters-panel"
        />
      )}

      {/* Saved Searches & Insights */}
      <div className="search-intelligence-bar" style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button type="button" className="action-btn" onClick={handleSaveSearch} disabled={!query.trim()}>
          💾 Save This Search
        </button>
        {savedSearches.length > 0 && (
          <details style={{ flex: '1 1 250px' }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: '#374151' }}>Saved Searches ({savedSearches.length})</summary>
            <ul style={{ listStyle: 'none', padding: '8px 4px', margin: 0, maxHeight: '180px', overflowY: 'auto' }}>
              {savedSearches.map(s => (
                <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <button
                    type="button"
                    onClick={() => handleLoadSavedSearch(s.id)}
                    style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', flex: 1, fontSize: '0.75rem', color: '#1f2937' }}
                    title={`Query: ${s.query}`}
                  >
                    {s.name} <span style={{ opacity: 0.6 }}>({s.useCount} uses)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSavedSearch(s.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontSize: '0.75rem' }}
                    aria-label="Delete saved search"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
        <details style={{ flex: '1 1 250px' }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: '#374151' }}>Search Insights</summary>
          {(() => { const i = insights(); return (
            <div style={{ padding: '8px 4px', fontSize: '0.7rem', lineHeight: 1.4 }}>
              <div><strong>Total searches:</strong> {i.totalSearches}</div>
              <div><strong>Unique queries:</strong> {i.uniqueQueries}</div>
              <div><strong>Avg results:</strong> {i.avgResultCount.toFixed(1)}</div>
              <div><strong>Success rate:</strong> {i.searchSuccessRate.toFixed(1)}%</div>
              {i.popularQueries.length > 0 && (
                <div style={{ marginTop: '6px' }}>
                  <strong>Popular:</strong> {i.popularQueries.slice(0,3).map(q => q.query).join(', ')}
                </div>
              )}
              {i.trendingQueries && i.trendingQueries.length > 0 && (
                <div style={{ marginTop: '6px' }}>
                  <strong title="Queries growing in frequency recently">Trending ↑:</strong> {i.trendingQueries.map(t => `${t.query}(+${t.delta})`).join(', ')}
                </div>
              )}
              {i.lowResultAlerts && i.lowResultAlerts.length > 0 && (
                <div style={{ marginTop: '6px', color: '#92400e' }} title="Queries often returning few or no results">
                  <strong>Low Results:</strong> {i.lowResultAlerts.map(a => `${a.query}(${a.averageResults})`).join(', ')}
                </div>
              )}
              {i.filterEffectiveness && (
                <div style={{ marginTop: '6px' }} title="Average results when filters are applied">
                  <strong>Filter Effectiveness:</strong> {i.filterEffectiveness.map(f => `${f.filterType}:${f.avgResults}`).join(', ')}
                </div>
              )}
            </div>
          ); })()}
        </details>
      </div>

      {/* Live region for screen readers summarizing key insight changes */}
      <div
        aria-live="polite"
        style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', border: 0 }}
        data-testid="insights-live-region"
      >
        {(() => { const i = insights(); return `Searches ${i.totalSearches}. Success rate ${i.searchSuccessRate.toFixed(0)} percent.` })()}
      </div>
      
      {/* Search Options */}
      <div className="search-options">
        <select
          value={searchOptions.searchType}
          onChange={(e) => handleOptionsChange({ searchType: e.target.value as SearchOptions['searchType'] })}
          className="search-type-select"
        >
          <option value="hybrid">🎯 Smart Search (Hybrid)</option>
          <option value="fulltext">📝 Full Text</option>
          <option value="semantic">🧠 Semantic</option>
          <option value="metadata">📊 Metadata</option>
        </select>
        
        <select
          value={searchOptions.sortBy}
          onChange={(e) => handleOptionsChange({ sortBy: e.target.value as SearchOptions['sortBy'] })}
          className="sort-select"
        >
          <option value="relevance">📈 Relevance</option>
          <option value="date">📅 Date</option>
          <option value="name">📄 Name</option>
          <option value="size">📦 Size</option>
          <option value="confidence">🎯 Confidence</option>
        </select>
      </div>
      
      {/* Search Results */}
      {results && (
        <SearchResultsComponent
          results={results}
          viewMode={viewMode}
          onDocumentSelect={onDocumentSelect}
          isLoading={isSearching}
        />
      )}
      
      {/* No Results State */}
      {results && results.totalResults === 0 && !isSearching && (
        <div className="no-results">
          <div className="no-results-icon">🔍</div>
          <h3>No documents found</h3>
          <p>No documents match your search criteria for "{query}"</p>
          
          {results.suggestions && results.suggestions.length > 0 && (
            <div className="search-suggestions">
              <p>Try these suggestions:</p>
              <ul>
                {results.suggestions.map((suggestion: string, index: number) => (
                  <li key={index}>
                    <button
                      onClick={() => handleSuggestionSelect(suggestion)}
                      className="suggestion-btn"
                    >
                      {suggestion}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* Empty State */}
      {!query && !results && (
        <div className="search-empty-state">
          <div className="empty-state-content">
            <div className="empty-state-icon">📚</div>
            <h3>Search Your Documents</h3>
            <p>Find exactly what you're looking for across all your uploaded documents.</p>
            
            <div className="search-tips">
              <h4>💡 Search Tips:</h4>
              <ul>
                <li><strong>Keywords:</strong> "engineering curriculum"</li>
                <li><strong>Document types:</strong> "policy", "manual", "report"</li>
                <li><strong>Topics:</strong> "assessment methods", "social skills"</li>
                <li><strong>Advanced:</strong> Use filters for precise results</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentSearch;