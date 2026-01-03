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
    this.version(2).stores({
      memories: 'id, type, *keywords, confidence, lastAccessed, createdAt, isActive, [isActive+lastAccessed]',
      userProfile: 'id',
    }).upgrade(tx => {
      return tx.table('memories').toCollection().modify(memory => {
        if (typeof memory.isActive === 'undefined') {
          memory.isActive = true;
        }
        if (!memory.lastAccessed) {
          memory.lastAccessed = memory.createdAt || new Date();
        }
      });
    });
  }
}

export const memoryDb = new MemoryDatabase();
