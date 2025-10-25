/**
 * Image History & Versioning Service
 * Tracks all image generations, groups them into sessions, and manages version history
 */

import Dexie, { Table } from 'dexie';
import {
  ImageVersion,
  ImageSession,
  VersionComparison,
  HistoryStats,
  OnlineGenerationParams,
} from '../../types/imageGeneration';

// Extend the database to include history tables
class ImageHistoryDatabase extends Dexie {
  sessions!: Table<ImageSession, string>;
  versions!: Table<ImageVersion, string>;

  constructor() {
    super('AIImageHistoryDB');

    this.version(1).stores({
      sessions: 'id, basePrompt, createdAt, updatedAt, *tags',
      versions: 'id, imageId, parentId, prompt, timestamp, versionNumber',
    });
  }
}

// Create database instance
const db = new ImageHistoryDatabase();

export class ImageHistoryService {
  /**
   * Create a new image session when starting with a new base prompt
   */
  async createSession(basePrompt: string, tags?: string[]): Promise<ImageSession> {
    const session: ImageSession = {
      id: this.generateId(),
      basePrompt,
      versions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      totalGenerations: 0,
      tags: tags || [],
    };

    await db.sessions.put(session);
    console.log(`Created session ${session.id} for prompt: "${basePrompt}"`);
    return session;
  }

  /**
   * Add a new version to a session
   */
  async addVersion(
    sessionId: string,
    imageId: string,
    prompt: string,
    parameters: OnlineGenerationParams,
    generationTime: number,
    parentVersionId?: string
  ): Promise<ImageVersion> {
    try {
      // Get session
      const session = await db.sessions.get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Determine version number
      const versionNumber = session.totalGenerations + 1;

      // Create version
      const version: ImageVersion = {
        id: this.generateId(),
        parentId: parentVersionId,
        imageId,
        prompt,
        enhancedPrompt: parameters.enhancedPrompt,
        parameters,
        timestamp: new Date(),
        generationTime,
        versionNumber,
      };

      // Save version
      await db.versions.put(version);

      // Update session
      session.versions.push(version);
      session.totalGenerations++;
      session.updatedAt = new Date();
      await db.sessions.put(session);

      console.log(`Added version ${versionNumber} to session ${sessionId}`);
      return version;
    } catch (error) {
      console.error('Error adding version:', error);
      throw new Error(`Failed to add version: ${error}`);
    }
  }

  /**
   * Get all sessions
   */
  async getAllSessions(): Promise<ImageSession[]> {
    try {
      return await db.sessions.orderBy('updatedAt').reverse().toArray();
    } catch (error) {
      console.error('Error getting sessions:', error);
      return [];
    }
  }

