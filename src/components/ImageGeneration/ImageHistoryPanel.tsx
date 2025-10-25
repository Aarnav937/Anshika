/**
 * ImageHistoryPanel Component
 * Displays image generation history with sessions and versions
 */

import { useState } from 'react';
import { useImageHistory } from '../../hooks/imageGeneration/useImageHistory';
import { Search, Trash2, Download, Eye, Calendar, Tag, Clock } from 'lucide-react';

export function ImageHistoryPanel() {
  const {
    sessions,
    currentSession,
    versions,
    selectedVersions,
    comparison,
    stats,
    isLoading,
    error,
  loadSession,
  loadAllSessions,
  deleteSession,
  deleteVersion,
  compareVersions,
  clearComparison,
  toggleVersionSelection,
  clearSelection,
  searchSessions,
  exportSession,
  } = useImageHistory();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const handleSearch = async () => {
    await searchSessions(searchQuery);
  };

  const handleSessionClick = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    await loadSession(sessionId);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (error) {
    return (
      <div className="p-6 bg-red-50 border-2 border-red-400 rounded-lg text-red-800">
        <h3 className="text-lg font-semibold mb-2">❌ Error Loading History</h3>
        <p>{error}</p>
        <button
          onClick={loadAllSessions}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-800">📚 Image Generation History</h3>
        {stats && (
          <div className="text-sm text-gray-600">
            {stats.totalSessions} sessions • {stats.totalVersions} versions
          </div>
        )}
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search sessions by prompt..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          Search
        </button>
        <button
          onClick={loadAllSessions}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-2 text-gray-600">Loading history...</span>
        </div>
      )}

      {/* Sessions List */}
      {!isLoading && sessions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No image generation sessions found.</p>
          <p className="text-sm">Generate some images to see your history here!</p>
        </div>
      )}

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
              selectedSessionId === session.id
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300'
            }`}
            onClick={() => handleSessionClick(session.id)}
          >
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-semibold text-gray-800 truncate flex-1">
                {session.basePrompt.length > 50
                  ? `${session.basePrompt.substring(0, 50)}...`
                  : session.basePrompt}
              </h4>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this session?')) {
                    deleteSession(session.id);
                  }
                }}
                className="text-red-500 hover:text-red-700 p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(session.createdAt)}</span>
              </div>

              {session.tags && session.tags.length > 0 && (
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  <div className="flex gap-1">
                    {session.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                    {session.tags.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{session.tags.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{session.versions.length} versions</span>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  exportSession(session.id);
                }}
                className="flex-1 px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
              >
                <Download className="w-3 h-3 inline mr-1" />
                Export
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // View session details
                }}
                className="flex-1 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
              >
                <Eye className="w-3 h-3 inline mr-1" />
                View
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Session Details */}
      {selectedSessionId && currentSession && versions.length > 0 && (
        <div className="border-2 border-gray-200 rounded-lg p-6 bg-gray-50">
          <h4 className="text-xl font-bold text-gray-800 mb-4">
            Session Details: {currentSession.basePrompt}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {versions.map((version) => (
              <div
                key={version.id}
                className={`border-2 rounded-lg p-4 bg-white ${
                  selectedVersions.includes(version.id)
                    ? 'border-purple-500'
                    : 'border-gray-200'
                }`}
              >
                <div className="aspect-video bg-gray-100 rounded-lg mb-3 overflow-hidden flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Eye className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-xs">Image {version.imageId}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-800 line-clamp-2">
                    {version.prompt}
                  </p>

                  <div className="text-xs text-gray-600 space-y-1">
                    <p>Generated: {formatDate(version.timestamp)}</p>
                    <p>Time: {version.generationTime.toFixed(2)}s</p>
                    <p>Model: Gemini 2.5 Flash</p>
                  </div>

                  {version.notes && (
                    <p className="text-xs text-gray-700 italic">
                      "{version.notes}"
                    </p>
                  )}

                  <div className="flex gap-1 mt-2">
                    <button
                      onClick={() => toggleVersionSelection(version.id)}
                      className={`flex-1 px-2 py-1 rounded text-xs ${
                        selectedVersions.includes(version.id)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {selectedVersions.includes(version.id) ? 'Selected' : 'Select'}
                    </button>

                    <button
                      onClick={() => {
                        if (confirm('Delete this version?')) {
                          deleteVersion(version.id);
                        }
                      }}
                      className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Version Actions */}
          {selectedVersions.length > 0 && (
            <div className="mt-4 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium text-purple-800">
                  {selectedVersions.length} version{selectedVersions.length > 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  {selectedVersions.length === 2 && (
                    <button
                      onClick={() => compareVersions(selectedVersions[0], selectedVersions[1])}
                      className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                      Compare
                    </button>
                  )}
                  <button
                    onClick={clearSelection}
                    className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Comparison View */}
          {comparison && (
            <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <h5 className="font-bold text-blue-800 mb-2">Version Comparison</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h6 className="font-medium text-blue-700">Version 1</h6>
                  <p className="text-sm text-gray-700">{comparison.version1.prompt}</p>
                </div>
                <div>
                  <h6 className="font-medium text-blue-700">Version 2</h6>
                  <p className="text-sm text-gray-700">{comparison.version2.prompt}</p>
                </div>
              </div>
              <button
                onClick={clearComparison}
                className="mt-2 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Clear Comparison
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
