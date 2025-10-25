import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { searchIntelligenceService } from '../../services/documentIntelligence/searchIntelligenceService';
import DocumentSearch from '../DocumentSearch';

// Helper to seed analytics for trending / low results
function seedSearches(seqs: Array<{ query: string; resultCount: number }>) {
  seqs.forEach(s => {
    searchIntelligenceService.recordSearch({
      query: s.query,
      resultCount: s.resultCount,
      searchTime: 10,
      searchType: 'hybrid',
      filtersUsed: false
    });
  });
}

describe('Enhanced Search Insights (Phase B)', () => {
  beforeEach(() => {
    searchIntelligenceService.clearAll();
  });

  it('displays low result alerts when queries underperform', () => {
    seedSearches([
      { query: 'rare topic', resultCount: 0 },
      { query: 'rare topic', resultCount: 0 },
      { query: 'rare topic', resultCount: 1 },
      { query: 'common', resultCount: 5 }
    ]);
    render(<DocumentSearch documents={[]} />);
    const low = screen.queryByText(/Low Results:/i);
    expect(low).toBeInTheDocument();
  });

  it('displays trending queries when growth window criteria met', () => {
    // Need 40 events (20 prior + 20 recent) with rising frequency for target query
    const prior: Array<{ query: string; resultCount: number }> = [];
    const recent: Array<{ query: string; resultCount: number }> = [];
    for (let i = 0; i < 20; i++) {
      prior.push({ query: i % 5 === 0 ? 'steady' : 'alpha', resultCount: 3 });
    }
    for (let i = 0; i < 20; i++) {
      recent.push({ query: i % 2 === 0 ? 'trending' : 'alpha', resultCount: 4 });
    }
    seedSearches([...prior, ...recent]);
    render(<DocumentSearch documents={[]} />);
    const trend = screen.queryByText(/Trending/);
    expect(trend).toBeInTheDocument();
  });
});
