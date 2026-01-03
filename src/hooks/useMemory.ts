import { useCallback, useEffect, useState } from 'react';
import type { Memory, UserProfile } from '../types/memory';
import {
  MemoryUpsertInput,
  buildMemoryContext,
  createMemory,
  getActiveMemories,
  recordMemoryAccess,
  saveUserProfile as persistUserProfile,
  setMemoryActive,
  getUserProfile,
} from '../services/memory/memoryService';

export interface UseMemoryReturn {
  memories: Memory[];
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addMemory: (memory: MemoryUpsertInput) => Promise<Memory>;
  setMemoryActive: (id: string, isActive: boolean) => Promise<void>;
  touchMemory: (id: string) => Promise<void>;
  saveUserProfile: (profile: Partial<UserProfile>) => Promise<UserProfile>;
  getContext: (keywords?: string[]) => Promise<Awaited<ReturnType<typeof buildMemoryContext>>>;
}

export function useMemory(): UseMemoryReturn {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [activeMemories, profile] = await Promise.all([
        getActiveMemories(),
        getUserProfile(),
      ]);
      setMemories(activeMemories);
      setUserProfile(profile);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load memory state');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addMemory = useCallback(async (memoryInput: MemoryUpsertInput) => {
    const stored = await createMemory(memoryInput);
    setMemories(prev => [stored, ...prev.filter(m => m.id !== stored.id)]);
    return stored;
  }, []);

  const toggleMemory = useCallback(
    async (id: string, isActive: boolean) => {
      await setMemoryActive(id, isActive);
      await refresh();
    },
    [refresh]
  );

  const touchMemory = useCallback(
    async (id: string) => {
      await recordMemoryAccess(id);
      await refresh();
    },
    [refresh]
  );

  const saveUserProfile = useCallback(async (profile: Partial<UserProfile>) => {
    const saved = await persistUserProfile(profile);
    setUserProfile(saved);
    return saved;
  }, []);

  const getContext = useCallback(async (keywords: string[] = []) => {
    return buildMemoryContext({ keywords });
  }, []);

  return {
    memories,
    userProfile,
    loading,
    error,
    refresh,
    addMemory,
    setMemoryActive: toggleMemory,
    touchMemory,
    saveUserProfile,
    getContext,
  };
}
