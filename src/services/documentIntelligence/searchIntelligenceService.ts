/**
 * Search Intelligence Service
 *
 * Provides lightweight client-side analytics, saved searches, query expansion
 * and historical suggestion capabilities. Designed to be storage-agnostic and
 * fall back gracefully if localStorage is unavailable. This is an in-browser
 * heuristic system (no external calls) that can later be replaced by a
 * backend implementation without changing the public API surface.
 */

import {
	SavedSearch,
	SearchFilters,
	SearchOptions,
	SearchAnalytics,
	SearchInsights,
	QueryAnalytics
} from '../../types/document';

interface SearchIntelligenceState {
	savedSearches: SavedSearch[];
	analytics: SearchAnalytics[]; // individual search events
	version: number;
	lastUpdated: number;
}

const STORAGE_KEY = 'document_search_intelligence_state_v1';
const STATE_VERSION = 1;

let memoryState: SearchIntelligenceState | null = null;

function safeNow(): number { return Date.now(); }

function loadState(): SearchIntelligenceState {
	if (memoryState) return memoryState;
	try {
		const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
		if (raw) {
			const parsed: SearchIntelligenceState = JSON.parse(raw);
			// Basic version migration placeholder
			if (parsed.version !== STATE_VERSION) {
				parsed.version = STATE_VERSION;
			}
			memoryState = parsed;
			return parsed;
		}
	} catch {
		// ignore and fall through to default
	}
	memoryState = {
		savedSearches: [],
		analytics: [],
		version: STATE_VERSION,
		lastUpdated: safeNow()
	};
	return memoryState;
}

function persistState(): void {
	if (!memoryState) return;
	memoryState.lastUpdated = safeNow();
	try {
		if (typeof window !== 'undefined') {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryState));
		}
	} catch {
		// Storage may be unavailable (private mode, quota exceeded) — fail silently
	}
}

// --- Utility Helpers ---

function generateId(): string {
	return 'ss_' + Math.random().toString(36).slice(2, 10);
}

function normalizeQuery(q: string): string {
	return q.trim().toLowerCase();
}

// Simple synonym map for primitive query expansion (placeholder for AI-powered)
const SYNONYMS: Record<string, string[]> = {
	ai: ['artificial intelligence'],
	'machine learning': ['ml'],
	'ml': ['machine learning'],
	doc: ['document', 'file'],
	report: ['summary', 'analysis'],
	picture: ['image', 'photo'],
	photo: ['image', 'picture'],
	invoice: ['bill', 'statement']
};

function expandQueryTerms(query: string): string[] {
	const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
	const expansions = new Set<string>();
	for (const term of terms) {
		expansions.add(term);
		const syns = SYNONYMS[term];
		if (syns) syns.forEach(s => expansions.add(s));
	}
	return [...expansions];
}

// --- Public API ---

function recordSearch(params: {
	query: string;
	resultCount: number;
	searchTime: number; // ms
	searchType: SearchOptions['searchType'];
	filtersUsed: boolean;
	userId?: string;
}): void {
	const state = loadState();
	state.analytics.push({
		query: params.query,
		timestamp: new Date(),
		resultCount: params.resultCount,
		searchTime: params.searchTime,
		searchType: params.searchType,
		filtersUsed: params.filtersUsed,
		userId: params.userId
	});
	// Keep only last 1000 events to bound memory
	if (state.analytics.length > 1000) {
		state.analytics.splice(0, state.analytics.length - 1000);
	}
	persistState();
}

function saveSearch(name: string, query: string, filters: SearchFilters, options: SearchOptions): SavedSearch {
	const state = loadState();
	const id = generateId();
	const saved: SavedSearch = {
		id,
		name: name.trim() || 'Untitled',
		query,
		filters: { ...filters },
		options: { ...options },
		createdAt: new Date(),
		lastUsed: new Date(),
		useCount: 0,
		resultCount: 0
	};
	state.savedSearches.push(saved);
	persistState();
	return saved;
}

function getSavedSearches(): SavedSearch[] {
	return [...loadState().savedSearches].sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());
}

function getSavedSearch(id: string): SavedSearch | undefined {
	return loadState().savedSearches.find(s => s.id === id);
}

function touchSavedSearch(id: string, resultCount?: number): void {
	const state = loadState();
	const entry = state.savedSearches.find(s => s.id === id);
	if (entry) {
		entry.lastUsed = new Date();
		entry.useCount += 1;
		if (typeof resultCount === 'number') entry.resultCount = resultCount;
		persistState();
	}
}

function deleteSavedSearch(id: string): void {
	const state = loadState();
	const idx = state.savedSearches.findIndex(s => s.id === id);
	if (idx >= 0) {
		state.savedSearches.splice(idx, 1);
		persistState();
	}
}

function getQueryAnalytics(): QueryAnalytics[] {
	const state = loadState();
	const map = new Map<string, QueryAnalytics>();
	for (const event of state.analytics) {
		const key = normalizeQuery(event.query);
		let qa = map.get(key);
		if (!qa) {
			qa = {
				query: key,
				searchCount: 0,
				avgResultCount: 0,
				avgSearchTime: 0,
				successRate: 0,
				lastSearched: event.timestamp
			};
			map.set(key, qa);
		}
		qa.lastSearched = event.timestamp > qa.lastSearched ? event.timestamp : qa.lastSearched;
		qa.searchCount += 1;
		qa.avgResultCount += event.resultCount;
		qa.avgSearchTime += event.searchTime;
		if (event.resultCount > 0) qa.successRate += 1;
	}
	for (const qa of map.values()) {
		if (qa.searchCount > 0) {
			qa.avgResultCount = qa.avgResultCount / qa.searchCount;
			qa.avgSearchTime = qa.avgSearchTime / qa.searchCount;
			qa.successRate = (qa.successRate / qa.searchCount) * 100;
		}
	}
	return [...map.values()].sort((a, b) => b.searchCount - a.searchCount);
}

