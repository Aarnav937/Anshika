import { documentStorageServiceV2 } from '../documentStorageServiceV2';
import { extractPdfText } from '../documentExtraction/pdfExtractor';
import { extractDocxText } from '../documentExtraction/docxExtractor';
import { extractPlainText } from '../documentExtraction/plainTextExtractor';
import { extractTextWithGeminiOcr } from '../documentExtraction/ocrExtractor';
import { prepareTextPayload } from '../documentExtraction/textProcessor';
import { buildExtractionDetails } from '../documentExtraction/aiAnalyzer';
import { analyzeDocument, createAnalysisError } from './documentAnalyzer';
import { uploadFileToGemini } from '../geminiService';
import {
	DocumentEvent,
	ExtractionMethod,
	DocumentError,
	DOCUMENT_CONSTANTS,
} from '../../types/document';
import { createDocumentError } from '../../utils/fileValidation';
import { getFileExtension } from '../../utils/documentUtils';

type QueueItem = {
	fileId: string;
	file: File;
};

type DocumentProcessorListener = (event: DocumentEvent) => void;

class DocumentProcessor extends EventTarget {
	private queue: QueueItem[] = [];
	private isProcessing = false;

	enqueue(fileId: string, file: File): void {
		this.queue.push({ fileId, file });
		this.processQueue();
	}

	subscribe(listener: DocumentProcessorListener): () => void {
		const handler = (event: Event) => {
			const custom = event as CustomEvent<DocumentEvent>;
			listener(custom.detail);
		};

		this.addEventListener('document-event', handler as EventListener);
		return () => this.removeEventListener('document-event', handler as EventListener);
	}

	private emit(event: DocumentEvent): void {
		const wrapped = new CustomEvent<DocumentEvent>('document-event', { detail: event });
		this.dispatchEvent(wrapped);
	}

	private async processQueue(): Promise<void> {
		if (this.isProcessing) return;
		this.isProcessing = true;

		while (this.queue.length > 0) {
			const item = this.queue.shift();
			if (!item) continue;

			await this.processSingle(item).catch((error) => {
				console.error('Document processing failed:', error);
			});
		}

		this.isProcessing = false;
	}

