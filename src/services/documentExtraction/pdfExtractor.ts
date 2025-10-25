import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { TextContent, TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';

GlobalWorkerOptions.workerSrc = pdfWorker;

export interface PDFExtractionResult {
	text: string;
	pageCount: number;
	warnings: string[];
}

export async function extractPdfText(
	blob: Blob,
	options: { signal?: AbortSignal } = {},
): Promise<PDFExtractionResult> {
	const { signal } = options;
	const warnings: string[] = [];

	const arrayBuffer = await blob.arrayBuffer();
	const task = getDocument({ data: arrayBuffer });

	if (signal) {
		signal.addEventListener('abort', () => task.destroy(), { once: true });
	}

	const pdf = await task.promise;
	let combinedText = '';

	for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
		if (signal?.aborted) {
			throw new DOMException('PDF extraction aborted', 'AbortError');
		}

		const page = await pdf.getPage(pageNumber);
		const content: TextContent = await page.getTextContent();
			const items = content.items as Array<TextItem | TextMarkedContent>;
			const pageText = items
				.map((item) => ('str' in item ? item.str : ''))
			.join(' ')
			.replace(/\s+/g, ' ')
			.trim();

		if (!pageText) {
			warnings.push(`Page ${pageNumber} appears to be empty or image-based.`);
		}

		combinedText += `${pageText}\n`;
	}

	return {
		text: combinedText,
		pageCount: pdf.numPages,
		warnings,
	};
}