function getInsights(): SearchInsights {
	const state = loadState();
	const totalSearches = state.analytics.length;
	const queryAnalytics = getQueryAnalytics();
	const uniqueQueries = queryAnalytics.length;
	const avgResultCount = totalSearches === 0 ? 0 : state.analytics.reduce((a, e) => a + e.resultCount, 0) / totalSearches;
	const avgSearchTime = totalSearches === 0 ? 0 : state.analytics.reduce((a, e) => a + e.searchTime, 0) / totalSearches;
	const successRate = totalSearches === 0 ? 0 : (state.analytics.filter(e => e.resultCount > 0).length / totalSearches) * 100;
	// Peak hours (group by hour of day)
	const hourBuckets: Record<number, number> = {};
	for (const e of state.analytics) {
		const h = new Date(e.timestamp).getHours();
		hourBuckets[h] = (hourBuckets[h] || 0) + 1;
	}
	const peakSearchTimes = Object.entries(hourBuckets).map(([hour, count]) => ({ hour: Number(hour), searchCount: count }))
		.sort((a, b) => b.searchCount - a.searchCount).slice(0, 5);
	// --- Extended Intelligence (Phase B) ---
	// Trending queries: compare last N (e.g., 20) searches vs previous 20
	const WINDOW = 20;
	let trendingQueries: SearchInsights['trendingQueries'] = undefined;
	if (state.analytics.length >= WINDOW * 2) {
		const recent = state.analytics.slice(-WINDOW).map(a => normalizeQuery(a.query));
		const prior = state.analytics.slice(-(WINDOW * 2), -WINDOW).map(a => normalizeQuery(a.query));
		const recentCounts = recent.reduce<Record<string, number>>((acc, q) => { acc[q] = (acc[q] || 0) + 1; return acc; }, {});
		const priorCounts = prior.reduce<Record<string, number>>((acc, q) => { acc[q] = (acc[q] || 0) + 1; return acc; }, {});
		const deltas = Object.entries(recentCounts)
			.map(([q, c]) => ({ query: q, delta: c - (priorCounts[q] || 0), currentCount: c }))
			.filter(d => d.delta > 0)
			.sort((a, b) => b.delta - a.delta)
			.slice(0, 5);
		if (deltas.length > 0) trendingQueries = deltas;
	}

	// Low result alerts: queries with consistently low average results (<1) over at least 3 searches
	let lowResultAlerts: SearchInsights['lowResultAlerts'] = undefined;
	const lowQueries = queryAnalytics
		.filter(q => q.searchCount >= 3 && q.avgResultCount < 1)
		.slice(0, 5)
		.map(q => ({ query: q.query, averageResults: Number(q.avgResultCount.toFixed(2)), searches: q.searchCount }));
	if (lowQueries.length > 0) lowResultAlerts = lowQueries;

	// Filter effectiveness: approximate by counting searches with filtersUsed and grouping by a pseudo filter category
	// NOTE: Currently we only store filtersUsed boolean. Future enhancement could log specific filter types.
	let filterEffectiveness: SearchInsights['filterEffectiveness'] = undefined;
	if (state.analytics.some(a => a.filtersUsed)) {
		// Without granular data, provide a placeholder aggregated metric
		const withFilters = state.analytics.filter(a => a.filtersUsed);
		filterEffectiveness = [{
			filterType: 'any',
			usageCount: withFilters.length,
			avgResults: Number((withFilters.reduce((a, e) => a + e.resultCount, 0) / withFilters.length).toFixed(2))
		}];
	}

	return {
		totalSearches,
		uniqueQueries,
		avgResultCount,
		avgSearchTime,
		popularQueries: queryAnalytics.slice(0, 10),
		searchSuccessRate: successRate,
		mostSearchedDocumentTypes: [], // Placeholder – requires per-search doc type tracking
		peakSearchTimes,
		trendingQueries,
		lowResultAlerts,
		filterEffectiveness
	};
}

function getHistoricalSuggestions(partial: string, limit = 5): string[] {
	const part = normalizeQuery(partial);
	if (!part) return [];
	const qa = getQueryAnalytics();
	return qa.filter(q => q.query.startsWith(part))
		.slice(0, limit)
		.map(q => q.query);
}

function expandQuery(query: string): { original: string; expansions: string[] } {
	const expansions = expandQueryTerms(query).filter(e => e !== query.toLowerCase());
	return { original: query, expansions };
}

function clearAll(): void {
	memoryState = {
		savedSearches: [],
		analytics: [],
		version: STATE_VERSION,
		lastUpdated: safeNow()
	};
	try {
		if (typeof window !== 'undefined') {
			window.localStorage.removeItem(STORAGE_KEY);
		}
	} catch {/* ignore */}
}

export const searchIntelligenceService = {
	// Analytics
	recordSearch,
	getInsights,
	getQueryAnalytics,
	// Saved searches
	saveSearch,
	getSavedSearches,
	getSavedSearch,
	touchSavedSearch,
	deleteSavedSearch,
	// Suggestions & expansion
	getHistoricalSuggestions,
	expandQuery,
	// Maintenance
	clearAll
};

export type SearchIntelligenceService = typeof searchIntelligenceService;

