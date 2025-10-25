import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DocumentError,
  ProcessedDocument,
  UseDocumentStorageReturn,
} from '../types/document';
import { documentStorageServiceV2 } from '../services/documentStorageServiceV2';
import { searchDocuments as searchDocumentsUtil } from '../utils/documentUtils';

export function useDocumentStorage(): UseDocumentStorageReturn {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<DocumentError | null>(null);

  useEffect(() => {
    const unsubscribe = documentStorageServiceV2.subscribe((docs) => {
      setDocuments(docs);
      setLoading(false);
      setError(null);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const addDocument = useCallback(async (document: ProcessedDocument) => {
    try {
      await documentStorageServiceV2.addDocument(document);
    } catch (err) {
      const storageError = documentStorageServiceV2.createStorageError(
        'Failed to add document',
        err,
      );
      setError(storageError);
      throw storageError;
    }
  }, []);

  const upsertFromFile = useCallback(async (fileId: string, file: File) => {
    try {
      return await documentStorageServiceV2.upsertFromFile(fileId, file);
    } catch (err) {
      const storageError = documentStorageServiceV2.createStorageError(
        'Failed to store file locally',
        err,
      );
      setError(storageError);
      throw storageError;
    }
  }, []);

  const updateDocument = useCallback(async (id: string, updates: Partial<ProcessedDocument>) => {
    try {
      await documentStorageServiceV2.updateDocument(id, updates);
    } catch (err) {
      const storageError = documentStorageServiceV2.createStorageError(
        'Failed to update document',
        err,
      );
      setError(storageError);
      throw storageError;
    }
  }, []);

  const deleteDocument = useCallback(async (id: string) => {
    try {
      await documentStorageServiceV2.deleteDocument(id);
    } catch (err) {
      const storageError = documentStorageServiceV2.createStorageError(
        'Failed to delete document',
        err,
      );
      setError(storageError);
      throw storageError;
    }
  }, []);

  const getDocument = useCallback(async (id: string) => {
    try {
      return await documentStorageServiceV2.getDocument(id);
    } catch (err) {
      const storageError = documentStorageServiceV2.createStorageError(
        'Failed to load document',
        err,
      );
      setError(storageError);
      throw storageError;
    }
  }, []);

  const searchDocuments = useCallback(
    (query: string) => searchDocumentsUtil(documents, query),
    [documents],
  );

  const clearAllDocuments = useCallback(async () => {
    try {
      await documentStorageServiceV2.clearAllDocuments();
    } catch (err) {
      const storageError = documentStorageServiceV2.createStorageError(
        'Failed to clear documents',
        err,
      );
      setError(storageError);
      throw storageError;
    }
  }, []);

  const getStorageStats = useCallback(async () => {
    try {
      return await documentStorageServiceV2.getStorageStats();
    } catch (err) {
      const storageError = documentStorageServiceV2.createStorageError(
        'Failed to load storage stats',
        err,
      );
      setError(storageError);
      throw storageError;
    }
  }, []);

  return useMemo(
    () => ({
      documents,
      loading,
      error,
      addDocument,
      upsertFromFile,
      updateDocument,
      deleteDocument,
      getDocument,
      searchDocuments,
      clearAllDocuments,
      getStorageStats,
    }),
    [
      addDocument,
      clearAllDocuments,
      deleteDocument,
      documents,
      error,
      getDocument,
      getStorageStats,
      loading,
      searchDocuments,
      upsertFromFile,
      updateDocument,
    ],
  );
}
