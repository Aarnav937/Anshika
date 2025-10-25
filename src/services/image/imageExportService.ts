/**
 * Image Export Service
 * Task 2.10: Export & Sharing
 * 
 * Provides multiple export formats (PNG, JPEG, WebP) with optional metadata embedding,
 * clipboard copy, filename templates, and batch export capabilities.
 */

import { GeneratedImage, ImageMetadata } from '../../types/imageGeneration';

export type ExportFormat = 'png' | 'jpeg' | 'webp';

export interface ExportOptions {
  format: ExportFormat;
  quality?: number; // 0.0-1.0 (for JPEG/WebP)
  includeMetadata?: boolean;
  customFilename?: string;
}

export interface BatchExportOptions extends ExportOptions {
  zipFilename?: string;
  includeManifest?: boolean; // JSON file with all metadata
}

export interface ExportResult {
  success: boolean;
  filename: string;
  fileSize: number;
  format: ExportFormat;
  error?: string;
}

export interface BatchExportResult {
  totalImages: number;
  successfulExports: number;
  failedExports: number;
  results: ExportResult[];
  totalSize: number;
  error?: string;
}

/**
 * Generate filename from template
 * Supports: {prompt}, {date}, {time}, {id}, {mode}, {quality}, {seed}
 */
export function generateFilename(
  metadata: ImageMetadata,
  template: string = '{prompt}_{date}_{time}',
  format: ExportFormat
): string {
  const date = new Date(metadata.timestamp);
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  
  // Sanitize prompt (first 50 chars, alphanumeric + spaces)
  const promptShort = metadata.prompt
    .substring(0, 50)
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();

  let filename = template
    .replace('{prompt}', promptShort)
    .replace('{date}', dateStr)
    .replace('{time}', timeStr)
    .replace('{id}', metadata.parameters.seed?.toString() || 'random')
    .replace('{mode}', metadata.mode)
    .replace('{quality}', metadata.qualityTier || 'standard')
    .replace('{seed}', metadata.parameters.seed?.toString() || 'random');

  // Add extension
  return `${filename}.${format}`;
}

/**
 * Convert blob to different format with optional quality control
 */
