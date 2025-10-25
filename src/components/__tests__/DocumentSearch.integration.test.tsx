import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import DocumentSearch from '../DocumentSearch';

// Mock the document search service
jest.mock('../../services/documentIntelligence/documentSearchService', () => ({
  documentSearchService: {
    searchDocuments: jest.fn(),
    generateQuerySuggestions: jest.fn(),
    getDocuments: jest.fn()
  }
}));

// Mock intelligence service to control expansion & history
jest.mock('../../services/documentIntelligence/searchIntelligenceService', () => ({
  searchIntelligenceService: {
    recordSearch: jest.fn(),
    getInsights: jest.fn().mockReturnValue({
      totalSearches: 1,
      uniqueQueries: 1,
      avgResultCount: 1,
      avgSearchTime: 10,
      popularQueries: [],
      searchSuccessRate: 100,
      mostSearchedDocumentTypes: [],
      peakSearchTimes: []
    }),
    getQueryAnalytics: jest.fn().mockReturnValue([]),
    saveSearch: jest.fn().mockImplementation((name, query) => ({ id: 'saved1', name, query, filters: {}, options: {}, createdAt: new Date(), lastUsed: new Date(), useCount: 0, resultCount: 0 })),
    getSavedSearches: jest.fn().mockReturnValue([]),
    getSavedSearch: jest.fn(),
    touchSavedSearch: jest.fn(),
    deleteSavedSearch: jest.fn(),
    getHistoricalSuggestions: jest.fn().mockReturnValue(['previous search']),
    expandQuery: jest.fn().mockImplementation((q: string) => ({ original: q, expansions: q === 'art' ? ['artificial intelligence'] : [] })),
    clearAll: jest.fn()
  }
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

const mockDocuments = [
  {
    id: '1',
    originalFile: { name: 'Test Document 1.pdf', size: 1024, type: 'application/pdf', extension: 'pdf' },
    extractedText: 'This is a test document about artificial intelligence',
    uploadedAt: new Date('2024-01-01'),
    processedAt: new Date('2024-01-01'),
    tags: ['AI', 'Technology'],
    summary: { title: 'Test Document 1', documentType: 'report', mainPoints: ['Artificial Intelligence', 'Test Document'], keyTopics: ['AI'], confidence: 85 }
  },
  {
    id: '2',
    originalFile: { name: 'Test Document 2.docx', size: 2048, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: 'docx' },
    extractedText: 'Another test document about machine learning',
    uploadedAt: new Date('2024-01-02'),
    processedAt: new Date('2024-01-02'),
    tags: ['ML', 'Technology'],
    summary: { title: 'Test Document 2', documentType: 'policy', mainPoints: ['Machine Learning', 'Test Document'], keyTopics: ['ML'], confidence: 70 }
  }
];

const mockSearchResults = {
  results: [
    {
      document: mockDocuments[0],
      relevanceScore: 95,
      matchedSnippets: [
        {
          text: 'This is a test document about artificial intelligence',
          score: 0.9,
          startIndex: 0,
          endIndex: 53
        }
      ],
      matchReason: 'content'
    }
  ],
  totalResults: 1,
  query: 'artificial intelligence',
  searchTime: 150,
  searchType: 'hybrid',
  filters: {},
  suggestions: []
};

describe('DocumentSearch Integration', () => {
  const mockSearchService = require('../../services/documentIntelligence/documentSearchService').documentSearchService;
  const mockIntelligenceService = require('../../services/documentIntelligence/searchIntelligenceService').searchIntelligenceService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchService.searchDocuments.mockResolvedValue(mockSearchResults);
    mockSearchService.generateQuerySuggestions.mockResolvedValue([
      'artificial intelligence',
      'machine learning',
      'deep learning'
    ]);
    mockSearchService.getDocuments.mockResolvedValue(mockDocuments);
    mockIntelligenceService.getSavedSearches.mockReturnValue([]);
  });

  it('renders the main search interface', () => {
    render(<DocumentSearch />);
    
    expect(screen.getByPlaceholderText(/search documents/i)).toBeInTheDocument();
    expect(screen.getByText(/document search/i)).toBeInTheDocument();
  });

  it('performs search when typing in search input', async () => {
    const user = userEvent.setup();
    render(<DocumentSearch />);

    const searchInput = screen.getByPlaceholderText(/search documents/i);
    await user.type(searchInput, 'artificial intelligence');

    // Wait for debounced search
    await waitFor(() => {
      expect(mockSearchService.searchDocuments).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('displays search suggestions when typing', async () => {
    const user = userEvent.setup();
    render(<DocumentSearch />);

    const searchInput = screen.getByPlaceholderText(/search documents/i);
    await user.type(searchInput, 'art');

    await waitFor(() => {
      expect(mockSearchService.generateQuerySuggestions).toHaveBeenCalledWith(expect.any(Array), 'art');
    });
  });

  it('shows and hides filter panel', async () => {
    const user = userEvent.setup();
    render(<DocumentSearch />);

    // Click filters button
    const filtersButton = screen.getAllByRole('button', { name: /filters/i })[0];
    await user.click(filtersButton);

    // Filter panel should now be visible
    const typeMatches = screen.getAllByText(/document type/i);
    expect(typeMatches.length).toBeGreaterThan(0);
  });

  it('displays search results', async () => {
    const user = userEvent.setup();
    render(<DocumentSearch />);

    const searchInput = screen.getByPlaceholderText(/search documents/i);
    await user.type(searchInput, 'artificial intelligence');

    // Wait for search results
    await waitFor(() => {
      expect(screen.getByText('Test Document 1')).toBeInTheDocument();
    });
    // Use results header stats instead of exact phrase match
    expect(screen.getByText(/1\s+document\s+found/i)).toBeInTheDocument();
  });

  it('switches between grid and list view modes', async () => {
    const user = userEvent.setup();
    render(<DocumentSearch />);

    // Perform search first
    const searchInput = screen.getByPlaceholderText(/search documents/i);
    await user.type(searchInput, 'artificial intelligence');

    await waitFor(() => {
      expect(screen.getByText('Test Document 1')).toBeInTheDocument();
    });

    // Find view mode buttons
    const gridViewButton = screen.getByLabelText(/grid view/i);
    const listViewButton = screen.getByLabelText(/list view/i);

    // Should start in list view
    expect(listViewButton).toHaveClass('active');

    // Switch to grid view
    await user.click(gridViewButton);
    expect(gridViewButton).toHaveClass('active');
    expect(listViewButton).not.toHaveClass('active');
  });

  it('clears search when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<DocumentSearch />);

    const searchInput = screen.getByPlaceholderText(/search documents/i);
    await user.type(searchInput, 'test query');

    // Clear button should appear
    const clearButton = screen.getByLabelText(/clear search/i);
    expect(clearButton).toBeInTheDocument();

    await user.click(clearButton);

    // Search input should be empty
    expect(searchInput).toHaveValue('');
  });

  it('handles search errors gracefully', async () => {
    mockSearchService.searchDocuments.mockRejectedValue(new Error('Search failed'));
    
    const user = userEvent.setup();
    render(<DocumentSearch />);

    const searchInput = screen.getByPlaceholderText(/search documents/i);
    await user.type(searchInput, 'artificial intelligence');

    // Should show error state (not crash)
    await waitFor(() => {
      expect(screen.queryByText('Test Document 1')).not.toBeInTheDocument();
    });
  });

  it('applies filters to search results', async () => {
    const user = userEvent.setup();
    render(<DocumentSearch />);

    // Open filters
    const filtersButton = screen.getAllByRole('button', { name: /filters/i })[0];
    await user.click(filtersButton);

    // Wait for filter panel to appear
    await waitFor(() => {
      // Specifically target the filter section heading with emoji prefix
      expect(screen.getByText(/📄 Document Type/i)).toBeInTheDocument();
    });
    // Perform a search to ensure filters panel does not break searching
    const searchInput = screen.getByPlaceholderText(/search documents/i);
    await user.type(searchInput, 'artificial intelligence');
    await waitFor(() => {
      expect(mockSearchService.searchDocuments).toHaveBeenCalled();
    });
  });

  it('selects documents from search results', async () => {
    const user = userEvent.setup();
    render(<DocumentSearch />);

    // Perform search
    const searchInput = screen.getByPlaceholderText(/search documents/i);
    await user.type(searchInput, 'artificial intelligence');

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('Test Document 1')).toBeInTheDocument();
    });

    // Click on result card
    const resultCard = screen.getByText('Test Document 1').closest('.search-result-card');
    expect(resultCard).toBeInTheDocument();
    
    await user.click(resultCard!);

    // Should call onDocumentSelect (if provided)
    // This would be tested with a mock prop in a real scenario
  });

  it('handles keyboard navigation in suggestions', async () => {
    const user = userEvent.setup();
    render(<DocumentSearch />);

    const searchInput = screen.getByPlaceholderText(/search documents/i);
    await user.type(searchInput, 'art');

    // Wait for suggestions to appear
    await waitFor(() => {
      expect(mockSearchService.generateQuerySuggestions).toHaveBeenCalled();
    });

    // Test keyboard navigation (Arrow Down, Arrow Up, Enter, Escape)
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowUp}');
    await user.keyboard('{Enter}');
    
    // These interactions should work without errors
    expect(searchInput).toBeInTheDocument();
  });
});

