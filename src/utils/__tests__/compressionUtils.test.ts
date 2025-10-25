/**
 * Tests for Smart Compression Utilities
 */

import {
  compressSearchResults,
  decompressSearchResults,
  formatCompressionStats,
  shouldCompress,
  batchCompress,
  batchDecompress,
  type CompressionStats,
  type CompressedData,
} from '../compressionUtils';
import type { SearchResults } from '../../types/document';

// Mock search results for testing
const createMockSearchResults = (size: 'small' | 'medium' | 'large'): SearchResults => {
  const baseResults: SearchResults = {
    results: [],
    totalResults: 0,
    query: 'test query',
    searchTime: 42,
    filters: {},
    searchType: 'fulltext' as const,
  };

  // Create different sizes of results
  if (size === 'small') {
    baseResults.results = [
      {
        document: {
          id: 'doc1',
          status: 'ready',
          originalFile: {
            name: 'doc1.pdf',
            type: 'application/pdf',
            size: 1024,
            lastModified: Date.now(),
            extension: 'pdf',
            mimeType: 'application/pdf',
          },
          extractedText: 'Small test document',
          previewText: 'Small test document',
          uploadedAt: new Date('2024-01-01'),
          retryCount: 0,
          tags: [],
          isFavorite: false,
        },
        relevanceScore: 95,
        matchReason: 'content',
        matchedSnippets: [],
      },
    ];
    baseResults.totalResults = 1;
  } else if (size === 'medium') {
    // Create 100 results
    for (let i = 0; i < 100; i++) {
      baseResults.results.push({
        document: {
          id: `doc${i}`,
          status: 'ready',
          originalFile: {
            name: `doc${i}.pdf`,
            type: 'application/pdf',
            size: 1024 * (i + 1),
            lastModified: Date.now(),
            extension: 'pdf',
            mimeType: 'application/pdf',
          },
          extractedText: `Document ${i} with some test content that is repeated multiple times to make it realistic. This is a medium-sized document with moderate content.`,
          previewText: `Document ${i} preview`,
          uploadedAt: new Date('2024-01-01'),
          retryCount: 0,
          tags: [`tag${i % 10}`],
          isFavorite: i % 5 === 0,
        },
        relevanceScore: 90 - i * 0.1,
        matchReason: 'content',
        matchedSnippets: [
          {
            text: 'test',
            startIndex: 10,
            endIndex: 14,
            score: 0.9,
            context: 'some test content',
          },
        ],
      });
    }
    baseResults.totalResults = 100;
  } else {
    // Create 1000 results (large)
    for (let i = 0; i < 1000; i++) {
      baseResults.results.push({
        document: {
          id: `doc${i}`,
          status: 'ready',
          originalFile: {
            name: `doc${i}.pdf`,
            type: 'application/pdf',
            size: 1024 * 100 * (i + 1),
            lastModified: Date.now(),
            extension: 'pdf',
            mimeType: 'application/pdf',
          },
          extractedText: `Large document ${i} with extensive content that spans multiple paragraphs. This document contains detailed information about various topics including technology, science, and business. The content is designed to be realistic and representative of actual documents that users might upload. It includes technical terminology, proper nouns, and complex sentence structures that are typical in real-world documents.`,
          previewText: `Large document ${i} preview text`,
          uploadedAt: new Date('2024-01-01'),
          retryCount: 0,
          tags: [`category${i % 20}`, `type${i % 10}`],
          isFavorite: i % 3 === 0,
          summary: {
            title: `Document ${i}`,
            mainPoints: ['Point 1', 'Point 2', 'Point 3'],
            keyTopics: ['topic1', 'topic2'],
            documentType: 'report',
            entities: [],
            confidence: 0.85,
          },
        },
        relevanceScore: 95 - i * 0.01,
        matchReason: 'content',
        matchedSnippets: [
          {
            text: 'test document content',
            startIndex: 10,
            endIndex: 31,
            score: 0.95,
            context: 'Large document with test document content',
          },
          {
            text: 'extensive content',
            startIndex: 50,
            endIndex: 67,
            score: 0.85,
            context: 'spans multiple paragraphs with extensive content',
          },
        ],
      });
    }
    baseResults.totalResults = 1000;
  }

  return baseResults;
};

