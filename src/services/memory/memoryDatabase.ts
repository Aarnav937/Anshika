import Dexie, { Table } from 'dexie';
import { Memory, UserProfile } from '../../types/memory';

class MemoryDatabase extends Dexie {
  memories!: Table<Memory, string>;
  userProfile!: Table<UserProfile, string>;

  constructor() {
    super('AnshikaMemoryDB');
    this.version(1).stores({
      memories: 'id, type, *keywords, confidence, lastAccessed, createdAt',
      userProfile: 'id',
    });
  }
}

export const memoryDb = new MemoryDatabase();
