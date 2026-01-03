import { memoryDb } from './memoryDatabase';
import { Memory, MemoryContext, MemoryType, UserProfile } from '../../types/memory';

export interface MemoryUpsertInput {
  id?: string;
  type: MemoryType;
  content: string;
  keywords?: string[];
  embedding?: number[];
  confidence?: number;
  source: Memory['source'];
  lastAccessed?: Date;
  accessCount?: number;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MemoryContextOptions {
  keywords?: string[];
  recentTopics?: string[];
  limit?: number;
}

const PROFILE_ID = 'default';
const DEFAULT_PROFILE: UserProfile = {
  id: PROFILE_ID,
  preferences: {},
  facts: [],
};

function normalizeKeywords(keywords: string[] = []): string[] {
  const seen = new Set<string>();
  for (const keyword of keywords) {
    const cleaned = keyword.trim().toLowerCase();
    if (cleaned) {
      seen.add(cleaned);
    }
  }
  return Array.from(seen);
}

function isFulfilled<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> {
  return result.status === 'fulfilled';
}

async function loadActiveMemories(): Promise<Memory[]> {
  try {
    return await memoryDb.memories
      .filter(memory => (memory.isActive ?? true) === true)
      .toArray();
  } catch {
    // Fallback for environments that do not support boolean indexes consistently
    return memoryDb.memories.toArray();
  }
}

export async function createMemory(input: MemoryUpsertInput): Promise<Memory> {
  const now = new Date();
  const normalizedKeywords = normalizeKeywords(input.keywords ?? []);

  const memory: Memory = {
    id: input.id ?? crypto.randomUUID(),
    type: input.type,
    content: input.content,
    keywords: normalizedKeywords,
    embedding: input.embedding,
    confidence: input.confidence ?? 0.5,
    source: input.source,
    lastAccessed: input.lastAccessed ?? now,
    accessCount: input.accessCount ?? 0,
    isActive: input.isActive ?? true,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };

  await memoryDb.memories.put(memory);
  return memory;
}

export async function bulkAddMemories(memories: MemoryUpsertInput[]): Promise<Memory[]> {
  const results = await Promise.allSettled(memories.map(memory => createMemory(memory)));
  return results.filter(isFulfilled).map(result => result.value);
}

export async function getMemory(id: string): Promise<Memory | undefined> {
  return memoryDb.memories.get(id);
}

export async function getActiveMemories(limit = 25): Promise<Memory[]> {
  const activeMemories = await loadActiveMemories();

  return activeMemories
    .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
    .slice(0, limit);
}

export async function findMemoriesByKeywords(keywords: string[], limit = 10): Promise<Memory[]> {
  const normalized = normalizeKeywords(keywords);
  if (normalized.length === 0) {
    return getActiveMemories(limit);
  }

  const activeMemories = await loadActiveMemories();

  const matches = activeMemories
    .filter(memory => memory.keywords.some(keyword => normalized.includes(keyword)));

  return matches
    .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
    .slice(0, limit);
}

export async function recordMemoryAccess(id: string): Promise<void> {
  const memory = await getMemory(id);
  if (!memory) return;

  memory.lastAccessed = new Date();
  memory.accessCount = (memory.accessCount ?? 0) + 1;
  memory.updatedAt = new Date();

  await memoryDb.memories.put(memory);
}

export async function setMemoryActive(id: string, isActive: boolean): Promise<void> {
  const memory = await getMemory(id);
  if (!memory) return;

  memory.isActive = isActive;
  memory.updatedAt = new Date();
  await memoryDb.memories.put(memory);
}

export async function updateMemoryContent(id: string, updates: Partial<Omit<Memory, 'id'>>): Promise<Memory | undefined> {
  const memory = await getMemory(id);
  if (!memory) return undefined;

  const merged: Memory = {
    ...memory,
    ...updates,
    keywords: updates.keywords ? normalizeKeywords(updates.keywords) : memory.keywords,
    updatedAt: new Date(),
  };

  await memoryDb.memories.put(merged);
  return merged;
}

export async function getUserProfile(): Promise<UserProfile> {
  const stored = await memoryDb.userProfile.get(PROFILE_ID);
  if (!stored) {
    await memoryDb.userProfile.put({ ...DEFAULT_PROFILE, id: PROFILE_ID });
    return { ...DEFAULT_PROFILE, id: PROFILE_ID };
  }
  return {
    ...DEFAULT_PROFILE,
    ...stored,
    preferences: {
      ...DEFAULT_PROFILE.preferences,
      ...(stored.preferences ?? {}),
    },
    facts: stored.facts ?? [],
    id: stored.id || PROFILE_ID,
  };
}

export async function saveUserProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
  const existing = await getUserProfile();
  const merged: UserProfile = {
    ...existing,
    ...profile,
    id: PROFILE_ID,
    preferences: {
      ...existing.preferences,
      ...(profile.preferences ?? {}),
    },
    facts: profile.facts ?? existing.facts,
  };

  await memoryDb.userProfile.put(merged);
  return merged;
}

export async function buildMemoryContext(options: MemoryContextOptions = {}): Promise<MemoryContext> {
  const relevantMemories = await (options.keywords?.length
    ? findMemoriesByKeywords(options.keywords, options.limit ?? 10)
    : getActiveMemories(options.limit ?? 10));

  const userProfile = await getUserProfile();

  return {
    relevantMemories,
    userProfile,
    recentTopics: options.recentTopics ?? [],
  };
}

export const memoryService = {
  createMemory,
  bulkAddMemories,
  getMemory,
  getActiveMemories,
  findMemoriesByKeywords,
  recordMemoryAccess,
  setMemoryActive,
  updateMemoryContent,
  getUserProfile,
  saveUserProfile,
  buildMemoryContext,
};
