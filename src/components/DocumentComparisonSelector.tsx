import { useState, useMemo, useCallback } from 'react';
import { 
  ProcessedDocument, 
  ComparisonOptions, 
  DocumentComparison,
  ComparisonProgress 
} from '../types/document';
import { 
  getDocumentDisplayName, 
  getDocumentStatusColor
} from '../utils/documentUtils';
import { formatFileSize } from '../utils/fileValidation';

interface DocumentComparisonSelectorProps {
  documents: ProcessedDocument[];
  onStartComparison: (doc1: ProcessedDocument, doc2: ProcessedDocument, options: ComparisonOptions) => Promise<DocumentComparison>;
  onViewComparison?: (comparison: DocumentComparison) => void;
  isComparing?: boolean;
  progress?: ComparisonProgress | null;
  className?: string;
}

interface ComparisonState {
  document1: ProcessedDocument | null;
  document2: ProcessedDocument | null;
  options: ComparisonOptions;
}

const defaultOptions: ComparisonOptions = {
  includeStructural: true,
  includeMetadata: true,
  detailLevel: 'detailed',
  generateRecommendations: true,
  focusAreas: []
};

export default function DocumentComparisonSelector({
  documents,
  onStartComparison,
  onViewComparison,
  isComparing = false,
  progress,
  className = ''
}: DocumentComparisonSelectorProps) {
  const [state, setState] = useState<ComparisonState>({
    document1: null,
    document2: null,
    options: { ...defaultOptions }
  });
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customFocusArea, setCustomFocusArea] = useState('');

  // Filter ready documents for comparison
  const readyDocuments = useMemo(() => 
    documents.filter(doc => doc.status === 'ready' && doc.extractedText),
    [documents]
  );

  // Check if comparison is ready
  const canCompare = useMemo(() => 
    state.document1 && 
    state.document2 && 
    state.document1.id !== state.document2.id &&
    !isComparing,
    [state.document1, state.document2, isComparing]
  );

  // Handle document selection
  const handleDocumentSelect = useCallback((document: ProcessedDocument, position: 1 | 2) => {
    setState(prev => ({
      ...prev,
      [`document${position}`]: document
    }));
  }, []);

  // Handle options change
  const updateOptions = useCallback((updates: Partial<ComparisonOptions>) => {
    setState(prev => ({
      ...prev,
      options: { ...prev.options, ...updates }
    }));
  }, []);

  // Add focus area
  const addFocusArea = useCallback(() => {
    if (customFocusArea.trim() && !state.options.focusAreas?.includes(customFocusArea.trim())) {
      updateOptions({
        focusAreas: [...(state.options.focusAreas || []), customFocusArea.trim()]
      });
      setCustomFocusArea('');
    }
  }, [customFocusArea, state.options.focusAreas, updateOptions]);

  // Remove focus area
  const removeFocusArea = useCallback((area: string) => {
    updateOptions({
      focusAreas: state.options.focusAreas?.filter(a => a !== area) || []
    });
  }, [state.options.focusAreas, updateOptions]);

  // Start comparison
  const handleStartComparison = useCallback(async () => {
    if (!canCompare || !state.document1 || !state.document2) return;
    
    try {
      const result = await onStartComparison(state.document1, state.document2, state.options);
      if (onViewComparison) {
        onViewComparison(result);
      }
    } catch (error) {
      console.error('Comparison failed:', error);
    }
  }, [canCompare, state.document1, state.document2, state.options, onStartComparison, onViewComparison]);

  // Document selection card component
  const DocumentCard = ({ 
    document, 
    position, 
    isSelected 
  }: { 
    document: ProcessedDocument; 
    position: 1 | 2;
    isSelected: boolean;
  }) => (
    <div
      onClick={() => handleDocumentSelect(document, position)}
      className={`
        cursor-pointer rounded-lg border-2 p-3 transition-all
        ${isSelected 
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {getDocumentDisplayName(document)}
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {document.summary?.documentType || 'Unknown type'} • {formatFileSize(document.originalFile.size)}
          </p>
          {document.summary?.wordCount && (
            <p className="text-xs text-gray-400 mt-1">
              {document.summary.wordCount} words
            </p>
          )}
        </div>
        <div className={`text-xs px-2 py-1 rounded ${getDocumentStatusColor(document.status)}`}>
          Ready
        </div>
      </div>
      
      {document.previewText && (
        <p className="text-xs text-gray-600 mt-2 line-clamp-2">
          {document.previewText.slice(0, 100)}...
        </p>
      )}
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">Document Comparison</h2>
        <p className="text-sm text-gray-600 mt-1">
          Select two documents to analyze their similarities and differences
        </p>
      </div>

      {/* Document Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document 1 Selection */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">1</span>
            First Document
            {state.document1 && (
              <span className="text-xs text-gray-500">({state.document1.summary?.documentType})</span>
            )}
          </h3>
          
          {state.document1 ? (
            <div className="space-y-2">
              <DocumentCard 
                document={state.document1} 
                position={1} 
                isSelected={true}
              />
              <button
                onClick={() => setState(prev => ({ ...prev, document1: null }))}
                className="text-xs text-red-600 hover:text-red-800 transition-colors"
              >
                Clear selection
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {readyDocuments.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">
                  No documents available for comparison
                </div>
              ) : (
                readyDocuments.map(doc => (
                  <DocumentCard 
                    key={doc.id}
                    document={doc} 
                    position={1} 
                    isSelected={false}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Document 2 Selection */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">2</span>
            Second Document
            {state.document2 && (
              <span className="text-xs text-gray-500">({state.document2.summary?.documentType})</span>
            )}
          </h3>
          
          {state.document2 ? (
            <div className="space-y-2">
              <DocumentCard 
                document={state.document2} 
                position={2} 
                isSelected={true}
              />
              <button
                onClick={() => setState(prev => ({ ...prev, document2: null }))}
                className="text-xs text-red-600 hover:text-red-800 transition-colors"
              >
                Clear selection
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {readyDocuments.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">
                  No documents available for comparison
                </div>
              ) : (
                readyDocuments
                  .filter(doc => doc.id !== state.document1?.id)
                  .map(doc => (
                    <DocumentCard 
                      key={doc.id}
                      document={doc} 
                      position={2} 
                      isSelected={false}
                    />
                  ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Comparison Options */}
      {(state.document1 || state.document2) && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Comparison Options</h3>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </button>
          </div>

          {/* Basic Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Detail Level
              </label>
              <select
                value={state.options.detailLevel}
                onChange={(e) => updateOptions({ detailLevel: e.target.value as any })}
                className="w-full text-xs rounded border border-gray-300 px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="basic">Basic</option>
                <option value="detailed">Detailed</option>
                <option value="comprehensive">Comprehensive</option>
              </select>
            </div>

            <div className="flex items-center space-x-4 pt-4">
              <label className="flex items-center space-x-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={state.options.includeStructural}
                  onChange={(e) => updateOptions({ includeStructural: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Include structural analysis</span>
              </label>
            </div>

            <div className="flex items-center space-x-4 pt-4">
              <label className="flex items-center space-x-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={state.options.generateRecommendations}
                  onChange={(e) => updateOptions({ generateRecommendations: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Generate recommendations</span>
              </label>
            </div>
          </div>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Focus Areas (Optional)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {state.options.focusAreas?.map(area => (
                    <span 
                      key={area}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                    >
                      {area}
                      <button
                        onClick={() => removeFocusArea(area)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customFocusArea}
                    onChange={(e) => setCustomFocusArea(e.target.value)}
                    placeholder="e.g., conclusions, methodology"
                    className="flex-1 text-xs rounded border border-gray-300 px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && addFocusArea()}
                  />
                  <button
                    onClick={addFocusArea}
                    disabled={!customFocusArea.trim()}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress Display */}
      {isComparing && progress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">
              Analyzing Documents...
            </span>
            <span className="text-sm text-blue-700">
              {progress.progress}%
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <p className="text-xs text-blue-700">
            {progress.stageDescription}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={handleStartComparison}
          disabled={!canCompare}
          className={`
            px-6 py-2 rounded-lg font-medium text-sm transition-all
            ${canCompare
              ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isComparing ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Comparing...
            </span>
          ) : (
            'Start Comparison'
          )}
        </button>
        
        <button
          onClick={() => setState({ document1: null, document2: null, options: { ...defaultOptions } })}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
        >
          Clear All
        </button>
      </div>

      {/* Selection Summary */}
      {(state.document1 || state.document2) && (
        <div className="text-center text-xs text-gray-500">
          {state.document1 && state.document2 
            ? `Ready to compare "${getDocumentDisplayName(state.document1)}" with "${getDocumentDisplayName(state.document2)}"`
            : state.document1 
              ? 'Select a second document to continue'
              : 'Select a first document to continue'
          }
        </div>
      )}
    </div>
  );
}