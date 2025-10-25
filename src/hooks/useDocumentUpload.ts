import { useState, useCallback, useRef } from 'react';
import { UploadProgress, UseDocumentUploadReturn, UploadCallbacks } from '../types/document';
import { generateDocumentId } from '../utils/documentUtils';
import {
  uploadFileInChunks,
  DEFAULT_CHUNK_SIZE,
} from '../services/documentUploadService';

export function useDocumentUpload(): UseDocumentUploadReturn {
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map());
  const [isUploading, setIsUploading] = useState(false);
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const startTimesRef = useRef<Map<string, number>>(new Map());

  const updateProgressEntry = useCallback((fileId: string, updates: Partial<UploadProgress>) => {
    setUploadProgress(prev => {
      const existing = prev.get(fileId);
      if (!existing) {
        return prev;
      }

      const updated = new Map(prev);
      updated.set(fileId, {
        ...existing,
        ...updates,
      });
      return updated;
    });
  }, []);

  const uploadFiles = useCallback(async (files: File[], callbacks: UploadCallbacks = {}): Promise<void> => {
    if (files.length === 0) return;

    setIsUploading(true);

    const fileQueue = files.map(file => ({
      file,
      fileId: generateDocumentId(),
    }));

    setUploadProgress(prev => {
      const updated = new Map(prev);
      fileQueue.forEach(({ fileId, file }) => {
        updated.set(fileId, {
          fileId,
          fileName: file.name,
          progress: 0,
          status: 'uploading',
          startTime: new Date(),
        });
        callbacks.onFileQueued?.(fileId, file);
      });
      return updated;
    });

    try {
      for (const { file, fileId } of fileQueue) {
        const controller = new AbortController();
        controllersRef.current.set(fileId, controller);
        startTimesRef.current.set(fileId, Date.now());

        try {
          await uploadFileInChunks(file, {
            chunkSize: DEFAULT_CHUNK_SIZE,
            signal: controller.signal,
            fileId,
            onProgress: ({ percentage, estimatedTimeRemaining }) => {
              updateProgressEntry(fileId, {
                progress: percentage,
                status: 'uploading',
                estimatedTimeRemaining,
              });
            },
            simulateLatency: true,
          });

          updateProgressEntry(fileId, {
            progress: 100,
            status: 'ready',
            estimatedTimeRemaining: 0,
          });

          callbacks.onFileCompleted?.(fileId);
        } catch (error) {
          const isAbort = error instanceof DOMException && error.name === 'AbortError';
          updateProgressEntry(fileId, {
            status: 'error',
            error: isAbort ? 'Upload cancelled by user' : 'Upload failed',
            estimatedTimeRemaining: undefined,
          });
        } finally {
          controllersRef.current.delete(fileId);
          startTimesRef.current.delete(fileId);
        }
      }
    } finally {
      setIsUploading(false);
    }
  }, [updateProgressEntry]);

  const cancelUpload = useCallback((fileId: string): void => {
    const controller = controllersRef.current.get(fileId);
    if (controller && !controller.signal.aborted) {
      controller.abort();
    }

    updateProgressEntry(fileId, {
      status: 'error',
      error: 'Upload cancelled by user',
    });
  }, [updateProgressEntry]);

  const clearCompleted = useCallback((): void => {
    setUploadProgress(prev => {
      const updated = new Map(prev);
      prev.forEach((progress, fileId) => {
        if (progress.status === 'ready' || progress.status === 'error') {
          updated.delete(fileId);
          controllersRef.current.delete(fileId);
          startTimesRef.current.delete(fileId);
        }
      });
      return updated;
    });
  }, []);

  return {
    uploadFiles,
    uploadProgress,
    isUploading,
    cancelUpload,
    clearCompleted,
  };
}
