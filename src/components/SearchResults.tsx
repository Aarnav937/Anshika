/**
 * SearchResults Component
 * 
 * Displays search results with snippets, relevance scores, and view options.
 * Supports both grid and list view modes with rich result information.
 */

import React from 'react';
import './SearchComponents.css';
import { 
  SearchResults as SearchResultsType, 
  ProcessedDocument 
} from '../types/document';

interface SearchResultsProps {
  results: SearchResultsType;
  viewMode: 'grid' | 'list';
  onDocumentSelect?: (document: ProcessedDocument) => void;
  isLoading?: boolean;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  viewMode,
  onDocumentSelect,
  isLoading = false
}) => {
  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  // Get match reason icon
  const getMatchReasonIcon = (reason: string) => {
    switch (reason) {
      case 'content': return '📄';
      case 'title': return '📋';
      case 'metadata': return '📊';
      case 'semantic': return '🧠';
      case 'tags': return '🏷️';
      default: return '🔍';
    }
  };

  // Get confidence color
  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  };

  // Render result card
  const renderResultCard = (result: any, index: number) => {
    const document = result.document;
    
    return (
      <div
        key={document.id}
        className={`search-result-card ${viewMode}-view`}
        onClick={() => onDocumentSelect?.(document)}
      >
        {/* Result Header */}
        <div className="result-header">
          <div className="result-rank">#{index + 1}</div>
          <div className="result-score">
            <span className={`score-badge ${getConfidenceColor(result.relevanceScore)}`}>
              {result.relevanceScore}%
            </span>
          </div>
        </div>

        {/* Document Info */}
        <div className="result-content">
          <div className="document-title">
            <span className="document-icon">
              {document.summary?.documentType === 'policy' ? '📋' :
               document.summary?.documentType === 'manual' ? '📖' :
               document.summary?.documentType === 'report' ? '📊' :
               document.summary?.documentType === 'research' ? '🔬' :
               '📄'}
            </span>
            <h3>{document.summary?.title || document.originalFile.name}</h3>
          </div>

          <div className="document-meta">
            <span className="meta-item">
              <span className="meta-icon">{getMatchReasonIcon(result.matchReason)}</span>
              <span className="meta-text">
                {result.matchReason === 'content' ? 'Content Match' :
                 result.matchReason === 'title' ? 'Title Match' :
                 result.matchReason === 'metadata' ? 'Metadata Match' :
                 result.matchReason === 'semantic' ? 'Semantic Match' :
                 'Keyword Match'}
              </span>
            </span>

            <span className="meta-item">
              <span className="meta-icon">📦</span>
              <span className="meta-text">{formatFileSize(document.originalFile.size)}</span>
            </span>

            <span className="meta-item">
              <span className="meta-icon">📅</span>
              <span className="meta-text">
                {formatDate(document.processedAt || document.uploadedAt)}
              </span>
            </span>

            {document.summary?.confidence && (
              <span className="meta-item">
                <span className="meta-icon">🎯</span>
                <span className="meta-text">{document.summary.confidence}% confidence</span>
              </span>
            )}
          </div>

          {/* Search Snippets */}
          {result.matchedSnippets && result.matchedSnippets.length > 0 && (
            <div className="result-snippets">
              {result.matchedSnippets.slice(0, 2).map((snippet: any, snippetIndex: number) => (
                <div key={snippetIndex} className="snippet">
                  <div className="snippet-score">
                    Score: {Math.round(snippet.score * 100)}%
                  </div>
                  <div 
                    className="snippet-text"
                    dangerouslySetInnerHTML={{ 
                      __html: snippet.highlightedText || snippet.text 
                    }}
                  />
                  {snippet.context && (
                    <div className="snippet-context">
                      Context: {snippet.context}
                    </div>
                  )}
                </div>
              ))}
              
              {result.matchedSnippets.length > 2 && (
                <div className="more-snippets">
                  +{result.matchedSnippets.length - 2} more matches
                </div>
              )}
            </div>
          )}

          {/* Document Summary */}
          {document.summary?.mainPoints && document.summary.mainPoints.length > 0 && (
            <div className="result-summary">
              <h4>Key Points:</h4>
              <ul>
                {document.summary.mainPoints.slice(0, 3).map((point: string, pointIndex: number) => (
                  <li key={pointIndex}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Tags */}
          {document.tags && document.tags.length > 0 && (
            <div className="result-tags">
              {document.tags.slice(0, 5).map((tag: string, tagIndex: number) => (
                <span key={tagIndex} className="tag">
                  {tag}
                </span>
              ))}
              {document.tags.length > 5 && (
                <span className="tag more-tags">
                  +{document.tags.length - 5}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Result Actions */}
        <div className="result-actions">
          <button 
            className="action-btn primary"
            onClick={(e) => {
              e.stopPropagation();
              onDocumentSelect?.(document);
            }}
          >
            📖 Open
          </button>
          
          <button 
            className="action-btn secondary"
            onClick={(e) => {
              e.stopPropagation();
              // Could add document preview functionality
            }}
          >
            👁️ Preview
          </button>

          {result.semanticSimilarity && (
            <div className="semantic-similarity">
              <span className="similarity-label">Semantic:</span>
              <span className="similarity-score">
                {Math.round(result.semanticSimilarity * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="search-results loading">
        <div className="loading-message">
          <div className="loading-spinner"></div>
          <span>Searching documents...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`search-results ${viewMode}-view`}>
      {/* Results Header */}
      <div className="results-header">
        <div className="results-info">
          <h3>Search Results</h3>
          <div className="results-stats">
            <span className="results-count">
              {results.totalResults} document{results.totalResults !== 1 ? 's' : ''} found
            </span>
            <span className="search-time">
              in {results.searchTime}ms
            </span>
            <span className="search-type">
              using {results.searchType} search
            </span>
          </div>
        </div>

        <div className="results-query">
          <span className="query-label">Query:</span>
          <span className="query-text">"{results.query}"</span>
        </div>
      </div>

      {/* Results List */}
      <div className={`results-container ${viewMode}-container`}>
        {results.results.map((result, index) => 
          renderResultCard(result, index)
        )}
      </div>

      {/* Results Footer */}
      {results.totalResults > 0 && (
        <div className="results-footer">
          <div className="search-performance">
            ⚡ Search completed in {results.searchTime}ms
          </div>
          
          {results.totalResults >= 20 && (
            <div className="pagination-hint">
              Showing top 20 results. Refine your search for more specific results.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchResults;