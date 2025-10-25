/**
 * Tests for Virtualized Search Results Component
 */

import { render, screen } from '@testing-library/react';
import { VirtualizedSearchResults } from '../VirtualizedSearchResults';
import type { SearchResult } from '../../types/document';

// Mock @tanstack/react-virtual
// Create a smart mock that returns items based on actual array length
jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => {
    const itemCount = Math.min(count, 3); // Show up to 3 items in tests
    
    return {
      getVirtualItems: () => 
        Array.from({ length: itemCount }, (_, i) => ({
          key: i,
          index: i,
          start: i * 200,
          size: 200,
        })),
      getTotalSize: () => count * 200,
      scrollToIndex: jest.fn(),
    };
  },
}));

// Create mock search results
const createMockResult = (id: string, relevanceScore: number): SearchResult => ({
  document: {
    id,
    status: 'ready',
    originalFile: {
      name: `document-${id}.pdf`,
      type: 'application/pdf',
      size: 1024 * 100, // 100KB
      lastModified: Date.now(),
      extension: 'pdf',
      mimeType: 'application/pdf',
    },
    extractedText: `This is the extracted text for document ${id}`,
    previewText: `Preview text for document ${id}`,
    uploadedAt: new Date('2024-01-01'),
    retryCount: 0,
    tags: [],
    isFavorite: false,
  },
  relevanceScore,
  matchReason: 'content',
  matchedSnippets: [
    {
      text: 'test',
      startIndex: 10,
      endIndex: 14,
      score: 0.9,
      context: 'This is a test document with matching content',
    },
  ],
});