export async function convertImageFormat(
  blob: Blob,
  targetFormat: ExportFormat,
  quality: number = 0.95
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      try {
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw image
        ctx.drawImage(img, 0, 0);

        // Convert to target format
        const mimeType = `image/${targetFormat}`;
        canvas.toBlob(
          (convertedBlob) => {
            URL.revokeObjectURL(url);
            if (convertedBlob) {
              resolve(convertedBlob);
            } else {
              reject(new Error('Failed to convert image'));
            }
          },
          mimeType,
          quality
        );
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Embed metadata in image file (as EXIF/comment where supported)
 * Note: Full EXIF writing requires additional library, this adds basic metadata
 */
export function createMetadataComment(metadata: ImageMetadata): string {
  return JSON.stringify({
    prompt: metadata.prompt,
    enhancedPrompt: metadata.enhancedPrompt,
    negativePrompt: metadata.negativePrompt,
    mode: metadata.mode,
    model: metadata.model,
    timestamp: metadata.timestamp,
    generationTime: metadata.generationTime,
    seed: metadata.seed,
    resolution: metadata.resolution,
    parameters: {
      aspectRatio: metadata.parameters.aspectRatio,
      quality: metadata.parameters.quality,
    },
  }, null, 2);
}

/**
 * Export single image with options
 */
export async function exportImage(
  image: GeneratedImage,
  options: ExportOptions
): Promise<ExportResult> {
  try {
    const {
      format,
      quality = 0.95,
      includeMetadata = false,
      customFilename,
    } = options;

    // Convert format if needed
    let exportBlob = image.blob;
    const originalMime = image.blob.type;
    const targetMime = `image/${format}`;

    if (originalMime !== targetMime) {
      exportBlob = await convertImageFormat(image.blob, format, quality);
    }

    // Generate filename
    const filename = customFilename || generateFilename(image.metadata, undefined, format);

    // If metadata embedding requested, create a text file alongside
    if (includeMetadata) {
      const metadataComment = createMetadataComment(image.metadata);
      const metadataBlob = new Blob([metadataComment], { type: 'application/json' });
      const metadataFilename = filename.replace(`.${format}`, '.json');
      
      // Download metadata file
      const metadataUrl = URL.createObjectURL(metadataBlob);
      const metadataLink = document.createElement('a');
      metadataLink.href = metadataUrl;
      metadataLink.download = metadataFilename;
      metadataLink.click();
      URL.revokeObjectURL(metadataUrl);
    }

    // Download image
    const url = URL.createObjectURL(exportBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    return {
      success: true,
      filename,
      fileSize: exportBlob.size,
      format,
    };
  } catch (error) {
    return {
      success: false,
      filename: '',
      fileSize: 0,
      format: options.format,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Copy image to clipboard
 */
export async function copyImageToClipboard(image: GeneratedImage): Promise<boolean> {
  try {
    // Check if Clipboard API is supported
    if (!navigator.clipboard || !navigator.clipboard.write) {
      throw new Error('Clipboard API not supported in this browser');
    }

    // Create ClipboardItem with PNG blob
    let pngBlob = image.blob;
    if (image.blob.type !== 'image/png') {
      pngBlob = await convertImageFormat(image.blob, 'png', 1.0);
    }

    const clipboardItem = new ClipboardItem({
      'image/png': pngBlob,
    });

    await navigator.clipboard.write([clipboardItem]);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Batch export multiple images
 * Note: Creates individual downloads (browser limitation without zip library)
 */
export async function batchExport(
  images: GeneratedImage[],
  options: BatchExportOptions
): Promise<BatchExportResult> {
  const results: ExportResult[] = [];
  let successCount = 0;
  let failCount = 0;
  let totalSize = 0;

  try {
    // Export manifest if requested
    if (options.includeManifest) {
      const manifest = {
        exportDate: new Date().toISOString(),
        totalImages: images.length,
        format: options.format,
        images: images.map(img => ({
          id: img.id,
          metadata: img.metadata,
        })),
      };

      const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], {
        type: 'application/json',
      });
      const manifestUrl = URL.createObjectURL(manifestBlob);
      const manifestLink = document.createElement('a');
      manifestLink.href = manifestUrl;
      manifestLink.download = 'export_manifest.json';
      manifestLink.click();
      URL.revokeObjectURL(manifestUrl);
    }

    // Export each image with delay to avoid browser blocking
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      // Generate filename with index
      const customFilename = generateFilename(
        image.metadata,
        `{prompt}_{date}_{time}_${i + 1}`,
        options.format
      );

      const result = await exportImage(image, {
        ...options,
        customFilename,
      });

      results.push(result);
      
      if (result.success) {
        successCount++;
        totalSize += result.fileSize;
      } else {
        failCount++;
      }

      // Small delay between downloads to avoid browser blocking
      if (i < images.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    return {
      totalImages: images.length,
      successfulExports: successCount,
      failedExports: failCount,
      results,
      totalSize,
    };
  } catch (error) {
    return {
      totalImages: images.length,
      successfulExports: successCount,
      failedExports: failCount,
      results,
      totalSize,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get recommended export format based on use case
 */
export function getRecommendedFormat(useCase: 'web' | 'print' | 'social' | 'archive'): {
  format: ExportFormat;
  quality: number;
  reason: string;
} {
  switch (useCase) {
    case 'web':
      return {
        format: 'webp',
        quality: 0.85,
        reason: 'WebP offers best compression for web use (30-50% smaller than PNG)',
      };
    case 'print':
      return {
        format: 'png',
        quality: 1.0,
        reason: 'PNG is lossless, best for high-quality prints',
      };
    case 'social':
      return {
        format: 'jpeg',
        quality: 0.90,
        reason: 'JPEG is widely supported and creates moderate file sizes',
      };
    case 'archive':
      return {
        format: 'png',
        quality: 1.0,
        reason: 'PNG preserves all detail for long-term storage',
      };
    default:
      return {
        format: 'png',
        quality: 1.0,
        reason: 'PNG is the most versatile format',
      };
  }
}

/**
 * Estimate file size for different formats
 */
export async function estimateExportSize(
  image: GeneratedImage,
  format: ExportFormat,
  quality: number = 0.95
): Promise<number> {
  try {
    const converted = await convertImageFormat(image.blob, format, quality);
    return converted.size;
  } catch (error) {
    console.error('Failed to estimate size:', error);
    return image.blob.size; // Return original size as fallback
  }
}

// Export default service object
export const imageExportService = {
  exportImage,
  batchExport,
  copyImageToClipboard,
  generateFilename,
  convertImageFormat,
  getRecommendedFormat,
  estimateExportSize,
  createMetadataComment,
};
