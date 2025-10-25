import { useCallback, useEffect, useMemo, useState } from 'react';
import { DateRangeFilter } from './DateRangeFilter';
import { FileSizeFilter } from './FileSizeFilter';
import { pdfExportService } from '../services/pdfExportService';
import DocumentUpload from './DocumentUpload/DocumentUpload';
import DocumentList from './DocumentList';
import DocumentInsightsPanel from './DocumentInsightsPanel';
import DocumentQuestionPanel from './DocumentQuestionPanel';
import { useDocumentProcessing } from '../hooks/useDocumentProcessing';
import { useDocumentSearch } from '../hooks/useDocumentSearch';
import type { ProcessedDocument, UploadProgress } from '../types/document';

function UploadQueue({
  uploadProgress,
  onCancel,
  onClear,
}: {
  uploadProgress: Map<string, UploadProgress>;
  onCancel: (fileId: string) => void;
  onClear: () => void;
}) {
  if (uploadProgress.size === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Active Uploads</h3>
        <button
          className="text-sm text-blue-600 hover:text-blue-800"
          onClick={onClear}
        >
          Clear completed
        </button>
      </div>
      <div className="space-y-3">
        {Array.from(uploadProgress.entries()).map(([fileId, progress]) => (
          <div key={fileId} className="rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{progress.fileName}</p>
                <p className="text-xs text-gray-500">
                  {progress.status === 'error'
                    ? progress.error
                    : progress.status === 'ready'
                    ? 'Upload complete — queued for processing'
                    : `${progress.progress}% uploaded`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {progress.status === 'uploading' && (
                  <button
                    className="text-xs text-red-500 hover:text-red-700"
                    onClick={() => onCancel(fileId)}
                  >
                    Cancel
                  </button>
                )}
                <span
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    progress.status === 'ready'
                      ? 'text-green-600'
                      : progress.status === 'error'
                      ? 'text-red-600'
                      : 'text-blue-600'
                  }`}
                >
                  {progress.status}
                </span>
              </div>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
              <div
                className={`h-2 rounded-full ${
                  progress.status === 'error'
                    ? 'bg-red-500'
                    : progress.status === 'ready'
                    ? 'bg-green-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function EventTimeline({
  events,
  lastEvent,
}: {
  events: ReturnType<typeof useDocumentProcessing>['eventHistory'];
  lastEvent: ReturnType<typeof useDocumentProcessing>['lastEvent'];
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Processor Events</h3>
        {lastEvent && (
          <span className="text-xs text-gray-500">
            Last: {lastEvent.type.replace('_', ' ')}
          </span>
        )}
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-gray-500">No processing events yet.</p>
      ) : (
        <ol className="space-y-2 text-sm text-gray-700">
          {[...events].reverse().map((event, index) => {
            const payload = event.payload as Record<string, unknown>;
            const identifier = (payload.documentId ?? payload.fileId ?? 'unknown') as string;
            return (
              <li
                key={`${identifier}-${index}`}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
              >
                <span className="font-medium">{event.type.replace('_', ' ')}</span>
                <span className="text-xs text-gray-500">Document {identifier}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export default function DocumentWorkspace() {
  const {
    documents,
    uploadProgress,
    isUploading,
    storageLoading,
    storageError,
    ingestFiles,
    cancelUpload,
    clearCompletedUploads,
    deleteDocument,
    retryDocument,
    lastEvent,
    eventHistory,
  } = useDocumentProcessing();

  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  // Initialize search hook
  const {
    query,
    results,
    isSearching,
    error: searchError,
    search,
    clearSearch,
    updateFilters,
    filters,
    savedSearches,
    loadSavedSearch,
    saveCurrentSearch,
    getCacheStats,
  } = useDocumentSearch(documents);

  // Determine which documents to display (search results or all)
  const displayDocuments = useMemo(() => {
    if (!results) return documents;
    return results.results.map(result => result.document);
  }, [documents, results]);

  useEffect(() => {
    if (documents.length === 0) {
      setSelectedDocumentId(null);
      return;
    }

    const exists = documents.some((doc) => doc.id === selectedDocumentId);
    if (exists) {
      return;
    }

    const preferred = documents.find((doc) => doc.status === 'ready') ?? documents[0];
    setSelectedDocumentId(preferred?.id ?? null);
  }, [documents, selectedDocumentId]);

  const selectedDocument = useMemo<ProcessedDocument | null>(() => {
    if (!selectedDocumentId) {
      return null;
    }
    return documents.find((doc) => doc.id === selectedDocumentId) ?? null;
  }, [documents, selectedDocumentId]);

  const relatedDocuments = useMemo(() => documents, [documents]);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    await ingestFiles(files);
  }, [ingestFiles]);

  const handleSaveSearch = () => {
    if (query) {
      const name = prompt('Enter name for this search:');
      if (name) {
        saveCurrentSearch(name);
      }
    }
  };

  const cacheStats = getCacheStats();

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Document Intelligence</h2>
          <p className="text-sm text-gray-500">
            Upload, process, and explore your documents powered by Gemini OCR.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            {showSearch ? 'Hide Search' : '🔍 Search Documents'}
          </button>
          <div className="text-sm text-gray-600">
            {storageLoading ? 'Loading documents…' : `${documents.length} stored`}
          </div>
        </div>
      </header>

      {/* Search Panel */}
      {showSearch && (
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Document Search</h3>
            {cacheStats.size > 0 && (
              <span className="text-xs text-gray-600">
                Cache: {cacheStats.size} searches, {cacheStats.hitRate.toFixed(1)}% hit rate
              </span>
            )}
          </div>
          {results && results.totalResults > 0 && (
            <div>
              <button
                onClick={() => pdfExportService.downloadPdf(results, { title: 'Document Search Report', includeFilters: true })}
                className="text-xs rounded bg-purple-600 text-white px-3 py-1 hover:bg-purple-700 transition-colors"
              >
                📄 Export PDF
              </button>
            </div>
          )}

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => search(e.target.value)}
              placeholder="Search documents... (min 2 characters)"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-24 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300"
              >
                Clear
              </button>
            )}
            {isSearching && (
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={filters.documentTypes?.[0] || ''}
              onChange={(e) => updateFilters({ documentTypes: e.target.value ? [e.target.value as any] : undefined })}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Types</option>
              <option value="report">Reports</option>
              <option value="article">Articles</option>
              <option value="email">Emails</option>
              <option value="presentation">Presentations</option>
              <option value="other">Other</option>
            </select>

            {/* Date Range Filter (Sprint 1) */}
            <DateRangeFilter
              value={filters.dateRange}
              onChange={(range) => updateFilters({ dateRange: range })}
            />

            {/* File Size Filter (Sprint 1) */}
            <FileSizeFilter
              value={filters.sizeRange}
              onChange={(range) => updateFilters({ sizeRange: range })}
            />

            {savedSearches.length > 0 && (
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    loadSavedSearch(e.target.value);
                  }
                }}
                value=""
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Load Saved Search...</option>
                {savedSearches.map(saved => (
                  <option key={saved.id} value={saved.id}>
                    {saved.name} ({saved.useCount} uses)
                  </option>
                ))}
              </select>
            )}

            {query && (
              <button
                onClick={handleSaveSearch}
                className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
              >
                💾 Save Search
              </button>
            )}
          </div>

          {/* Search Error */}
          {searchError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {searchError}
            </div>
          )}

          {/* Search Results Summary */}
          {results && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-green-900">
                  Found {results.totalResults} result{results.totalResults !== 1 ? 's' : ''} in {results.searchTime}ms
                </span>
                <span className="text-xs text-green-700">
                  {results.searchType} search
                </span>
              </div>
              {(filters.dateRange || filters.sizeRange) && (
                <div className="mt-1 text-xs text-green-700 flex flex-wrap gap-2">
                  {filters.dateRange && (
                    <span>
                      Date: {filters.dateRange.start.toLocaleDateString()} – {filters.dateRange.end.toLocaleDateString()}
                    </span>
                  )}
                  {filters.sizeRange && (
                    <span>
                      Size: {(filters.sizeRange.min/1024).toFixed(0)}KB – {(filters.sizeRange.max/1024).toFixed(0)}KB
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <DocumentUpload
        onFilesSelected={handleFilesSelected}
        onError={(error) => console.error('Upload error:', error)}
        disabled={isUploading}
        uploadProgressMap={uploadProgress}
      />

      {storageError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {storageError.message}
        </div>
      )}

      <UploadQueue
        uploadProgress={uploadProgress}
        onCancel={cancelUpload}
        onClear={clearCompletedUploads}
      />

      <DocumentList
        documents={displayDocuments}
        onRetry={retryDocument}
        onDelete={deleteDocument}
        onSelect={setSelectedDocumentId}
        selectedDocumentId={selectedDocumentId}
      />

      {documents.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DocumentInsightsPanel document={selectedDocument} />
          <DocumentQuestionPanel
            document={selectedDocument}
            relatedDocuments={relatedDocuments}
          />
        </div>
      )}

      <EventTimeline events={eventHistory} lastEvent={lastEvent} />
    </div>
  );
}