	private async processSingle({ fileId, file }: QueueItem): Promise<void> {
		const start = performance.now();
		this.emit({ type: 'processing_started', payload: { documentId: fileId } });
		await documentStorageServiceV2.updateDocument(fileId, { status: 'processing' });

		try {
			const extension = getFileExtension(file.name).toLowerCase();
			let method: ExtractionMethod = 'unknown';
			let extractedText = '';
			let pageCount: number | undefined;
			let warnings: string[] = [];
			let ocrModel: string | undefined;
			let geminiFileRef: any | undefined;

		// For images: Skip file upload entirely, use inline OCR (most reliable)
		// For other files: Upload for Q&A capabilities
		if (!DOCUMENT_CONSTANTS.OCR_ONLY_TYPES.includes(extension as any)) {
			try {
				console.log(`📤 Uploading ${file.name} to Gemini for document intelligence...`);
				const uploadResult = await uploadFileToGemini(file, file.name);
				
				// Validate upload result
				if (!uploadResult || !uploadResult.file) {
					throw new Error('Upload succeeded but returned invalid response structure');
				}
				
				geminiFileRef = uploadResult.file;
				console.log(`✅ File uploaded to Gemini: ${geminiFileRef.name || geminiFileRef.displayName || 'Unknown file'}`);
				
				// Store Gemini file reference
				if (geminiFileRef) {
					await documentStorageServiceV2.updateDocument(fileId, {
						geminiFileRef: geminiFileRef as any,
					});
				}
				
			} catch (geminiError) {
				const errorMsg = geminiError instanceof Error ? geminiError.message : String(geminiError);
				console.warn('⚠️ Gemini upload failed, continuing with local processing:', errorMsg);
				warnings.push(`Gemini upload failed: ${errorMsg} - Q&A features may be limited`);
			}
		} else {
			console.log('📷 Image file detected - will use inline OCR (no upload needed)');
		}			if (extension === 'pdf') {
				const result = await extractPdfText(file, {});
				extractedText = result.text;
				pageCount = result.pageCount;
				warnings = result.warnings;
				method = 'pdf';
			} else if (extension === 'docx') {
				const result = await extractDocxText(file);
				extractedText = result.text;
				warnings = result.warnings;
				method = 'docx';
			} else if (extension === 'txt') {
				const result = await extractPlainText(file);
				extractedText = result.text;
				method = 'txt';
			} else if (
				DOCUMENT_CONSTANTS.OCR_ONLY_TYPES.includes(
					extension as (typeof DOCUMENT_CONSTANTS.OCR_ONLY_TYPES)[number],
				)
			) {
				// Use inline OCR directly (most reliable, no file expiration issues)
				console.log('🔍 Performing inline OCR extraction...');
				const result = await extractTextWithGeminiOcr(file);
				extractedText = result.text;
				warnings = result.warnings;
				ocrModel = result.model;
				method = 'image-ocr';
			} else {
				throw createDocumentError(
					'UNSUPPORTED_TYPE',
					`Unsupported file type: .${extension}. Upload PDF, DOCX, TXT, or images.`,
				);
			}

			const prepared = prepareTextPayload(extractedText);
			const details = buildExtractionDetails(prepared.cleanedText, method, {
				pageCount,
				warnings,
				ocrModel,
				durationMs: performance.now() - start,
			});

			await documentStorageServiceV2.updateDocument(fileId, {
				status: 'analyzing',
				processedAt: new Date(),
				previewText: prepared.preview,
				extractedText: prepared.cleanedText,
				contentChunks: prepared.chunks,
				extractionDetails: details,
			});

			this.emit({ type: 'analysis_started', payload: { documentId: fileId } });

			try {
				const analysis = await analyzeDocument({
					documentId: fileId,
					documentName: file.name,
					text: prepared.cleanedText,
					preview: prepared.preview,
					chunks: prepared.chunks,
					wordCount: prepared.wordCount,
					pageCount,
					extractionMethod: method,
					language: details.language,
				});

				await documentStorageServiceV2.updateDocument(fileId, {
					status: 'ready',
					summary: analysis.summary,
					analysis,
					processedAt: new Date(),
				});

				const readyDoc = await documentStorageServiceV2.getDocument(fileId);
				if (readyDoc) {
					this.emit({ type: 'analysis_complete', payload: { documentId: fileId, analysis } });
					this.emit({ type: 'processing_complete', payload: { documentId: fileId, document: readyDoc } });
				}
			} catch (analysisError) {
				const docError =
					analysisError &&
					typeof analysisError === 'object' &&
					'timestamp' in analysisError
						? (analysisError as DocumentError)
						: createAnalysisError(
							analysisError instanceof Error ? analysisError.message : 'Document analysis failed',
							analysisError,
						);

				await documentStorageServiceV2.updateDocument(fileId, {
					status: 'error',
					error: docError,
				});

				this.emit({ type: 'analysis_error', payload: { documentId: fileId, error: docError } });
				return;
			}
		} catch (error) {
			let docError: DocumentError;
			if (
				error &&
				typeof error === 'object' &&
				'timestamp' in error &&
				'isRecoverable' in error &&
				'message' in error
			) {
				docError = error as DocumentError;
			} else if (error instanceof DOMException && error.name === 'AbortError') {
				docError = documentStorageServiceV2.createProcessingError('Processing aborted', error);
			} else {
				docError = documentStorageServiceV2.createProcessingError(
					error instanceof Error ? error.message : 'Unknown processing error',
					error,
				);
			}

			await documentStorageServiceV2.updateDocument(fileId, {
				status: 'error',
				error: docError,
			});

			this.emit({ type: 'processing_error', payload: { documentId: fileId, error: docError } });
		}
	}
}

export const documentProcessor = new DocumentProcessor();
