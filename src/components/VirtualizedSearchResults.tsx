/**
 * Virtualized Search Results Component
 * 
 * Uses @tanstack/react-virtual for efficient rendering of large result sets.
 * Only renders visible items, dramatically improving performance for 10,000+ results.
 * 
 * Features:
 * - Virtual scrolling (only renders visible items)
 * - Smooth scrolling experience
 * - Minimal memory footprint
 * - Works with existing SearchResult type
 */

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, memo } from 'react';
import type { SearchResult } from '../types/document';
import {
  getDocumentDisplayName,
  extractTextPreview,
  formatAnalysisDate,
} from '../utils/documentUtils';
import { formatFileSize } from '../utils/fileValidation';

export interface VirtualizedSearchResultsProps {
  results: SearchResult[];
  onSelectDocument?: (documentId: string) => void;
  selectedDocumentId?: string | null;
  itemHeight?: number; // Optional: fixed height for better performance
}

interface ResultItemProps {
  result: SearchResult;
  isSelected: boolean;
  onClick?: () => void;
}

/**
 * Individual result item component (memoized for performance)
 */
const ResultItem = memo(({ result, isSelected, onClick }: ResultItemProps) => {
  const { document, relevanceScore, matchReason, matchedSnippets } = result;
  const fileName = document.originalFile?.name ?? getDocumentDisplayName(document);
  const fileSize = document.originalFile?.size;
  const uploadDate = document.uploadedAt;

  return (
    <article
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : -1}
      className={`rounded-lg border bg-white p-4 shadow-sm transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 cursor-pointer ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
      }`}
    >
      {/* Header */}
      <header className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 truncate">{fileName}</h4>
          <p className="text-xs text-gray-500 mt-0.5">
            {uploadDate && formatAnalysisDate(uploadDate)}
            {fileSize && ` · ${formatFileSize(fileSize)}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
            {Math.round(relevanceScore)}% match
          </span>
        </div>
      </header>

      {/* Preview text */}
      {document.previewText && (
        <p className="text-sm text-gray-700 line-clamp-2 mb-2">
          {extractTextPreview(document, 150)}
        </p>
      )}

      {/* Match info */}
      <div className="flex items-center gap-3 text-xs text-gray-600">
        <span className="capitalize">
          <span className="font-medium">Match:</span> {matchReason}
        </span>
        {matchedSnippets.length > 0 && (
          <span>
            <span className="font-medium">{matchedSnippets.length}</span> snippet{matchedSnippets.length !== 1 ? 's' : ''}
          </span>
        )}
        {document.summary && (
          <span className="capitalize">
            {document.summary.documentType}
          </span>
        )}
      </div>

      {/* Matched snippets (first 2) */}
      {matchedSnippets.length > 0 && (
        <div className="mt-2 space-y-1">
          {matchedSnippets.slice(0, 2).map((snippet, index) => (
            <div
              key={index}
              className="rounded bg-yellow-50 border border-yellow-200 px-2 py-1 text-xs text-gray-800"
            >
              <span className="text-gray-500">...{snippet.context.slice(0, 80)}...</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
});

ResultItem.displayName = 'ResultItem';

/**
 * Virtualized list component
 */
function VirtualizedSearchResultsComponent({
  results,
  onSelectDocument,
  selectedDocumentId,
  itemHeight = 200, // Estimated height per item
}: VirtualizedSearchResultsProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Initialize virtualizer
  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5, // Render 5 extra items above and below viewport
  });

  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
        No results found
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className="space-y-2">
      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing {results.length} result{results.length !== 1 ? 's' : ''}
        </span>
        <span className="text-xs text-gray-500">
          Virtual scrolling active
        </span>
      </div>

      {/* Scrollable container */}
      <div
        ref={parentRef}
        className="h-[600px] overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-2"
        style={{ contain: 'strict' }}
      >
        {/* Virtual list container */}
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {/* Rendered items */}
          {virtualItems.map((virtualItem) => {
            const result = results[virtualItem.index];
            const isSelected = selectedDocumentId === result.document.id;

            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <div className="px-2 pb-3">
                  <ResultItem
                    result={result}
                    isSelected={isSelected}
                    onClick={() => onSelectDocument?.(result.document.id)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance info */}
      <div className="text-xs text-gray-500 text-center">
        Rendering {virtualItems.length} of {results.length} items
      </div>
    </div>
  );
}

export const VirtualizedSearchResults = memo(VirtualizedSearchResultsComponent);
VirtualizedSearchResults.displayName = 'VirtualizedSearchResults';
