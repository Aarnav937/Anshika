import { useState, useCallback, useRef } from 'react';
import { 
  DocumentComparison, 
  ComparisonOptions,
  ComparisonProgress,
  DocumentError,
  ProcessedDocument
} from '../types/document';
import { compareDocuments } from '../services/documentIntelligence/documentComparisonService';
import { 
  saveComparison, 
  getComparisons, 
  deleteComparison, 
  getComparisonStats,
  comparisonExists 
} from '../services/documentIntelligence/comparisonStorageService';

interface DocumentComparisonHookReturn {
  compareDocuments: (doc1: ProcessedDocument, doc2: ProcessedDocument, options?: ComparisonOptions) => Promise<DocumentComparison>;
  comparisons: DocumentComparison[];
  isComparing: boolean;
  progress: ComparisonProgress | null;
  error: DocumentError | null;
  getComparison: (id: string) => DocumentComparison | null;
  deleteComparison: (id: string) => Promise<void>;
  getComparisonHistory: (filter?: any) => DocumentComparison[];
  getComparisonStats: () => Promise<any>;
  clearHistory: () => void;
  loadComparisons: () => Promise<void>;
  clearError: () => void;
}

/**
 * Custom hook for document comparison functionality
 * Provides state management and operations for document comparison features
 */
export function useDocumentComparison(): DocumentComparisonHookReturn {
  const [comparisons, setComparisons] = useState<DocumentComparison[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [progress, setProgress] = useState<ComparisonProgress | null>(null);
  const [error, setError] = useState<DocumentError | null>(null);
  
  // Keep track of active comparison to prevent duplicates
  const activeComparisonRef = useRef<string | null>(null);

  /**
   * Compare two documents and save the result
   */
  const handleCompareDocuments = useCallback(async (
    document1: ProcessedDocument,
    document2: ProcessedDocument,
    options: ComparisonOptions = {}
  ): Promise<DocumentComparison> => {
    // Clear previous error
    setError(null);
    
    // Check if comparison is already in progress
    const comparisonKey = `${document1.id}_${document2.id}`;
    if (activeComparisonRef.current === comparisonKey) {
      throw new Error('Comparison already in progress for these documents');
    }
    
    // Check if comparison already exists
    const existing = await comparisonExists(document1.id, document2.id);
    if (existing) {
      console.log('📋 Using existing comparison result');
      return existing;
    }

    setIsComparing(true);
    activeComparisonRef.current = comparisonKey;
    
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (!prev) {
          return {
            comparisonId: comparisonKey,
            stage: 'extracting',
            progress: 25,
            stageDescription: 'Extracting document content...'
          };
        }
        
        if (prev.stage === 'extracting' && prev.progress < 50) {
          return {
            ...prev,
            stage: 'analyzing',
            progress: 50,
            stageDescription: 'Analyzing document structure...'
          };
        }
        
        if (prev.stage === 'analyzing' && prev.progress < 75) {
          return {
            ...prev,
            stage: 'comparing',
            progress: 75,
            stageDescription: 'Comparing documents with AI...'
          };
        }
        
        if (prev.stage === 'comparing' && prev.progress < 90) {
          return {
            ...prev,
            stage: 'generating-report',
            progress: 90,
            stageDescription: 'Generating comparison report...'
          };
        }
        
        return prev;
      });
    }, 800);

    try {
      console.log('🔍 Starting document comparison:', {
        doc1: document1.originalFile.name,
        doc2: document2.originalFile.name,
        options
      });

      // Perform the actual comparison
      const result = await compareDocuments(document1, document2, options);
      
      // Save to storage
      await saveComparison(result);
      
      // Update local state
      setComparisons(prev => {
        const filtered = prev.filter(comp => 
          comp.id !== result.id && 
          !(comp.document1Id === result.document1Id && comp.document2Id === result.document2Id) &&
          !(comp.document1Id === result.document2Id && comp.document2Id === result.document1Id)
        );
        return [result, ...filtered];
      });

      // Final progress update
      setProgress({
        comparisonId: comparisonKey,
        stage: 'generating-report',
        progress: 100,
        stageDescription: 'Comparison complete!'
      });

      console.log('✅ Comparison completed successfully:', result.id);
      return result;

    } catch (err) {
      const comparisonError = err as DocumentError;
      console.error('❌ Comparison failed:', comparisonError);
      setError(comparisonError);
      throw comparisonError;
    } finally {
      clearInterval(progressInterval);
      setIsComparing(false);
      activeComparisonRef.current = null;
      
      // Clear progress after a delay
      setTimeout(() => setProgress(null), 2000);
    }
  }, []);

  /**
   * Get a specific comparison by ID
   */
  const getComparison = useCallback((id: string): DocumentComparison | null => {
    return comparisons.find(comp => comp.id === id) || null;
  }, [comparisons]);

  /**
   * Delete a comparison
   */
  const handleDeleteComparison = useCallback(async (id: string): Promise<void> => {
    try {
      await deleteComparison(id);
      setComparisons(prev => prev.filter(comp => comp.id !== id));
      console.log('🗑️ Comparison deleted:', id);
    } catch (err) {
      console.error('❌ Failed to delete comparison:', err);
      setError(err as DocumentError);
    }
  }, []);

  /**
   * Get comparison history with optional filtering
   */
  const getComparisonHistory = useCallback((filter?: any): DocumentComparison[] => {
    let filtered = [...comparisons];
    
    if (filter) {
      if (filter.documentIds?.length) {
        filtered = filtered.filter(comp => 
          filter.documentIds.includes(comp.document1Id) || 
          filter.documentIds.includes(comp.document2Id)
        );
      }
      
      if (filter.relationshipType) {
        filtered = filtered.filter(comp => comp.relationshipType === filter.relationshipType);
      }
      
      if (filter.minSimilarity !== undefined) {
        filtered = filtered.filter(comp => comp.metrics.overallScore >= filter.minSimilarity);
      }
    }
    
    return filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [comparisons]);

  /**
   * Get comparison statistics
   */
  const handleGetComparisonStats = useCallback(async () => {
    try {
      return await getComparisonStats();
    } catch (err) {
      console.error('❌ Failed to get comparison stats:', err);
      return {
        totalComparisons: 0,
        completedComparisons: 0,
        averageSimilarity: 0,
        mostSimilarPair: { doc1Name: '', doc2Name: '', similarity: 0 },
        commonPatterns: []
      };
    }
  }, []);

  /**
   * Load existing comparisons from storage
   */
  const loadComparisons = useCallback(async (): Promise<void> => {
    try {
      const storedComparisons = await getComparisons();
      setComparisons(storedComparisons);
      console.log(`📥 Loaded ${storedComparisons.length} comparisons from storage`);
    } catch (err) {
      console.error('❌ Failed to load comparisons:', err);
      setError(err as DocumentError);
    }
  }, []);

  /**
   * Clear comparison history
   */
  const clearHistory = useCallback((): void => {
    setComparisons([]);
    setError(null);
    setProgress(null);
    console.log('🧹 Comparison history cleared');
  }, []);

  /**
   * Clear current error
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  return {
    compareDocuments: handleCompareDocuments,
    comparisons,
    isComparing,
    progress,
    error,
    getComparison,
    deleteComparison: handleDeleteComparison,
    getComparisonHistory,
    getComparisonStats: handleGetComparisonStats,
    clearHistory,
    loadComparisons,
    clearError
  };
}

export default useDocumentComparison;