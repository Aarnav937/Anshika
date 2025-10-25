import { useState, useMemo } from 'react';
import {
  DocumentComparison,
  ProcessedDocument,
  ComparisonSection,
  SimilarityLevel
} from '../types/document';
import { getDocumentDisplayName } from '../utils/documentUtils';
import { formatFileSize } from '../utils/fileValidation';

interface DocumentComparisonViewerProps {
  comparison: DocumentComparison;
  document1?: ProcessedDocument;
  document2?: ProcessedDocument;
  onClose?: () => void;
  className?: string;
}

const getSimilarityColor = (score: number): string => {
  if (score >= 80) return 'text-green-600 bg-green-50';
  if (score >= 60) return 'text-blue-600 bg-blue-50';
  if (score >= 40) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
};



const getConfidenceColor = (level: SimilarityLevel): string => {
  switch (level) {
    case 'very-high': return 'text-green-700 bg-green-100';
    case 'high': return 'text-green-600 bg-green-50';
    case 'medium': return 'text-yellow-600 bg-yellow-50';
    case 'low': return 'text-orange-600 bg-orange-50';
    case 'very-low': return 'text-red-600 bg-red-50';
  }
};

const getSectionTypeColor = (type: ComparisonSection['sectionType']): string => {
  switch (type) {
    case 'similar': return 'border-l-green-500 bg-green-50';
    case 'different': return 'border-l-red-500 bg-red-50';
    case 'unique-to-doc1': return 'border-l-blue-500 bg-blue-50';
    case 'unique-to-doc2': return 'border-l-purple-500 bg-purple-50';
  }
};

const getSectionTypeIcon = (type: ComparisonSection['sectionType']): string => {
  switch (type) {
    case 'similar': return '✅';
    case 'different': return '❌';
    case 'unique-to-doc1': return '1️⃣';
    case 'unique-to-doc2': return '2️⃣';
  }
};

const getImportanceIcon = (importance: ComparisonSection['importance']): string => {
  switch (importance) {
    case 'high': return '🔥';
    case 'medium': return '⭐';
    case 'low': return '💡';
  }
};

