import { DOCUMENT_CONSTANTS } from '../../types/document';

export interface PreparedText {
	cleanedText: string;
	preview: string;
	chunks: string[];
	wordCount: number;
	characterCount: number;
}

export function normalizeWhitespace(text: string): string {
	return text
		.replace(/\r\n|\r/g, '\n')
		.replace(/\t/g, ' ')
		.replace(/[\u00A0\f]+/g, ' ')
		.replace(/ {2,}/g, ' ')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

export function createPreview(text: string, limit: number = DOCUMENT_CONSTANTS.PREVIEW_CHAR_LIMIT): string {
	if (!text) return 'Preview unavailable';
	const normalized = normalizeWhitespace(text);
	if (normalized.length <= limit) {
		return normalized;
	}

	const truncated = normalized.slice(0, limit);
	const lastSpace = truncated.lastIndexOf(' ');
	return `${truncated.slice(0, Math.max(0, lastSpace))}…`;
}

export function chunkText(
	text: string,
	targetLength: number = DOCUMENT_CONSTANTS.TEXT_CHUNK_CHAR_TARGET,
): string[] {
	const cleaned = normalizeWhitespace(text);
	if (!cleaned) return [];

	if (cleaned.length <= targetLength) {
		return [cleaned];
	}

	const sentences = cleaned.split(/(?<=[.!?])\s+/);
	const chunks: string[] = [];
	let current = '';

	sentences.forEach((sentence) => {
		if (!sentence) return;
		if ((current + ' ' + sentence).trim().length > targetLength && current) {
			chunks.push(current.trim());
			current = sentence;
		} else {
			current = current ? `${current} ${sentence}` : sentence;
		}
	});

	if (current) {
		chunks.push(current.trim());
	}

	return chunks;
}

export function prepareTextPayload(text: string): PreparedText {
	const cleanedText = normalizeWhitespace(text);
	const preview = createPreview(cleanedText);
	const chunks = chunkText(cleanedText);
	const words = cleanedText ? cleanedText.split(/\s+/).filter(Boolean) : [];

	return {
		cleanedText,
		preview,
		chunks,
		wordCount: words.length,
		characterCount: cleanedText.length,
	};
}