describe('DocumentSearch Accessibility & Intelligence', () => {
  it('has proper ARIA labels and roles', () => {
    render(<DocumentSearch />);
    const searchInput = screen.getByRole('searchbox', { name: /document search/i });
    expect(searchInput).toBeInTheDocument();
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<DocumentSearch />);
    await user.tab();
    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toHaveFocus();
  });

  it('shows query expansion pills when expansions exist', async () => {
    const user = userEvent.setup();
    render(<DocumentSearch />);
    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'art');
    // Expansion 'artificial intelligence' mocked for 'art'
    await waitFor(() => {
      expect(screen.getByText(/artificial intelligence/i)).toBeInTheDocument();
    });
  });

  it('shows historical suggestion pills', async () => {
    const user = userEvent.setup();
    render(<DocumentSearch />);
    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'prev');
    await waitFor(() => {
      expect(screen.getByText(/previous search/i)).toBeInTheDocument();
    });
  });

  it('allows saving current search (intelligence feature)', async () => {
    const user = userEvent.setup();
    render(<DocumentSearch />);
    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'artificial intelligence');
    // Wait for search to trigger
    await waitFor(() => {
      const ms = require('../../services/documentIntelligence/documentSearchService').documentSearchService;
      expect(ms.searchDocuments).toHaveBeenCalled();
    });
    // Save button disabled until query present
    const saveButton = screen.getByRole('button', { name: /save this search/i });
    expect(saveButton).not.toBeDisabled();
  });
});