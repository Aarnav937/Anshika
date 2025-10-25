import { memo, useMemo } from 'react';
import type { ProcessedDocument } from '../types/document';
import {
	extractTextPreview,
	formatAnalysisDate,
	getDocumentDisplayName,
	getDocumentStatusColor,
	getDocumentStatusText,
} from '../utils/documentUtils';
import { formatFileSize } from '../utils/fileValidation';

interface DocumentListProps {
	documents: ProcessedDocument[];
	onRetry: (documentId: string) => void;
	onDelete: (documentId: string) => void;
	onSelect?: (documentId: string) => void;
	selectedDocumentId?: string | null;
}

const getStatusDotClass = (status: ProcessedDocument['status']): string =>
	getDocumentStatusColor(status).replace('text-', 'bg-');

function DocumentListComponent({ documents, onRetry, onDelete, onSelect, selectedDocumentId }: DocumentListProps) {
	const { totalDocuments, statusCounts } = useMemo(() => {
		const counts: Record<ProcessedDocument['status'], number> = {
			uploading: 0,
			processing: 0,
			ready: 0,
			error: 0,
			analyzing: 0,
			queued: 0,
		};

		documents.forEach((doc) => {
			counts[doc.status] = (counts[doc.status] ?? 0) + 1;
		});

		return {
			totalDocuments: documents.length,
			statusCounts: counts,
		};
	}, [documents]);

	return (
		<section className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-lg font-semibold text-gray-900">Stored Documents</h3>
					<p className="text-xs text-gray-500">{totalDocuments} total</p>
				</div>
				<div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
					{Object.entries(statusCounts)
						.filter(([, value]) => value > 0)
						.map(([status, count]) => {
							const typedStatus = status as ProcessedDocument['status'];
							return (
								<span key={status} className={`flex items-center gap-1 ${getDocumentStatusColor(typedStatus)}`}>
									<span className={`inline-flex h-2 w-2 rounded-full ${getStatusDotClass(typedStatus)}`} />
									{status}: {count}
								</span>
							);
						})}
				</div>
			</div>

			{documents.length === 0 ? (
				<div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
					Upload a document to see processing details here.
				</div>
			) : (
				<div className="space-y-3">
					{documents.map((doc) => {
						if (!doc) {
							return null;
						}

						const uploadedLabel = doc.uploadedAt ? formatAnalysisDate(doc.uploadedAt) : 'Unknown upload time';
						const originalFileSize =
							doc.originalFile && typeof doc.originalFile.size === 'number'
								? doc.originalFile.size
								: null;
						const sizeLabel = originalFileSize != null ? formatFileSize(originalFileSize) : 'Unknown size';
						const fileName = doc.originalFile?.name ?? getDocumentDisplayName(doc);
						const metadataMissing = !doc.originalFile;


						const isSelected = selectedDocumentId === doc.id;

						return (
							<article
								key={doc.id}
								onClick={() => onSelect?.(doc.id)}
								onKeyDown={(event) => {
									if (event.key === 'Enter' || event.key === ' ') {
										event.preventDefault();
										onSelect?.(doc.id);
									}
								}}
								role={onSelect ? 'button' : undefined}
								tabIndex={onSelect ? 0 : -1}
								className={`rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 ${
									isSelected ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200'
								}`}
							>
								<header className="flex items-start justify-between gap-3">
									<div>
										<h4 className="text-md font-semibold text-gray-900">{fileName}</h4>
										<p className="text-xs text-gray-500">
											Uploaded {uploadedLabel} · {sizeLabel}
										</p>
										{metadataMissing && (
											<p className="text-xs text-amber-600 mt-1">
												File metadata missing — this item may not be stored locally.
											</p>
										)}
									</div>
									<div className={`text-xs font-semibold ${getDocumentStatusColor(doc.status)}`}>
										{getDocumentStatusText(doc.status)}
									</div>
								</header>

								{doc.previewText && (
									<p className="mt-3 text-sm text-gray-700">
										{extractTextPreview(doc, 180)}
									</p>
								)}

								{doc.extractionDetails && (
									<dl className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-600">
										<div>
											<dt className="font-medium text-gray-500">Extraction</dt>
											<dd className="text-gray-700 capitalize">{doc.extractionDetails.method}</dd>
										</div>
										<div>
											<dt className="font-medium text-gray-500">Language</dt>
											<dd className="text-gray-700">{doc.extractionDetails.language ?? 'Unknown'}</dd>
										</div>
										{typeof doc.summary?.confidence === 'number' && (
											<div>
												<dt className="font-medium text-gray-500">Confidence</dt>
												<dd className="text-gray-700">{Math.round(doc.summary.confidence * 100)}%</dd>
											</div>
										)}
										<div>
											<dt className="font-medium text-gray-500">Duration</dt>
											<dd className="text-gray-700">{Math.round((doc.extractionDetails.durationMs ?? 0) / 1000)}s</dd>
										</div>
									</dl>
								)}

								<footer className="mt-4 flex items-center gap-3 text-xs">
									<button
										onClick={() => onRetry(doc.id)}
										className="rounded-full border border-blue-200 px-3 py-1 text-blue-600 transition hover:bg-blue-50 disabled:opacity-40"
										disabled={doc.status !== 'error' || !doc.originalFile}
									>
										Retry
									</button>
									<button
										onClick={() => onDelete(doc.id)}
										className="rounded-full border border-red-200 px-3 py-1 text-red-600 transition hover:bg-red-50"
									>
										Delete
									</button>
									<span className="ml-auto text-gray-400">ID: {doc.id}</span>
								</footer>
							</article>
						);
					})}
				</div>
			)}
		</section>
	);
}

const DocumentList = memo(DocumentListComponent);
DocumentList.displayName = 'DocumentList';

export default DocumentList;
