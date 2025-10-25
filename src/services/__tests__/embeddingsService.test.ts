/**
 * Embeddings Service Tests
 * Verifies vector generation, storage, and similarity search
 */

import { embeddingsService, EmbeddingsService } from '../embeddingsService';

describe('EmbeddingsService', () => {
  beforeEach(async () => {
    // Clear all embeddings before each test
    await embeddingsService.clearAll();
  });

  afterAll(async () => {
    // Clean up after all tests
    await embeddingsService.clearAll();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await embeddingsService.initialize();
      const stats = embeddingsService.getStats();

      expect(stats.isInitialized).toBe(true);
      expect(stats.vectorDimensions).toBe(384);
    });

    it('should not reinitialize if already initialized', async () => {
      await embeddingsService.initialize();
      const statsBefore = embeddingsService.getStats();

      await embeddingsService.initialize(); // Second call
      const statsAfter = embeddingsService.getStats();

      expect(statsAfter).toEqual(statsBefore);
    });
  });

  describe('generateEmbedding', () => {
    it('should generate vector of correct dimensions', async () => {
      const vector = await embeddingsService.generateEmbedding('test text');

      expect(Array.isArray(vector)).toBe(true);
      expect(vector.length).toBe(384);
    });

    it('should generate different vectors for different text', async () => {
      const vector1 = await embeddingsService.generateEmbedding('machine learning');
      const vector2 = await embeddingsService.generateEmbedding('artificial intelligence');

      // Vectors should be different
      expect(vector1).not.toEqual(vector2);
    });

    it('should handle empty string', async () => {
      const vector = await embeddingsService.generateEmbedding('');

      expect(Array.isArray(vector)).toBe(true);
      expect(vector.length).toBe(384);
      expect(vector.every(v => v === 0)).toBe(true);
    });

    it('should normalize vectors to unit length', async () => {
      const vector = await embeddingsService.generateEmbedding('test normalization');

      // Calculate vector magnitude
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));

      // Should be approximately 1 (unit vector)
      expect(magnitude).toBeCloseTo(1, 5);
    });
  });

  describe('storeEmbedding', () => {
    it('should store embedding successfully', async () => {
      const id = await embeddingsService.storeEmbedding('test content', {
        source: 'test',
        tag: 'example',
      });

      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);

      const stats = embeddingsService.getStats();
      expect(stats.totalEmbeddings).toBe(1);
    });

    it('should retrieve stored embedding', async () => {
      const content = 'machine learning algorithms';
      const metadata = { topic: 'AI', difficulty: 'intermediate' };

      const id = await embeddingsService.storeEmbedding(content, metadata);
      const retrieved = await embeddingsService.getEmbedding(id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.content).toBe(content);
      expect(retrieved?.metadata).toEqual(metadata);
      expect(retrieved?.vector.length).toBe(384);
    });

    it('should persist to IndexedDB', async () => {
      const id = await embeddingsService.storeEmbedding('persistent test');

      // Create new instance to test persistence
      const newService = EmbeddingsService.getInstance();
      await newService.initialize();

      const retrieved = await newService.getEmbedding(id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.content).toBe('persistent test');
    });
  });

  describe('updateEmbedding', () => {
    it('should update existing embedding', async () => {
      const id = await embeddingsService.storeEmbedding('original content', {
        version: 1,
      });

      await embeddingsService.updateEmbedding(id, 'updated content', {
        version: 2,
      });

      const updated = await embeddingsService.getEmbedding(id);
      expect(updated?.content).toBe('updated content');
      expect(updated?.metadata.version).toBe(2);
    });

    it('should throw error for non-existent embedding', async () => {
      await expect(
        embeddingsService.updateEmbedding('non-existent-id', 'content')
      ).rejects.toThrow('Embedding non-existent-id not found');
    });
  });

  describe('deleteEmbedding', () => {
    it('should delete embedding successfully', async () => {
      const id = await embeddingsService.storeEmbedding('to be deleted');

      await embeddingsService.deleteEmbedding(id);

      const retrieved = await embeddingsService.getEmbedding(id);
      expect(retrieved).toBeNull();

      const stats = embeddingsService.getStats();
      expect(stats.totalEmbeddings).toBe(0);
    });
  });

  describe('searchSimilar', () => {
    beforeEach(async () => {
      // Store test embeddings
      await embeddingsService.storeEmbedding('machine learning algorithms');
      await embeddingsService.storeEmbedding('deep neural networks');
      await embeddingsService.storeEmbedding('artificial intelligence systems');
      await embeddingsService.storeEmbedding('cooking recipes for dinner');
      await embeddingsService.storeEmbedding('travel destinations in Europe');
    });

    it('should find similar embeddings', async () => {
      const results = await embeddingsService.searchSimilar('AI and machine learning', 3);

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(3);

      // Each result should have similarity score
      results.forEach(result => {
        expect(result.similarity).toBeDefined();
        expect(result.similarity).toBeGreaterThanOrEqual(0);
        expect(result.similarity).toBeLessThanOrEqual(1);
      });
    });

    it('should return results sorted by similarity', async () => {
      const results = await embeddingsService.searchSimilar('neural networks', 5);

      // Verify descending order
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
      }
    });

    it('should filter by minimum similarity', async () => {
      const results = await embeddingsService.searchSimilar('cooking', 10, 0.5);

      // All results should have similarity >= 0.5
      results.forEach(result => {
        expect(result.similarity).toBeGreaterThanOrEqual(0.5);
      });
    });

    it('should return empty array when no embeddings exist', async () => {
      await embeddingsService.clearAll();

      const results = await embeddingsService.searchSimilar('test query');

      expect(results).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      const results = await embeddingsService.searchSimilar('machine learning', 2);

      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getAllEmbeddings', () => {
    it('should return all stored embeddings', async () => {
      await embeddingsService.storeEmbedding('first');
      await embeddingsService.storeEmbedding('second');
      await embeddingsService.storeEmbedding('third');

      const all = await embeddingsService.getAllEmbeddings();

      expect(all.length).toBe(3);
      expect(all.every(emb => emb.vector.length === 384)).toBe(true);
    });

    it('should return empty array when no embeddings', async () => {
      const all = await embeddingsService.getAllEmbeddings();

      expect(all).toEqual([]);
    });
  });

  describe('clearAll', () => {
    it('should clear all embeddings', async () => {
      await embeddingsService.storeEmbedding('first');
      await embeddingsService.storeEmbedding('second');

      await embeddingsService.clearAll();

      const stats = embeddingsService.getStats();
      expect(stats.totalEmbeddings).toBe(0);

      const all = await embeddingsService.getAllEmbeddings();
      expect(all.length).toBe(0);
    });
  });

  describe('cosine similarity calculations', () => {
    it('should calculate high similarity for similar texts', async () => {
      const id1 = await embeddingsService.storeEmbedding('machine learning algorithms');
      const id2 = await embeddingsService.storeEmbedding('machine learning techniques');

      const emb1 = await embeddingsService.getEmbedding(id1);
      const emb2 = await embeddingsService.getEmbedding(id2);

      // Calculate similarity manually
      const dotProduct = emb1!.vector.reduce((sum, val, i) => sum + val * emb2!.vector[i], 0);

      // Similarity should be relatively high for similar text
      expect(dotProduct).toBeGreaterThan(0.5);
    });

    it('should calculate low similarity for dissimilar texts', async () => {
      // Store a completely different topic
      await embeddingsService.storeEmbedding('cooking pasta recipes');

      const dissimilarResults = await embeddingsService.searchSimilar('quantum physics', 10);

      // 'cooking pasta' should have low similarity to 'quantum physics'
      const cookingResult = dissimilarResults.find(r => r.content.includes('pasta'));
      if (cookingResult) {
        expect(cookingResult.similarity).toBeLessThan(0.3);
      }
    });
  });
});
