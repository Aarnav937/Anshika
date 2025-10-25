import { DOCUMENT_CONSTANTS } from '../types/document';

export const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

export interface ChunkProgress {
  bytesUploaded: number;
  totalBytes: number;
  chunkIndex: number;
  totalChunks: number;
  percentage: number;
  estimatedTimeRemaining?: number;
}

export interface UploadOptions {
  chunkSize?: number;
  signal?: AbortSignal;
  onProgress?: (progress: ChunkProgress) => void;
  simulateLatency?: boolean;
  fileId?: string;
}

export interface UploadResult {
  fileId: string;
  fileName: string;
  totalBytes: number;
  chunkCount: number;
  durationMs: number;
}

export function calculateChunkCount(fileSize: number, chunkSize: number): number {
  return fileSize === 0 ? 0 : Math.ceil(fileSize / chunkSize);
}

export async function uploadFileInChunks(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    signal,
    onProgress,
    simulateLatency = false,
    fileId,
  } = options;

  if (file.size > DOCUMENT_CONSTANTS.MAX_FILE_SIZE) {
    throw new Error('File exceeds maximum allowed size.');
  }

  if (signal?.aborted) {
    throw new DOMException('Upload aborted before start', 'AbortError');
  }

  const totalChunks = calculateChunkCount(file.size, chunkSize);
  const startTime = Date.now();
  let bytesUploaded = 0;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    if (signal?.aborted) {
      throw new DOMException('Upload aborted by user', 'AbortError');
    }

    const start = chunkIndex * chunkSize;
    const end = Math.min(file.size, start + chunkSize);
    const chunk = file.slice(start, end);

    // Read chunk to simulate processing and allow future integrations
    if (signal?.aborted) {
      throw new DOMException('Upload aborted during chunk processing', 'AbortError');
    }
    
    if (typeof (chunk as Blob).arrayBuffer === 'function') {
      await (chunk as Blob).arrayBuffer();
    } else {
      await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error ?? new Error('Failed to read chunk'));
        reader.readAsArrayBuffer(chunk);
      });
    }

    if (signal?.aborted) {
      throw new DOMException('Upload aborted after chunk processing', 'AbortError');
    }

    if (simulateLatency) {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 50);
        signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new DOMException('Upload aborted during simulated latency', 'AbortError'));
        });
      });
    }

    bytesUploaded += chunk.size;

    if (onProgress) {
      const elapsedMs = Date.now() - startTime;
      const uploadRate = elapsedMs > 0 ? bytesUploaded / (elapsedMs / 1000) : 0; // bytes per second
      const remainingBytes = file.size - bytesUploaded;
      const estimatedTimeRemaining = uploadRate > 0
        ? Math.max(0, Math.round((remainingBytes / uploadRate) * 1000))
        : undefined;

      onProgress({
        bytesUploaded,
        totalBytes: file.size,
        chunkIndex: chunkIndex + 1,
        totalChunks,
        percentage: Math.round((bytesUploaded / file.size) * 100),
        estimatedTimeRemaining,
      });
    }
  }

  const durationMs = Date.now() - startTime;

  return {
    fileId: fileId ?? `${file.name}-${startTime}`,
    fileName: file.name,
    totalBytes: file.size,
    chunkCount: totalChunks,
    durationMs,
  };
}
