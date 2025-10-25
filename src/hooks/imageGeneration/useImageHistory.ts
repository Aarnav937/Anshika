/**
 * Custom Hook: useImageHistory
 * Manages image generation history, sessions, and versioning
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ImageSession,
  ImageVersion,
  VersionComparison,
  HistoryStats,
  OnlineGenerationParams,
} from '../../types/imageGeneration';
import { imageHistoryService } from '../../services/image/imageHistoryService';

interface UseImageHistoryReturn {
  // State
  sessions: ImageSession[];
  currentSession: ImageSession | null;
  versions: ImageVersion[];
  selectedVersions: string[];
  comparison: VersionComparison | null;
  stats: HistoryStats | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  createSession: (basePrompt: string, tags?: string[]) => Promise<ImageSession>;
  addVersion: (
    sessionId: string,
    imageId: string,
    prompt: string,
    parameters: OnlineGenerationParams,
    generationTime: number,
    parentVersionId?: string
  ) => Promise<ImageVersion>;
  loadSession: (sessionId: string) => Promise<void>;
  loadAllSessions: () => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  deleteVersion: (versionId: string) => Promise<void>;
  compareVersions: (versionId1: string, versionId2: string) => Promise<void>;
  clearComparison: () => void;
  toggleVersionSelection: (versionId: string) => void;
  clearSelection: () => void;
  searchSessions: (query: string) => Promise<void>;
  updateVersionNotes: (versionId: string, notes: string) => Promise<void>;
  exportSession: (sessionId: string) => Promise<void>;
  loadStats: () => Promise<void>;
  findOrCreateSession: (prompt: string, tags?: string[]) => Promise<ImageSession>;
}

export function useImageHistory(): UseImageHistoryReturn {
  const [sessions, setSessions] = useState<ImageSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ImageSession | null>(null);
  const [versions, setVersions] = useState<ImageVersion[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all sessions on mount
  useEffect(() => {
    loadAllSessions();
    loadStats();
  }, []);

  /**
   * Create a new session
   */
  const createSession = useCallback(
    async (basePrompt: string, tags?: string[]): Promise<ImageSession> => {
      try {
        setIsLoading(true);
        setError(null);

        const session = await imageHistoryService.createSession(basePrompt, tags);
        setSessions((prev) => [session, ...prev]);
        setCurrentSession(session);

        return session;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create session';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Find or create session for a prompt
   */
  const findOrCreateSession = useCallback(
    async (prompt: string, tags?: string[]): Promise<ImageSession> => {
      try {
        setIsLoading(true);
        setError(null);

        const session = await imageHistoryService.findOrCreateSession(prompt, tags);
        setCurrentSession(session);

        // Refresh sessions list
        await loadAllSessions();

        return session;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to find/create session';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Add a new version to a session
   */
  const addVersion = useCallback(
    async (
      sessionId: string,
      imageId: string,
      prompt: string,
      parameters: OnlineGenerationParams,
      generationTime: number,
      parentVersionId?: string
    ): Promise<ImageVersion> => {
      try {
        setIsLoading(true);
        setError(null);

        const version = await imageHistoryService.addVersion(
          sessionId,
          imageId,
          prompt,
          parameters,
          generationTime,
          parentVersionId
        );

        // Refresh current session if it's the active one
        if (currentSession?.id === sessionId) {
          await loadSession(sessionId);
        }

        // Refresh stats
        await loadStats();

        return version;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add version';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [currentSession]
  );

  /**
   * Load a specific session
   */
  const loadSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const session = await imageHistoryService.getSession(sessionId);
      setCurrentSession(session);

      if (session) {
        const sessionVersions = await imageHistoryService.getVersionsForSession(sessionId);
        setVersions(sessionVersions);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load session';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load all sessions
   */
  const loadAllSessions = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const allSessions = await imageHistoryService.getAllSessions();
      setSessions(allSessions);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load sessions';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Delete a session
   */
  const deleteSession = useCallback(
    async (sessionId: string): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        await imageHistoryService.deleteSession(sessionId);

        // Remove from state
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));

        // Clear current session if it was deleted
        if (currentSession?.id === sessionId) {
          setCurrentSession(null);
          setVersions([]);
        }

        // Refresh stats
        await loadStats();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete session';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [currentSession]
  );

  /**
   * Delete a version
   */
  const deleteVersion = useCallback(
    async (versionId: string): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        await imageHistoryService.deleteVersion(versionId);

        // Remove from versions list
        setVersions((prev) => prev.filter((v) => v.id !== versionId));

        // Refresh current session
        if (currentSession) {
          await loadSession(currentSession.id);
        }

        // Refresh stats
        await loadStats();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete version';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [currentSession]
  );

  /**
   * Compare two versions
   */
  const compareVersions = useCallback(
    async (versionId1: string, versionId2: string): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        const comparisonResult = await imageHistoryService.compareVersions(
          versionId1,
          versionId2
        );
        setComparison(comparisonResult);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to compare versions';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Clear comparison
   */
  const clearComparison = useCallback(() => {
    setComparison(null);
    setSelectedVersions([]);
  }, []);

  /**
   * Toggle version selection (for comparison)
   */
  const toggleVersionSelection = useCallback((versionId: string) => {
    setSelectedVersions((prev) => {
      if (prev.includes(versionId)) {
        return prev.filter((id) => id !== versionId);
      } else if (prev.length < 2) {
        return [...prev, versionId];
      } else {
        // Replace the first selected version
        return [prev[1], versionId];
      }
    });
  }, []);

  /**
   * Clear version selection
   */
  const clearSelection = useCallback(() => {
    setSelectedVersions([]);
  }, []);

  /**
   * Search sessions by prompt text
   */
  const searchSessions = useCallback(async (query: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      if (!query.trim()) {
        await loadAllSessions();
        return;
      }

      const results = await imageHistoryService.searchSessions(query);
      setSessions(results);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to search sessions';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update version notes
   */
  const updateVersionNotes = useCallback(
    async (versionId: string, notes: string): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        await imageHistoryService.updateVersionNotes(versionId, notes);

        // Update in state
        setVersions((prev) =>
          prev.map((v) => (v.id === versionId ? { ...v, notes } : v))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update notes';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Export session to JSON file
   */
  const exportSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const jsonData = await imageHistoryService.exportSession(sessionId);

      // Create and download file
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-${sessionId}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export session';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load history statistics
   */
  const loadStats = useCallback(async (): Promise<void> => {
    try {
      const historyStats = await imageHistoryService.getHistoryStats();
      setStats(historyStats);
    } catch (err) {
      console.error('Failed to load stats:', err);
      // Don't set error for stats, it's not critical
    }
  }, []);

  return {
    // State
    sessions,
    currentSession,
    versions,
    selectedVersions,
    comparison,
    stats,
    isLoading,
    error,

    // Actions
    createSession,
    addVersion,
    loadSession,
    loadAllSessions,
    deleteSession,
    deleteVersion,
    compareVersions,
    clearComparison,
    toggleVersionSelection,
    clearSelection,
    searchSessions,
    updateVersionNotes,
    exportSession,
    loadStats,
    findOrCreateSession,
  };
}
