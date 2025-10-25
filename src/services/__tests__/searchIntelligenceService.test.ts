import { searchIntelligenceService } from '../../services/documentIntelligence/searchIntelligenceService';

describe('searchIntelligenceService basic', () => {
	beforeEach(() => {
		searchIntelligenceService.clearAll();
	});

	it('records a search event and returns insights', () => {
		searchIntelligenceService.recordSearch({
			query: 'test query',
			resultCount: 2,
			searchTime: 50,
			searchType: 'hybrid',
			filtersUsed: false
		});
		const insights = searchIntelligenceService.getInsights();
		expect(insights.totalSearches).toBe(1);
		expect(insights.uniqueQueries).toBe(1);
	});
});
