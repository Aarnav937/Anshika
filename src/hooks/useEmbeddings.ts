/**
 * useEmbeddings Hook
 * React hook for semantic search using embeddings service
 */

import { useState, useEffect, useCallback } from 'react';
import { embeddingsService, Embedding } from '../services/embeddingsService';

export interface UseEmbeddingsReturn {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  stats: {
    totalEmbeddings: number;
    vectorDimensions: number;
  };

  // Actions
  storeText: (content: string, metadata?: Record<string, any>) => Promise<string>;
  updateText: (id: string, content: string, metadata?: Record<string, any>) => Promise<void>;
  deleteText: (id: string) => Promise<void>;
  searchSemantic: (
    query: string,
    limit?: number,
    minSimilarity?: number
  ) => Promise<Array<Embedding & { similarity: number }>>;
  getEmbedding: (id: string) => Promise<Embedding | null>;
  getAllEmbeddings: () => Promise<Embedding[]>;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for semantic search using embeddings
 */
export function useEmbeddings(): UseEmbeddingsReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalEmbeddings: 0,
    vectorDimensions: 384,
  });

  // Initialize embeddings service
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setIsLoading(true);
        await embeddingsService.initialize();

        if (mounted) {
          setIsInitialized(true);
          updateStats();
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Initialization failed');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Update stats helper
  const updateStats = useCallback(() => {
    const currentStats = embeddingsService.getStats();
    setStats({
      totalEmbeddings: currentStats.totalEmbeddings,
      vectorDimensions: currentStats.vectorDimensions,
    });
  }, []);

  // Store text with embedding
  const storeText = useCallback(
    async (content: string, metadata?: Record<string, any>): Promise<string> => {
      try {
        setIsLoading(true);
        setError(null);

        const id = await embeddingsService.storeEmbedding(content, metadata);
        updateStats();

        return id;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to store text';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [updateStats]
  );

  // Update existing text
  const updateText = useCallback(
    async (id: string, content: string, metadata?: Record<string, any>): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        await embeddingsService.updateEmbedding(id, content, metadata);
        updateStats();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update text';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [updateStats]
  );

  // Delete text
  const deleteText = useCallback(
    async (id: string): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        await embeddingsService.deleteEmbedding(id);
        updateStats();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete text';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [updateStats]
  );

  // Semantic search
  const searchSemantic = useCallback(
    async (
      query: string,
      limit: number = 5,
      minSimilarity: number = 0.3
    ): Promise<Array<Embedding & { similarity: number }>> => {
      try {
        setIsLoading(true);
        setError(null);

        const results = await embeddingsService.searchSimilar(query, limit, minSimilarity);

        return results;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Search failed';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Get single embedding
  const getEmbedding = useCallback(async (id: string): Promise<Embedding | null> => {
    try {
      setError(null);
      return await embeddingsService.getEmbedding(id);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get embedding';
      setError(errorMsg);
      return null;
    }
  }, []);

  // Get all embeddings
  const getAllEmbeddings = useCallback(async (): Promise<Embedding[]> => {
    try {
      setIsLoading(true);
      setError(null);

      return await embeddingsService.getAllEmbeddings();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get embeddings';
      setError(errorMsg);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear all embeddings
  const clearAll = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      await embeddingsService.clearAll();
      updateStats();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to clear embeddings';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [updateStats]);

  // Refresh stats
  const refresh = useCallback(async (): Promise<void> => {
    updateStats();
  }, [updateStats]);

  return {
    isInitialized,
    isLoading,
    error,
    stats,
    storeText,
    updateText,
    deleteText,
    searchSemantic,
    getEmbedding,
    getAllEmbeddings,
    clearAll,
    refresh,
  };
}
