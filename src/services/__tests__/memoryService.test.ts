import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { memoryDb } from '../memory/memoryDatabase';
import {
  createMemory,
  findMemoriesByKeywords,
  getActiveMemories,
  getUserProfile,
  recordMemoryAccess,
  saveUserProfile,
  setMemoryActive,
} from '../memory/memoryService';

const baseSource = {
  conversationId: 'conversation-1',
  messageId: 'message-1',
  timestamp: new Date(),
};

describe('memoryService', () => {
  beforeEach(async () => {
    await memoryDb.memories.clear();
    await memoryDb.userProfile.clear();
  });

  it('stores and retrieves memories with defaults applied', async () => {
    await createMemory({
      type: 'fact',
      content: 'User is a software engineer',
      keywords: ['engineer', 'software'],
      confidence: 0.9,
      source: baseSource,
    });

    const [stored] = await getActiveMemories();
    expect(stored).toBeDefined();
    expect(stored.content).toContain('software engineer');
    expect(stored.isActive).toBe(true);
    expect(stored.accessCount).toBe(0);
  });

  it('finds memories by keyword and ignores inactive entries', async () => {
    await createMemory({
      type: 'preference',
      content: 'User likes coffee',
      keywords: ['coffee'],
      confidence: 0.8,
      source: baseSource,
    });

    const inactive = await createMemory({
      type: 'preference',
      content: 'User likes tea',
      keywords: ['tea'],
      confidence: 0.5,
      source: baseSource,
    });
    await setMemoryActive(inactive.id, false);

    const matches = await findMemoriesByKeywords(['coffee', 'tea']);
    expect(matches).toHaveLength(1);
    expect(matches[0].keywords).toContain('coffee');
  });

  it('tracks memory access counts and timestamps', async () => {
    const memory = await createMemory({
      type: 'context',
      content: 'Working on project Aurora',
      keywords: ['aurora', 'project'],
      confidence: 0.6,
      source: baseSource,
    });

    const previousAccessed = memory.lastAccessed.getTime();
    await new Promise(resolve => setTimeout(resolve, 5));
    await recordMemoryAccess(memory.id);

    const [updated] = await getActiveMemories();
    expect(updated.accessCount).toBe(1);
    expect(updated.lastAccessed.getTime()).toBeGreaterThan(previousAccessed);
  });

  it('merges and persists user profile updates', async () => {
    await saveUserProfile({
      name: 'Alex',
      preferences: { theme: 'dark' },
      facts: ['Based in Berlin'],
    });

    const profile = await getUserProfile();
    expect(profile.name).toBe('Alex');
    expect(profile.preferences.theme).toBe('dark');
    expect(profile.facts).toContain('Based in Berlin');
  });
});
