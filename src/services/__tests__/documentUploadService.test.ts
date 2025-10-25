/**
 * @jest-environment jsdom
 */

import { uploadFileInChunks, calculateChunkCount, DEFAULT_CHUNK_SIZE } from '../documentUploadService';

describe('documentUploadService', () => {
  it('calculates chunk counts accurately', () => {
    expect(calculateChunkCount(0, DEFAULT_CHUNK_SIZE)).toBe(0);
    expect(calculateChunkCount(1, DEFAULT_CHUNK_SIZE)).toBe(1);
    expect(calculateChunkCount(DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_SIZE)).toBe(1);
    expect(calculateChunkCount(DEFAULT_CHUNK_SIZE + 1, DEFAULT_CHUNK_SIZE)).toBe(2);
  });

  it('emits progress updates while uploading', async () => {
    const size = 1 * 1024 * 1024; // 1MB
    const file = new File([new Uint8Array(size)], 'progress.bin', {
      type: 'application/octet-stream',
      lastModified: Date.now(),
    });

    const updates: number[] = [];

    await uploadFileInChunks(file, {
      chunkSize: 256 * 1024, // 256KB
      simulateLatency: false,
      onProgress: ({ percentage }) => {
        updates.push(percentage);
      },
    });

    expect(updates.length).toBeGreaterThan(0);
    expect(updates[0]).toBeGreaterThan(0);
    expect(updates[updates.length - 1]).toBe(100);
  });

  it('stops uploading when aborted', async () => {
    const size = 512 * 1024;
    const file = new File([new Uint8Array(size)], 'abort.bin', {
      type: 'application/octet-stream',
      lastModified: Date.now(),
    });

    const controller = new AbortController();
    const promise = uploadFileInChunks(file, {
      chunkSize: 128 * 1024,
      signal: controller.signal,
      simulateLatency: true,
    });

    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });
});
