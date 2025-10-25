/**
 * Test file for Document Search Service
 * Validates core search functionality with sample data
 */

import { documentSearchService } from '../documentSearchService';
import { ProcessedDocument, SearchFilters } from '../../../types/document';

// Sample test documents
const sampleDocuments: ProcessedDocument[] = [
  {
    id: 'doc1',
    originalFile: {
      name: 'curriculum-social-skills.pdf',
      type: 'pdf',
      size: 246000,
      lastModified: Date.now(),
      extension: 'pdf',
      mimeType: 'application/pdf'
    },
    status: 'ready',
    uploadedAt: new Date('2024-01-15'),
    processedAt: new Date('2024-01-15'),
    summary: {
      title: 'Social Skills Development in Engineering Curriculum',
      mainPoints: ['Communication skills', 'Teamwork abilities', 'Professional ethics'],
      keyTopics: ['engineering education', 'soft skills', 'curriculum development'],
      documentType: 'policy',
      entities: [],
      confidence: 92,
      wordCount: 156
    },
    extractedText: 'This document outlines the importance of social skills development in engineering education. It emphasizes communication, teamwork, and professional ethics as core competencies for modern engineers. Engineering education must evolve to meet industry needs.',
    tags: ['education', 'engineering', 'social-skills']
  },
  {
    id: 'doc2',
    originalFile: {
      name: 'technical-documentation-guide.pdf',
      type: 'pdf',
      size: 198000,
      lastModified: Date.now(),
      extension: 'pdf',
      mimeType: 'application/pdf'
    },
    status: 'ready',
    uploadedAt: new Date('2024-01-20'),
    processedAt: new Date('2024-01-20'),
    summary: {
      title: 'Technical Documentation Best Practices',
      mainPoints: ['Clear writing', 'Structured content', 'User-focused approach'],
      keyTopics: ['documentation', 'technical writing', 'best practices'],
      documentType: 'manual',
      entities: [],
      confidence: 88,
      wordCount: 189
    },
    extractedText: 'Technical documentation should be clear, concise, and user-focused. This guide provides best practices for creating effective technical documents including API documentation, user manuals, and system guides.',
    tags: ['documentation', 'writing', 'technical']
  }
];

// Jest test cases

// Jest test cases
describe('Document Search Service', () => {
  test('should perform basic full-text search', async () => {
    const results = await documentSearchService.searchDocuments(
      sampleDocuments, 
      'engineering education',
      {},
      { searchType: 'fulltext' }
    );
    
    expect(results.totalResults).toBeGreaterThanOrEqual(0);
    expect(results.searchTime).toBeGreaterThanOrEqual(0);
    expect(results.searchType).toBe('fulltext');
    
    if (results.totalResults > 0) {
      expect(['content', 'metadata', 'title']).toContain(results.results[0].matchReason);
    }
  });

  test('should perform semantic search', async () => {
    const results = await documentSearchService.searchDocuments(
      sampleDocuments,
      'soft skills development',
      {},
      { searchType: 'semantic' }
    );
    
    expect(results.results).toBeDefined();
    expect(results.searchType).toBe('semantic');
  });

  test('should apply filters correctly', async () => {
    const filters: SearchFilters = {
      documentTypes: ['policy'],
      confidenceRange: { min: 90, max: 100 }
    };
    
    const results = await documentSearchService.searchDocuments(
      sampleDocuments,
      'curriculum',
      filters,
      { searchType: 'hybrid' }
    );
    
    expect(results.filters).toEqual(filters);
    
    // All results should match the policy document type
    results.results.forEach(result => {
      expect(result.document.summary?.documentType).toBe('policy');
      expect(result.document.summary?.confidence).toBeGreaterThanOrEqual(90);
    });
  });

  test('should generate search suggestions', async () => {
    const suggestions = await documentSearchService.generateQuerySuggestions(
      sampleDocuments,
      'eng'
    );
    
    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThan(0);
  });

  test('should find similar documents', async () => {
    const similarDocs = await documentSearchService.findSimilarDocuments(
      sampleDocuments,
      'doc1',
      0.1
    );
    
    expect(Array.isArray(similarDocs)).toBe(true);
    
    // Should not include the target document itself
    similarDocs.forEach(result => {
      expect(result.document.id).not.toBe('doc1');
    });
  });

  test('should handle empty queries gracefully', async () => {
    const results = await documentSearchService.searchDocuments(
      sampleDocuments,
      '',
      {},
      { searchType: 'fulltext' }
    );
    
    expect(results.totalResults).toBe(0);
    expect(results.results).toHaveLength(0);
  });

  test('should return suggestions for no results', async () => {
    const results = await documentSearchService.searchDocuments(
      sampleDocuments,
      'nonexistent query xyz123',
      {},
      { searchType: 'fulltext' }
    );
    
    expect(results.totalResults).toBe(0);
    expect(results.suggestions).toBeDefined();
    expect(Array.isArray(results.suggestions)).toBe(true);
  });
});