describe('VirtualizedSearchResults', () => {
  describe('rendering', () => {
    it('should render empty state when no results', () => {
      render(<VirtualizedSearchResults results={[]} />);
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    it('should render results list when results provided', () => {
      const results = [
        createMockResult('doc1', 95),
        createMockResult('doc2', 90),
        createMockResult('doc3', 85),
      ];

      render(<VirtualizedSearchResults results={results} />);
      
      // Should show result count
      expect(screen.getByText(/Showing 3 results/)).toBeInTheDocument();
      
      // Should show virtual scrolling indicator
      expect(screen.getByText('Virtual scrolling active')).toBeInTheDocument();
    });

    it('should render document names', () => {
      const results = [createMockResult('doc1', 95)];
      render(<VirtualizedSearchResults results={results} />);
      
      expect(screen.getByText('document-doc1.pdf')).toBeInTheDocument();
    });

    it('should render relevance scores', () => {
      const results = [createMockResult('doc1', 95)];
      render(<VirtualizedSearchResults results={results} />);
      
      expect(screen.getByText('95% match')).toBeInTheDocument();
    });

    it('should render match reason', () => {
      const results = [createMockResult('doc1', 95)];
      const { container } = render(<VirtualizedSearchResults results={results} />);
      const text = container.textContent || '';
      
      expect(text).toContain('Match:');
      expect(text).toContain('content');
    });

    it('should render snippet count', () => {
      const results = [createMockResult('doc1', 95)];
      const { container } = render(<VirtualizedSearchResults results={results} />);
      const text = container.textContent || '';
      
      expect(text).toContain('1');
      expect(text).toContain('snippet');
    });

    it('should render multiple snippets count', () => {
      const result = createMockResult('doc1', 95);
      result.matchedSnippets.push({
        text: 'another',
        startIndex: 20,
        endIndex: 27,
        score: 0.8,
        context: 'This is another matched snippet',
      });

      const { container } = render(<VirtualizedSearchResults results={[result]} />);
      const text = container.textContent || '';
      
      expect(text).toContain('2');
      expect(text).toContain('snippet');
    });

    it('should render preview text', () => {
      const results = [createMockResult('doc1', 95)];
      render(<VirtualizedSearchResults results={results} />);
      
      expect(screen.getByText(/Preview text for document doc1/)).toBeInTheDocument();
    });

    it('should show performance info', () => {
      const results = [
        createMockResult('doc1', 95),
        createMockResult('doc2', 90),
        createMockResult('doc3', 85),
      ];

      render(<VirtualizedSearchResults results={results} />);
      
      // Should show rendering stats
      expect(screen.getByText(/Rendering \d+ of 3 items/)).toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it('should highlight selected document', () => {
      const results = [
        createMockResult('doc1', 95),
        createMockResult('doc2', 90),
      ];

      const { container } = render(
        <VirtualizedSearchResults
          results={results}
          selectedDocumentId="doc1"
        />
      );

      // Find the selected item by its border styling
      const articles = container.querySelectorAll('article');
      const selectedArticle = Array.from(articles).find(article =>
        article.className.includes('border-blue-500')
      );

      expect(selectedArticle).toBeTruthy();
    });

    it('should call onSelectDocument when item clicked', () => {
      const onSelectDocument = jest.fn();
      const results = [createMockResult('doc1', 95)];

      render(
        <VirtualizedSearchResults
          results={results}
          onSelectDocument={onSelectDocument}
        />
      );

      const article = screen.getByRole('button');
      article.click();

      expect(onSelectDocument).toHaveBeenCalledWith('doc1');
    });

    it('should not highlight any document when none selected', () => {
      const results = [createMockResult('doc1', 95)];
      const { container } = render(
        <VirtualizedSearchResults results={results} />
      );

      const articles = container.querySelectorAll('article');
      const selectedArticle = Array.from(articles).find(article =>
        article.className.includes('border-blue-500')
      );

      expect(selectedArticle).toBeFalsy();
    });
  });

  describe('accessibility', () => {
    it('should have clickable role when onSelectDocument provided', () => {
      const results = [createMockResult('doc1', 95)];
      render(
        <VirtualizedSearchResults
          results={results}
          onSelectDocument={jest.fn()}
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      const onSelectDocument = jest.fn();
      const results = [createMockResult('doc1', 95)];

      render(
        <VirtualizedSearchResults
          results={results}
          onSelectDocument={onSelectDocument}
        />
      );

      const article = screen.getByRole('button');
      expect(article).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('performance', () => {
    it('should handle large result sets', () => {
      // Create 1000 results
      const results = Array.from({ length: 1000 }, (_, i) =>
        createMockResult(`doc${i}`, 95 - i * 0.01)
      );

      const { container } = render(
        <VirtualizedSearchResults results={results} />
      );

      // Should show total count
      expect(screen.getByText(/Showing 1000 results/)).toBeInTheDocument();

      // Should only render visible items (3 in our mock)
      const articles = container.querySelectorAll('article');
      expect(articles.length).toBeLessThanOrEqual(3);
    });

    it('should display correct rendering stats for large lists', () => {
      const results = Array.from({ length: 10000 }, (_, i) =>
        createMockResult(`doc${i}`, 95)
      );

      render(<VirtualizedSearchResults results={results} />);
      
      // Should show it's rendering only a subset
      expect(screen.getByText(/Rendering 3 of 10000 items/)).toBeInTheDocument();
    });
  });

  describe('snippet display', () => {
    it('should display first 2 snippets', () => {
      const result = createMockResult('doc1', 95);
      result.matchedSnippets = [
        {
          text: 'first',
          startIndex: 0,
          endIndex: 5,
          score: 0.9,
          context: 'First matched snippet context',
        },
        {
          text: 'second',
          startIndex: 10,
          endIndex: 16,
          score: 0.85,
          context: 'Second matched snippet context',
        },
        {
          text: 'third',
          startIndex: 20,
          endIndex: 25,
          score: 0.8,
          context: 'Third matched snippet context',
        },
      ];

      const { container } = render(<VirtualizedSearchResults results={[result]} />);
      
      // Should show first 2 snippets (component shows context with ellipsis)
      expect(screen.getByText(/First matched snippet/)).toBeInTheDocument();
      expect(screen.getByText(/Second matched snippet/)).toBeInTheDocument();
      
      // Verify only 2 snippet divs rendered (not 3)
      const snippetDivs = container.querySelectorAll('.bg-yellow-50');
      expect(snippetDivs.length).toBe(2);
    });

    it('should handle results with no snippets', () => {
      const result = createMockResult('doc1', 95);
      result.matchedSnippets = [];

      const { container } = render(<VirtualizedSearchResults results={[result]} />);
      
      // Should not crash - verify no snippet divs are rendered
      const snippetDivs = container.querySelectorAll('.bg-yellow-50');
      expect(snippetDivs.length).toBe(0);
    });
  });

  describe('document metadata', () => {
    it('should show file size when available', () => {
      const results = [createMockResult('doc1', 95)];
      const { container } = render(<VirtualizedSearchResults results={results} />);
      
      // File size is 100KB in our mock - just check it contains "KB"
      const text = container.textContent || '';
      expect(text).toContain('KB');
    });

    it('should show upload date when available', () => {
      const results = [createMockResult('doc1', 95)];
      const { container } = render(<VirtualizedSearchResults results={results} />);
      
      // Date should be formatted - check container text contains "2024"
      const text = container.textContent || '';
      expect(text).toContain('2024');
    });

    it('should show document type from summary', () => {
      const result = createMockResult('doc1', 95);
      result.document.summary = {
        title: 'Test Document',
        mainPoints: ['Point 1'],
        keyTopics: ['Topic 1'],
        documentType: 'report',
        entities: [],
        confidence: 0.9,
      };

      const { container } = render(<VirtualizedSearchResults results={[result]} />);
      const text = container.textContent || '';
      expect(text).toContain('report');
    });
  });
});