  /**
   * Get a specific session with all its versions
   */
  async getSession(sessionId: string): Promise<ImageSession | null> {
    try {
      const session = await db.sessions.get(sessionId);
      if (!session) return null;

      // Load all versions for this session
      const versions = await db.versions
        .where('id')
        .anyOf(session.versions.map((v) => v.id))
        .toArray();

      session.versions = versions;
      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Get all versions for a session
   */
  async getVersionsForSession(sessionId: string): Promise<ImageVersion[]> {
    try {
      const session = await db.sessions.get(sessionId);
      if (!session) return [];

      return await db.versions
        .where('id')
        .anyOf(session.versions.map((v) => v.id))
        .toArray();
    } catch (error) {
      console.error('Error getting versions:', error);
      return [];
    }
  }

  /**
   * Get a specific version
   */
  async getVersion(versionId: string): Promise<ImageVersion | null> {
    try {
      const version = await db.versions.get(versionId);
      return version || null;
    } catch (error) {
      console.error('Error getting version:', error);
      return null;
    }
  }

  /**
   * Find or create a session for a prompt
   * Looks for an existing session with similar prompt or creates new one
   */
  async findOrCreateSession(prompt: string, tags?: string[]): Promise<ImageSession> {
    try {
      // Search for existing sessions with similar base prompt
      const sessions = await db.sessions.toArray();
      const similarSession = sessions.find((s) =>
        this.arePromptsSimilar(s.basePrompt, prompt)
      );

      if (similarSession) {
        console.log(`Found existing session ${similarSession.id}`);
        return similarSession;
      }

      // Create new session
      return await this.createSession(prompt, tags);
    } catch (error) {
      console.error('Error finding/creating session:', error);
      throw error;
    }
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    versionId1: string,
    versionId2: string
  ): Promise<VersionComparison | null> {
    try {
      const version1 = await db.versions.get(versionId1);
      const version2 = await db.versions.get(versionId2);

      if (!version1 || !version2) {
        return null;
      }

      const differences = {
        prompt: version1.prompt !== version2.prompt,
        parameters: this.findParameterDifferences(version1.parameters, version2.parameters),
        seed: version1.parameters.seed !== version2.parameters.seed,
        quality: version1.parameters.quality !== version2.parameters.quality,
        aspectRatio: version1.parameters.aspectRatio !== version2.parameters.aspectRatio,
      };

      const similarity = this.calculateSimilarity(version1, version2);

      return {
        version1,
        version2,
        differences,
        similarity,
      };
    } catch (error) {
      console.error('Error comparing versions:', error);
      return null;
    }
  }

  /**
   * Get version evolution for a session (chronological order)
   */
  async getVersionEvolution(sessionId: string): Promise<ImageVersion[]> {
    const versions = await this.getVersionsForSession(sessionId);
    return versions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Search sessions by prompt text
   */
  async searchSessions(searchQuery: string): Promise<ImageSession[]> {
    try {
      const sessions = await db.sessions.toArray();
      const query = searchQuery.toLowerCase();

      return sessions.filter((s) => s.basePrompt.toLowerCase().includes(query));
    } catch (error) {
      console.error('Error searching sessions:', error);
      return [];
    }
  }

  /**
   * Get history statistics
   */
  async getHistoryStats(): Promise<HistoryStats> {
    try {
      const sessions = await db.sessions.toArray();
      const versions = await db.versions.toArray();

      if (sessions.length === 0) {
        return {
          totalSessions: 0,
          totalVersions: 0,
          averageVersionsPerSession: 0,
          mostUsedPrompts: [],
          mostUsedStyles: [],
          averageGenerationTime: 0,
          oldestSession: new Date(),
          newestSession: new Date(),
        };
      }

      // Calculate statistics
      const totalSessions = sessions.length;
      const totalVersions = versions.length;
      const averageVersionsPerSession = totalVersions / totalSessions;

      // Most used prompts (group by base prompt)
      const promptCounts = new Map<string, number>();
      sessions.forEach((s) => {
        promptCounts.set(s.basePrompt, (promptCounts.get(s.basePrompt) || 0) + 1);
      });
      const mostUsedPrompts = Array.from(promptCounts.entries())
        .map(([prompt, count]) => ({ prompt, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Most used styles
      const styleCounts = new Map<string, number>();
      versions.forEach((v) => {
        const style = v.parameters.stylePreset || 'default';
        styleCounts.set(style, (styleCounts.get(style) || 0) + 1);
      });
      const mostUsedStyles = Array.from(styleCounts.entries())
        .map(([style, count]) => ({ style, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Average generation time
      const averageGenerationTime =
        versions.reduce((sum, v) => sum + v.generationTime, 0) / versions.length;

      // Date range
      const dates = sessions.map((s) => s.createdAt.getTime());
      const oldestSession = new Date(Math.min(...dates));
      const newestSession = new Date(Math.max(...dates));

      return {
        totalSessions,
        totalVersions,
        averageVersionsPerSession,
        mostUsedPrompts,
        mostUsedStyles,
        averageGenerationTime,
        oldestSession,
        newestSession,
      };
    } catch (error) {
      console.error('Error getting history stats:', error);
      throw error;
    }
  }

  /**
   * Delete a session and all its versions
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const session = await db.sessions.get(sessionId);
      if (!session) return;

      // Delete all versions
      const versionIds = session.versions.map((v) => v.id);
      await db.versions.bulkDelete(versionIds);

      // Delete session
      await db.sessions.delete(sessionId);

      console.log(`Deleted session ${sessionId} and ${versionIds.length} versions`);
    } catch (error) {
      console.error('Error deleting session:', error);
      throw new Error(`Failed to delete session: ${error}`);
    }
  }

  /**
   * Delete a specific version
   */
  async deleteVersion(versionId: string): Promise<void> {
    try {
      await db.versions.delete(versionId);
      console.log(`Deleted version ${versionId}`);
    } catch (error) {
      console.error('Error deleting version:', error);
      throw new Error(`Failed to delete version: ${error}`);
    }
  }

  /**
   * Update version notes
   */
  async updateVersionNotes(versionId: string, notes: string): Promise<void> {
    try {
      const version = await db.versions.get(versionId);
      if (!version) {
        throw new Error(`Version ${versionId} not found`);
      }

      version.notes = notes;
      await db.versions.put(version);
    } catch (error) {
      console.error('Error updating version notes:', error);
      throw new Error(`Failed to update notes: ${error}`);
    }
  }

  /**
   * Export session history to JSON
   */
  async exportSession(sessionId: string): Promise<string> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      return JSON.stringify(session, null, 2);
    } catch (error) {
      console.error('Error exporting session:', error);
      throw new Error(`Failed to export session: ${error}`);
    }
  }

  /**
   * Clear all history (use with caution)
   */
  async clearAllHistory(): Promise<void> {
    try {
      await db.sessions.clear();
      await db.versions.clear();
      console.log('All history cleared');
    } catch (error) {
      console.error('Error clearing history:', error);
      throw new Error(`Failed to clear history: ${error}`);
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private arePromptsSimilar(prompt1: string, prompt2: string): boolean {
    // Simple similarity check - can be enhanced with more sophisticated algorithms
    const p1 = prompt1.toLowerCase().trim();
    const p2 = prompt2.toLowerCase().trim();

    // Exact match
    if (p1 === p2) return true;

    // Check if one contains the other
    if (p1.includes(p2) || p2.includes(p1)) return true;

    // Check word overlap (at least 70% common words)
    const words1 = new Set(p1.split(/\s+/));
    const words2 = new Set(p2.split(/\s+/));
    const commonWords = new Set([...words1].filter((w) => words2.has(w)));
    const similarity = (commonWords.size * 2) / (words1.size + words2.size);

    return similarity >= 0.7;
  }

  private findParameterDifferences(
    params1: OnlineGenerationParams,
    params2: OnlineGenerationParams
  ): string[] {
    const differences: string[] = [];

    if (params1.aspectRatio !== params2.aspectRatio) {
      differences.push('aspectRatio');
    }
    if (params1.quality !== params2.quality) {
      differences.push('quality');
    }
    if (params1.stylePreset !== params2.stylePreset) {
      differences.push('style');
    }
    if (params1.seed !== params2.seed) {
      differences.push('seed');
    }
    if (params1.negativePrompt !== params2.negativePrompt) {
      differences.push('negativePrompt');
    }

    return differences;
  }

  private calculateSimilarity(version1: ImageVersion, version2: ImageVersion): number {
    let score = 0;
    let factors = 0;

    // Compare prompts (40% weight)
    const promptSimilarity = this.getTextSimilarity(version1.prompt, version2.prompt);
    score += promptSimilarity * 0.4;
    factors++;

    // Compare parameters (60% weight)
    const paramDifferences = this.findParameterDifferences(
      version1.parameters,
      version2.parameters
    );
    const totalParams = 5; // aspectRatio, quality, style, seed, negativePrompt
    const paramSimilarity = 1 - paramDifferences.length / totalParams;
    score += paramSimilarity * 0.6;
    factors++;

    return score / factors;
  }

  private getTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    const commonWords = new Set([...words1].filter((w) => words2.has(w)));

    if (words1.size === 0 && words2.size === 0) return 1;
    if (words1.size === 0 || words2.size === 0) return 0;

    return (commonWords.size * 2) / (words1.size + words2.size);
  }
}

// Export singleton instance
export const imageHistoryService = new ImageHistoryService();
