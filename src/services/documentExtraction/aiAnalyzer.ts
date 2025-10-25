import { ExtractionDetails, ExtractionMethod } from '../../types/document';

function detectLanguage(text: string): string | undefined {
	const sample = text.slice(0, 500).toLowerCase();
	if (!sample) return undefined;

	const scripts = {
		latin: /[a-z]/,
		cyrillic: /[\u0400-\u04FF]/,
		devanagari: /[\u0900-\u097F]/,
		han: /[\u4E00-\u9FFF]/,
	} as const;

	if (scripts.han.test(sample)) return 'zh';
	if (scripts.devanagari.test(sample)) return 'hi';
	if (scripts.cyrillic.test(sample)) return 'ru';

	const accented = sample.match(/[àáâäãåçèéêëìíîïñòóôöõùúûüýÿœæ]/g);
	if (accented && accented.length > 5) {
		return 'fr';
	}

	return 'en';
}

export function buildExtractionDetails(
	text: string,
	method: ExtractionMethod,
	overrides: Partial<ExtractionDetails> = {},
): ExtractionDetails {
	const words = text ? text.split(/\s+/).filter(Boolean) : [];

	return {
		method,
		wordCount: overrides.wordCount ?? words.length,
		characterCount: overrides.characterCount ?? text.length,
		pageCount: overrides.pageCount,
		language: overrides.language ?? detectLanguage(text),
		ocrModel: overrides.ocrModel,
		warnings: overrides.warnings ?? [],
		durationMs: overrides.durationMs ?? 0,
		processedAt: overrides.processedAt ?? new Date(),
	};
}
