/**
 * Embeddings Service - Semantic Search with Vector Storage
 * 
 * Provides semantic search capabilities using text embeddings stored in IndexedDB.
 * Uses simple TF-IDF + normalized vectors for fast, client-side semantic similarity.
 * 
 * For production, could be enhanced with:
 * - Gemini embeddings API
 * - Local embedding models via ONNX Runtime
 * - More sophisticated vectorization algorithms
 */

import Dexie, { Table } from 'dexie';

export interface Embedding {
  id: string;
  vector: number[];
  content: string;
  metadata: Record<string, any>;
}

interface StoredEmbedding extends Embedding {
  createdAt: string;
  updatedAt: string;
}

/**
 * IndexedDB database for embeddings storage
 */
class EmbeddingsDatabase extends Dexie {
  embeddings!: Table<StoredEmbedding, string>;

  constructor() {
    super('EmbeddingsDB');
    this.version(1).stores({
      embeddings: 'id, createdAt, *metadata.tags',
    });
  }
}

/**
 * Embeddings Service with persistent storage
 */
export class EmbeddingsService {
  private static instance: EmbeddingsService;
  private embeddings: Map<string, Embedding> = new Map();
  private db: EmbeddingsDatabase;
  private isInitialized = false;
  private readonly VECTOR_DIMENSIONS = 384;

  private constructor() {
    this.db = new EmbeddingsDatabase();
  }

  static getInstance(): EmbeddingsService {
    if (!EmbeddingsService.instance) {
      EmbeddingsService.instance = new EmbeddingsService();
    }
    return EmbeddingsService.instance;
  }

  /**
   * Initialize service and load existing embeddings from IndexedDB
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🚀 Initializing Embeddings Service...');

      // Load existing embeddings from IndexedDB
      const stored = await this.db.embeddings.toArray();
      console.log(`📦 Loaded ${stored.length} embeddings from IndexedDB`);

      // Populate memory cache
      for (const emb of stored) {
        this.embeddings.set(emb.id, {
          id: emb.id,
          vector: emb.vector,
          content: emb.content,
          metadata: emb.metadata,
        });
      }

      this.isInitialized = true;
      console.log('✅ Embeddings service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize embeddings service:', error);
      throw error;
    }
  }

  /**
   * Generate embedding vector for text
   * Uses simple TF-IDF approach for fast client-side vectorization
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      return new Array(this.VECTOR_DIMENSIONS).fill(0);
    }

    // Normalize and tokenize text
    const normalized = text.toLowerCase().trim();
    const tokens = this.tokenize(normalized);

    // Calculate term frequencies
    const termFreq = new Map<string, number>();
    for (const token of tokens) {
      termFreq.set(token, (termFreq.get(token) || 0) + 1);
    }

    // Create vector using simplified TF-IDF
    const vector = new Array(this.VECTOR_DIMENSIONS).fill(0);

    // Hash tokens into vector dimensions using simple hash function
    for (const [term, freq] of termFreq.entries()) {
      const hash = this.simpleHash(term) % this.VECTOR_DIMENSIONS;
      vector[hash] += freq / tokens.length; // Normalized term frequency
    }

    // Normalize vector to unit length
    return this.normalizeVector(vector);
  }

  /**
   * Store embedding in both memory and IndexedDB
   */
  async storeEmbedding(content: string, metadata: Record<string, any> = {}): Promise<string> {
    const id = crypto.randomUUID();
    const vector = await this.generateEmbedding(content);

    const embedding: Embedding = {
      id,
      vector,
      content,
      metadata,
    };

    // Store in memory
    this.embeddings.set(id, embedding);

    // Persist to IndexedDB
    try {
      await this.db.embeddings.add({
        ...embedding,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log(`💾 Stored embedding: ${id}`);
    } catch (error) {
      console.error('Failed to persist embedding to IndexedDB:', error);
    }

    return id;
  }

  /**
   * Update existing embedding
   */
  async updateEmbedding(id: string, content: string, metadata?: Record<string, any>): Promise<void> {
    const existing = this.embeddings.get(id);
    if (!existing) {
      throw new Error(`Embedding ${id} not found`);
    }

    const vector = await this.generateEmbedding(content);

    const updated: Embedding = {
      id,
      vector,
      content,
      metadata: metadata || existing.metadata,
    };

    // Update memory
    this.embeddings.set(id, updated);

    // Update IndexedDB
    await this.db.embeddings.update(id, {
      ...updated,
      updatedAt: new Date().toISOString(),
    } as Partial<StoredEmbedding>);

    console.log(`🔄 Updated embedding: ${id}`);
  }

  /**
   * Delete embedding
   */
  async deleteEmbedding(id: string): Promise<void> {
    this.embeddings.delete(id);
    await this.db.embeddings.delete(id);
    console.log(`🗑️ Deleted embedding: ${id}`);
  }

  /**
   * Search for similar embeddings using cosine similarity
   */
  async searchSimilar(query: string, limit: number = 5, minSimilarity: number = 0.3): Promise<Array<Embedding & { similarity: number }>> {
    const queryVector = await this.generateEmbedding(query);
    const embeddings = Array.from(this.embeddings.values());

    if (embeddings.length === 0) {
      return [];
    }

    // Calculate cosine similarity for all embeddings
    const similarities = embeddings.map(emb => ({
      ...emb,
      similarity: this.cosineSimilarity(queryVector, emb.vector),
    }));

    // Filter by minimum similarity and sort
    return similarities
      .filter(item => item.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Get embedding by ID
   */
  async getEmbedding(id: string): Promise<Embedding | null> {
    return this.embeddings.get(id) || null;
  }

  /**
   * Get all embeddings
   */
  async getAllEmbeddings(): Promise<Embedding[]> {
    return Array.from(this.embeddings.values());
  }

  /**
   * Clear all embeddings (memory and storage)
   */
  async clearAll(): Promise<void> {
    this.embeddings.clear();
    await this.db.embeddings.clear();
    console.log('🧹 Cleared all embeddings');
  }

  /**
   * Get statistics
   */
  getStats(): { totalEmbeddings: number; isInitialized: boolean; vectorDimensions: number } {
    return {
      totalEmbeddings: this.embeddings.size,
      isInitialized: this.isInitialized,
      vectorDimensions: this.VECTOR_DIMENSIONS,
    };
  }

  // ========== Private Helper Methods ==========

  /**
   * Tokenize text into words
   */
  private tokenize(text: string): string[] {
    // Remove punctuation and split on whitespace
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2); // Filter out very short tokens
  }

  /**
   * Simple string hash function for vector dimension mapping
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Normalize vector to unit length
   */
  private normalizeVector(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (norm === 0) return vector;
    return vector.map(val => val / norm);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have same dimensions');
    }

    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (normA * normB);
  }
}

// Export singleton instance
export const embeddingsService = EmbeddingsService.getInstance();
