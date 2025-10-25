import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DocumentError,
  DocumentEvent,
  ProcessedDocument,
  UploadProgress,
} from '../types/document';
import { useDocumentUpload } from './useDocumentUpload';
import { useDocumentStorage } from './useDocumentStorage';
import { documentProcessor } from '../services/documentIntelligence/documentProcessor';

export interface UseDocumentProcessingReturn {
  documents: ProcessedDocument[];
  uploadProgress: Map<string, UploadProgress>;
  isUploading: boolean;
  storageLoading: boolean;
  storageError: DocumentError | null;
  ingestFiles: (files: File[]) => Promise<void>;
  cancelUpload: (fileId: string) => void;
  clearCompletedUploads: () => void;
  deleteDocument: (id: string) => Promise<void>;
  retryDocument: (id: string) => Promise<void>;
  lastEvent?: DocumentEvent;
  eventHistory: DocumentEvent[];
}

const EVENT_HISTORY_LIMIT = 25;

export function useDocumentProcessing(): UseDocumentProcessingReturn {
  const fileMapRef = useRef(new Map<string, File>());
  const processedRef = useRef(new Set<string>());
  const [lastEvent, setLastEvent] = useState<DocumentEvent | undefined>(undefined);
  const [eventHistory, setEventHistory] = useState<DocumentEvent[]>([]);

  const {
    uploadFiles,
    uploadProgress,
    isUploading,
    cancelUpload,
    clearCompleted,
  } = useDocumentUpload();

  const {
    documents,
    loading: storageLoading,
    error: storageError,
    upsertFromFile,
    updateDocument,
    deleteDocument,
    getDocument,
  } = useDocumentStorage();

  useEffect(() => {
    const unsubscribe = documentProcessor.subscribe((event) => {
      setLastEvent(event);
      setEventHistory((prev) => {
        const next = [...prev, event];
        if (next.length > EVENT_HISTORY_LIMIT) {
          next.splice(0, next.length - EVENT_HISTORY_LIMIT);
        }
        return next;
      });

      if (event.type === 'processing_complete' || event.type === 'processing_error') {
        processedRef.current.delete(event.payload.documentId);
        fileMapRef.current.delete(event.payload.documentId);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const ingestFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;

      await uploadFiles(files, {
        onFileQueued: async (fileId, file) => {
          fileMapRef.current.set(fileId, file);
          const record = await upsertFromFile(fileId, file);
          await updateDocument(record.id, { status: 'uploading' });
        },
        onFileCompleted: (fileId) => {
          const file = fileMapRef.current.get(fileId);
          if (file && !processedRef.current.has(fileId)) {
            processedRef.current.add(fileId);
            documentProcessor.enqueue(fileId, file);
          }
        },
      });
    },
    [updateDocument, uploadFiles, upsertFromFile],
  );

  useEffect(() => {
    uploadProgress.forEach((progress, fileId) => {
      if (progress.status === 'ready') {
        const file = fileMapRef.current.get(fileId);
        if (file && !processedRef.current.has(fileId)) {
          processedRef.current.add(fileId);
          documentProcessor.enqueue(fileId, file);
        }
      }

      if (progress.status === 'error') {
        processedRef.current.delete(fileId);
      }
    });
  }, [uploadProgress]);

  const clearCompletedUploads = useCallback(() => {
    clearCompleted();
  }, [clearCompleted]);

  const retryDocument = useCallback(async (id: string) => {
    const record = await getDocument(id);
    if (!record) {
      throw new Error('Document not found');
    }

    if (!record.originalBlob) {
      throw new Error('Original file blob is unavailable for retry');
    }

    const retryFile = new File([record.originalBlob], record.originalFile.name, {
      type: record.originalFile.mimeType,
      lastModified: record.originalFile.lastModified,
    });

    fileMapRef.current.set(id, retryFile);
    processedRef.current.add(id);
  await updateDocument(id, { status: 'processing', error: undefined });
    documentProcessor.enqueue(id, retryFile);
  }, [getDocument, updateDocument]);

  return useMemo(
    () => ({
      documents,
      uploadProgress,
      isUploading,
      storageLoading,
      storageError,
      ingestFiles,
      cancelUpload,
      clearCompletedUploads,
      deleteDocument,
      retryDocument,
      lastEvent,
      eventHistory,
    }),
    [
      cancelUpload,
      clearCompletedUploads,
      deleteDocument,
      documents,
      eventHistory,
      ingestFiles,
      isUploading,
      lastEvent,
      retryDocument,
      storageError,
      storageLoading,
      uploadProgress,
    ],
  );
}