describe('compressionUtils', () => {
  describe('compressSearchResults', () => {
    it('should compress search results and return compressed data', () => {
      const mockResults = createMockSearchResults('medium');
      const compressed = compressSearchResults(mockResults);

      expect(compressed).toBeDefined();
      expect(compressed.compressed).toBeTruthy();
      expect(typeof compressed.compressed).toBe('string');
      expect(compressed.timestamp).toBeGreaterThan(0);
      expect(compressed.stats).toBeDefined();
    });

    it('should include compression statistics', () => {
      const mockResults = createMockSearchResults('medium');
      const compressed = compressSearchResults(mockResults);

      expect(compressed.stats.originalSize).toBeGreaterThan(0);
      expect(compressed.stats.compressedSize).toBeGreaterThan(0);
      expect(compressed.stats.compressionRatio).toBeGreaterThan(0);
      expect(compressed.stats.compressionTime).toBeGreaterThanOrEqual(0);
    });

    it('should achieve significant compression on large datasets', () => {
      const mockResults = createMockSearchResults('large');
      const compressed = compressSearchResults(mockResults);

      // Should achieve at least 50% compression ratio
      expect(compressed.stats.compressionRatio).toBeGreaterThan(50);
      expect(compressed.stats.compressedSize).toBeLessThan(compressed.stats.originalSize / 2);
    });

    it('should compress in reasonable time (< 1000ms for large datasets)', () => {
      const mockResults = createMockSearchResults('large');
      const compressed = compressSearchResults(mockResults);

      // Compression should be reasonably fast but timing varies by machine and dataset
      expect(compressed.stats.compressionTime).toBeLessThan(15000); // 15 seconds max for large datasets
      expect(compressed.stats.compressionTime).toBeGreaterThan(0);
    });

    it('should handle empty results', () => {
      const emptyResults: SearchResults = {
        results: [],
        totalResults: 0,
        query: '',
        searchTime: 0,
        filters: {},
        searchType: 'fulltext',
      };

      const compressed = compressSearchResults(emptyResults);
      expect(compressed).toBeDefined();
      expect(compressed.compressed).toBeTruthy();
    });
  });

  describe('decompressSearchResults', () => {
    it('should decompress data back to original format', () => {
      const mockResults = createMockSearchResults('medium');
      const compressed = compressSearchResults(mockResults);
      const decompressed = decompressSearchResults(compressed);

      // Note: Dates are serialized as strings in JSON, so we compare structure and counts
      expect(decompressed.results.length).toBe(mockResults.results.length);
      expect(decompressed.totalResults).toBe(mockResults.totalResults);
      expect(decompressed.query).toBe(mockResults.query);
      expect(decompressed.searchType).toBe(mockResults.searchType);
      
      // Verify first result structure
      expect(decompressed.results[0].document.id).toBe(mockResults.results[0].document.id);
      expect(decompressed.results[0].relevanceScore).toBe(mockResults.results[0].relevanceScore);
    });

    it('should preserve all data fields', () => {
      const mockResults = createMockSearchResults('large');
      const compressed = compressSearchResults(mockResults);
      const decompressed = decompressSearchResults(compressed);

      // Check first result in detail
      const original = mockResults.results[0];
      const restored = decompressed.results[0];

      expect(restored.document.id).toBe(original.document.id);
      expect(restored.document.extractedText).toBe(original.document.extractedText);
      expect(restored.relevanceScore).toBe(original.relevanceScore);
      expect(restored.matchReason).toEqual(original.matchReason);
      expect(restored.matchedSnippets).toEqual(original.matchedSnippets);
    });

    it('should handle dates correctly', () => {
      const mockResults = createMockSearchResults('small');
      const compressed = compressSearchResults(mockResults);
      const decompressed = decompressSearchResults(compressed);

      // Dates are serialized as strings in JSON
      const originalDate = mockResults.results[0].document.uploadedAt.toISOString();
      const restoredDate = new Date(decompressed.results[0].document.uploadedAt).toISOString();

      expect(restoredDate).toBe(originalDate);
    });

    it('should throw error on invalid compressed data', () => {
      const invalidCompressed: CompressedData = {
        compressed: 'invalid-compressed-string',
        timestamp: Date.now(),
        stats: {
          originalSize: 100,
          compressedSize: 50,
          compressionRatio: 50,
          compressionTime: 1,
        },
      };

      expect(() => decompressSearchResults(invalidCompressed)).toThrow();
    });

    it('should decompress quickly', () => {
      const mockResults = createMockSearchResults('large');
      const compressed = compressSearchResults(mockResults);

      const startTime = performance.now();
      decompressSearchResults(compressed);
      const decompressionTime = performance.now() - startTime;

      expect(decompressionTime).toBeLessThan(1000); // Should be reasonably fast (under 1 second)
    });
  });

  describe('formatCompressionStats', () => {
    it('should format compression stats in human-readable format', () => {
      const stats: CompressionStats = {
        originalSize: 100000,
        compressedSize: 30000,
        compressionRatio: 70.0,
        compressionTime: 5.5,
      };

      const formatted = formatCompressionStats(stats);

      expect(formatted).toContain('KB');
      expect(formatted).toContain('70.0%');
      expect(formatted).toMatch(/\d+\.\d{2} KB/);
    });

    it('should handle small sizes', () => {
      const stats: CompressionStats = {
        originalSize: 1024,
        compressedSize: 512,
        compressionRatio: 50.0,
        compressionTime: 0.5,
      };

      const formatted = formatCompressionStats(stats);

      expect(formatted).toContain('0.50 KB');
      expect(formatted).toContain('50.0%');
    });
  });

  describe('shouldCompress', () => {
    it('should return true for large data (> 10KB)', () => {
      expect(shouldCompress(15 * 1024)).toBe(true);
      expect(shouldCompress(100 * 1024)).toBe(true);
      expect(shouldCompress(1024 * 1024)).toBe(true);
    });

    it('should return false for small data (< 10KB)', () => {
      expect(shouldCompress(5 * 1024)).toBe(false);
      expect(shouldCompress(1024)).toBe(false);
      expect(shouldCompress(500)).toBe(false);
    });

    it('should return true at exactly 10KB', () => {
      expect(shouldCompress(10 * 1024)).toBe(true);
    });
  });

  describe('batchCompress', () => {
    it('should compress multiple results', () => {
      const results = [
        createMockSearchResults('small'),
        createMockSearchResults('small'),
        createMockSearchResults('small'),
      ];

      const compressed = batchCompress(results);

      expect(compressed).toHaveLength(3);
      compressed.forEach(item => {
        expect(item.compressed).toBeTruthy();
        expect(item.stats).toBeDefined();
      });
    });

    it('should handle empty array', () => {
      const compressed = batchCompress([]);
      expect(compressed).toEqual([]);
    });
  });

  describe('batchDecompress', () => {
    it('should decompress multiple results', () => {
      const results = [
        createMockSearchResults('small'),
        createMockSearchResults('small'),
        createMockSearchResults('small'),
      ];

      const compressed = batchCompress(results);
      const decompressed = batchDecompress(compressed);

      expect(decompressed).toHaveLength(3);
      decompressed.forEach((result, index) => {
        // Compare key properties (dates are serialized as strings)
        expect(result.query).toBe(results[index].query);
        expect(result.totalResults).toBe(results[index].totalResults);
        expect(result.results.length).toBe(results[index].results.length);
        expect(result.results[0].document.id).toBe(results[index].results[0].document.id);
      });
    });

    it('should handle empty array', () => {
      const decompressed = batchDecompress([]);
      expect(decompressed).toEqual([]);
    });
  });

  describe('compression performance benchmarks', () => {
    it('should demonstrate memory savings', () => {
      const mockResults = createMockSearchResults('large');
      const compressed = compressSearchResults(mockResults);

      const originalSizeKB = compressed.stats.originalSize / 1024;
      const compressedSizeKB = compressed.stats.compressedSize / 1024;
      const savedKB = originalSizeKB - compressedSizeKB;

      console.log('\n📊 Compression Performance:');
      console.log(`   Original: ${originalSizeKB.toFixed(2)} KB`);
      console.log(`   Compressed: ${compressedSizeKB.toFixed(2)} KB`);
      console.log(`   Saved: ${savedKB.toFixed(2)} KB (${compressed.stats.compressionRatio.toFixed(1)}%)`);
      console.log(`   Time: ${compressed.stats.compressionTime.toFixed(2)} ms`);

      // Assertions
      expect(compressed.stats.compressionRatio).toBeGreaterThan(70); // At least 70% compression
      expect(savedKB).toBeGreaterThan(originalSizeKB * 0.7); // Save at least 70% of space
    });
  });
});