export default function DocumentComparisonViewer({
  comparison,
  document1,
  document2,
  onClose,
  className = ''
}: DocumentComparisonViewerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'sections' | 'insights'>('overview');
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  const documentNames = useMemo(() => ({
    doc1: document1 ? getDocumentDisplayName(document1) : `Document ${comparison.document1Id.slice(-8)}`,
    doc2: document2 ? getDocumentDisplayName(document2) : `Document ${comparison.document2Id.slice(-8)}`
  }), [comparison, document1, document2]);

  const sortedSections = useMemo(() => 
    [...comparison.sections].sort((a, b) => {
      const importanceOrder = { high: 3, medium: 2, low: 1 };
      return importanceOrder[b.importance] - importanceOrder[a.importance];
    }),
    [comparison.sections]
  );

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold">Document Comparison Results</h2>
            <p className="text-blue-100 mt-1 text-sm">
              {documentNames.doc1} vs {documentNames.doc2}
            </p>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{comparison.metrics.overallScore}%</div>
            <div className="text-xs text-blue-100">Overall</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{comparison.metrics.textSimilarity}%</div>
            <div className="text-xs text-blue-100">Text</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{comparison.metrics.semanticSimilarity}%</div>
            <div className="text-xs text-blue-100">Semantic</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold capitalize">{comparison.relationshipType}</div>
            <div className="text-xs text-blue-100">Relationship</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'sections', label: 'Detailed Analysis', icon: '🔍' },
            { id: 'insights', label: 'Key Insights', icon: '💡' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                py-3 border-b-2 font-medium text-sm transition-colors flex items-center gap-2
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* AI Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                🤖 AI Summary
                <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(comparison.metrics.confidenceLevel)}`}>
                  {comparison.metrics.confidenceLevel} confidence
                </span>
              </h3>
              <p className="text-gray-700 leading-relaxed">{comparison.aiSummary}</p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Text Similarity</h4>
                  <span className={`text-sm px-2 py-1 rounded ${getSimilarityColor(comparison.metrics.textSimilarity)}`}>
                    {comparison.metrics.textSimilarity}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${comparison.metrics.textSimilarity}%` }}
                  />
                </div>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Structural</h4>
                  <span className={`text-sm px-2 py-1 rounded ${getSimilarityColor(comparison.metrics.structuralSimilarity)}`}>
                    {comparison.metrics.structuralSimilarity}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${comparison.metrics.structuralSimilarity}%` }}
                  />
                </div>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Semantic</h4>
                  <span className={`text-sm px-2 py-1 rounded ${getSimilarityColor(comparison.metrics.semanticSimilarity)}`}>
                    {comparison.metrics.semanticSimilarity}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${comparison.metrics.semanticSimilarity}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Document Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">1</span>
                  {documentNames.doc1}
                </h4>
                {document1 && (
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Type: {document1.summary?.documentType || 'Unknown'}</div>
                    <div>Size: {formatFileSize(document1.originalFile.size)}</div>
                    <div>Words: {document1.summary?.wordCount || 'Unknown'}</div>
                  </div>
                )}
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">2</span>
                  {documentNames.doc2}
                </h4>
                {document2 && (
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Type: {document2.summary?.documentType || 'Unknown'}</div>
                    <div>Size: {formatFileSize(document2.originalFile.size)}</div>
                    <div>Words: {document2.summary?.wordCount || 'Unknown'}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sections Tab */}
        {activeTab === 'sections' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Detailed Analysis Sections</h3>
              <span className="text-sm text-gray-500">{sortedSections.length} sections</span>
            </div>

            {sortedSections.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No detailed sections available
              </div>
            ) : (
              <div className="space-y-3">
                {sortedSections.map((section, index) => (
                  <div 
                    key={index}
                    className={`border-l-4 rounded-lg p-4 ${getSectionTypeColor(section.sectionType)}`}
                  >
                    <div 
                      onClick={() => toggleSection(index)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span>{getSectionTypeIcon(section.sectionType)}</span>
                          <div>
                            <h4 className="font-medium text-gray-900">{section.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-600 capitalize">
                                {section.sectionType.replace('-', ' ')}
                              </span>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-xs text-gray-600 flex items-center gap-1">
                                {getImportanceIcon(section.importance)} {section.importance}
                              </span>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-xs text-gray-600">
                                {section.similarity}% similarity
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="text-gray-400">
                          {expandedSections.has(index) ? '▼' : '▶'}
                        </span>
                      </div>
                    </div>

                    {expandedSections.has(index) && (
                      <div className="mt-3 space-y-3 border-t pt-3">
                        <p className="text-gray-700">{section.content}</p>
                        
                        {(section.doc1Extract || section.doc2Extract) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {section.doc1Extract && (
                              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                <div className="font-medium text-blue-900 text-sm mb-1">
                                  {documentNames.doc1}
                                </div>
                                <p className="text-sm text-gray-700">{section.doc1Extract}</p>
                              </div>
                            )}
                            {section.doc2Extract && (
                              <div className="bg-green-50 border border-green-200 rounded p-3">
                                <div className="font-medium text-green-900 text-sm mb-1">
                                  {documentNames.doc2}
                                </div>
                                <p className="text-sm text-gray-700">{section.doc2Extract}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            {/* Key Insights */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                💡 Key Insights
              </h3>
              {comparison.keyInsights.length === 0 ? (
                <p className="text-gray-500">No key insights available</p>
              ) : (
                <ul className="space-y-2">
                  {comparison.keyInsights.map((insight, index) => (
                    <li key={index} className="flex items-start gap-3 text-gray-700">
                      <span className="text-blue-500 mt-0.5">•</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recommendations */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                🎯 Recommendations
              </h3>
              {comparison.recommendations.length === 0 ? (
                <p className="text-gray-500">No recommendations available</p>
              ) : (
                <ul className="space-y-2">
                  {comparison.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-3 text-gray-700">
                      <span className="text-green-500 mt-0.5">→</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Comparison Metadata */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Analysis Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Model Used:</span><br />
                  Gemini {comparison.modelUsed === 'pro' ? '2.5 Pro' : '2.5 Flash'}
                </div>
                <div>
                  <span className="font-medium">Processing Time:</span><br />
                  {comparison.processingTime}ms
                </div>
                <div>
                  <span className="font-medium">Confidence:</span><br />
                  {Math.round((comparison.confidence || 0) * 100)}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}