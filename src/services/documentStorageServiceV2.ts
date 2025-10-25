import Dexie, { Table } from 'dexie';
import {
	DocumentError,
	DocumentStatus,
	ProcessedDocument,
	DocumentStorageStats,
} from '../types/document';
import { createDocumentError } from '../utils/fileValidation';
import { createEmptyDocument } from '../utils/documentUtils';

interface StoredDocumentRecord extends ProcessedDocument {}

const DB_NAME = 'DocumentIntelligenceDB';

class DocumentStorageDB extends Dexie {
	public documents!: Table<StoredDocumentRecord, string>;

	constructor() {
		super(DB_NAME);
		this.version(1).stores({
			documents: 'id',
		});
	}
}

type ChangeListener = (documents: StoredDocumentRecord[]) => void;

class DocumentStorageService extends EventTarget {
	private db: DocumentStorageDB;
	private isInitialized = false;

	constructor() {
		super();
		this.db = new DocumentStorageDB();
	}

	private async ensureInitialized(): Promise<void> {
		if (this.isInitialized) return;
		try {
			await this.db.open();
			this.isInitialized = true;
		} catch (error) {
			if (error && typeof error === 'object' && 'name' in error && (error as any).name === 'UpgradeError') {
				console.warn('Dexie upgrade failed. Resetting local document store.', error);
				await this.safeReset();
				this.isInitialized = true;
				return;
			}
			throw error;
		}
	}

	private async safeReset(): Promise<void> {
		try {
			this.db.close();
			await Dexie.delete(DB_NAME);
		} catch (resetError) {
			console.error('Failed to delete Dexie database during reset', resetError);
		}
		this.db = new DocumentStorageDB();
		await this.db.open();
	}

	private emitChange(): void {
		this.dispatchEvent(new Event('change'));
	}

	async addDocument(document: ProcessedDocument): Promise<void> {
		await this.ensureInitialized();
		await this.db.documents.put(document as StoredDocumentRecord);
		this.emitChange();
	}

	async upsertFromFile(fileId: string, file: File): Promise<ProcessedDocument> {
		await this.ensureInitialized();

		const existing = await this.db.documents.get(fileId);
		const baseDocument = createEmptyDocument(file, {
			id: fileId,
			status: (existing?.status as DocumentStatus) ?? 'queued',
			uploadedAt: existing?.uploadedAt ?? new Date(),
			retryCount: existing?.retryCount ?? 0,
			tags: existing?.tags ?? [],
			notes: existing?.notes,
			isFavorite: existing?.isFavorite ?? false,
		});

		const merged: StoredDocumentRecord = {
			...existing,
			...baseDocument,
		} as StoredDocumentRecord;

		await this.db.documents.put(merged);
		this.emitChange();
		return merged;
	}

	async updateDocument(id: string, updates: Partial<ProcessedDocument>): Promise<void> {
		await this.ensureInitialized();
		await this.db.documents.update(id, updates as Partial<StoredDocumentRecord>);
		this.emitChange();
	}

	async deleteDocument(id: string): Promise<void> {
		await this.ensureInitialized();
		await this.db.documents.delete(id);
		this.emitChange();
	}

	async getDocument(id: string): Promise<ProcessedDocument | null> {
		await this.ensureInitialized();
		const record = await this.db.documents.get(id);
		return record ?? null;
	}

	async getAllDocuments(): Promise<ProcessedDocument[]> {
		await this.ensureInitialized();
		const documents = await this.db.documents.toArray();
		return documents
			.map((doc) => ({
				...doc,
				uploadedAt:
					doc.uploadedAt instanceof Date
						? doc.uploadedAt
						: new Date(doc.uploadedAt ?? Date.now()),
				processedAt:
					doc.processedAt instanceof Date || !doc.processedAt
						? doc.processedAt
						: new Date(doc.processedAt),
				analysis: doc.analysis
					? {
						...doc.analysis,
						analysisDate:
							doc.analysis.analysisDate instanceof Date
								? doc.analysis.analysisDate
								: new Date(doc.analysis.analysisDate ?? Date.now()),
					}
					: doc.analysis,
			}))
			.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
	}

	async clearAllDocuments(): Promise<void> {
		await this.ensureInitialized();
		await this.db.documents.clear();
		this.emitChange();
	}

	async getStorageStats(): Promise<DocumentStorageStats> {
		await this.ensureInitialized();
		const documents = await this.db.documents.toArray();
		const totalDocuments = documents.length;
		const totalSize = documents.reduce((sum, doc) => sum + doc.originalFile.size, 0);

			const sorted = [...documents].sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime());

			return {
			totalDocuments,
			totalSize,
			storageQuotaTotal: Infinity,
			storageQuotaUsed: totalSize,
				oldestDocument: sorted[0]?.uploadedAt,
				newestDocument: sorted[sorted.length - 1]?.uploadedAt,
		};
	}

	async searchDocuments(query: string): Promise<ProcessedDocument[]> {
		await this.ensureInitialized();
		const normalized = query.trim().toLowerCase();
		if (!normalized) {
			return this.getAllDocuments();
		}

		const documents = await this.db.documents.toArray();
		return documents.filter((document) => {
			const haystack = [
				document.originalFile.name,
				document.previewText,
				document.summary?.title,
				document.summary?.mainPoints?.join(' '),
				document.summary?.keyTopics?.join(' '),
				document.extractedText,
				document.notes,
				document.tags?.join(' '),
			]
				.filter(Boolean)
				.join(' ')
				.toLowerCase();

			return haystack.includes(normalized);
		});
	}

	subscribe(listener: ChangeListener): () => void {
		const handler = async () => {
			const docs = await this.getAllDocuments();
			listener(docs);
		};

		this.addEventListener('change', handler);
		handler();

		return () => {
			this.removeEventListener('change', handler);
		};
	}

	createStorageError(message: string, details?: unknown): DocumentError {
		return createDocumentError('STORAGE_ERROR', message, details);
	}

	createProcessingError(message: string, details?: unknown): DocumentError {
		return createDocumentError('PROCESSING_FAILED', message, details);
	}

	createOcrError(message: string, details?: unknown): DocumentError {
		return createDocumentError('OCR_FAILED', message, details);
	}
}

export const documentStorageServiceV2 = new DocumentStorageService();
