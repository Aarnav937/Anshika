/**
 * Image Storage Service
 * Manages persistent storage of generated images using IndexedDB via Dexie
 */

import Dexie, { Table } from 'dexie';
import { ImageRecord, ImageMetadata, GeneratedImage } from '../../types/imageGeneration';

// Define database schema
export class ImageDatabase extends Dexie {
  generatedImages!: Table<ImageRecord, string>;

  constructor() {
    super('AIImageGenerationDB');
    
    this.version(1).stores({
      generatedImages: 'id, createdAt, favorite, *tags, metadata.mode, metadata.timestamp',
    });
  }
}

// Create database instance
const db = new ImageDatabase();

export interface StorageQuota {
  used: number; // bytes
  available: number; // bytes
  total: number; // bytes
  percentage: number;
}

export class ImageStorageService {
  private maxStorageBytes = 2 * 1024 * 1024 * 1024; // 2GB default
  private thumbnailMaxSize = 200; // pixels

  /**
   * Save a generated image to IndexedDB
   */
  async saveImage(image: GeneratedImage): Promise<void> {
    try {
      // Check storage quota before saving
      const quota = await this.getStorageUsage();
      if (quota.percentage >= 95) {
        throw new Error('Storage quota nearly full. Please delete some images.');
      }

      // Generate thumbnail
      const thumbnail = await this.generateThumbnail(image.blob);

      // Create record
      const record: ImageRecord = {
        id: image.id,
        blob: image.blob,
        thumbnailBlob: thumbnail,
        metadata: image.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        favorite: image.metadata.favorite || false,
        tags: image.metadata.tags || [],
        userRating: image.metadata.userRating,
      };

      // Save to IndexedDB
      await db.generatedImages.put(record);
      
      console.log(`Image ${image.id} saved successfully`);
    } catch (error) {
      console.error('Error saving image:', error);
      throw new Error(`Failed to save image: ${error}`);
    }
  }

  /**
   * Get an image by ID
   */
  async getImage(id: string): Promise<GeneratedImage | null> {
    try {
      const record = await db.generatedImages.get(id);
      if (!record) return null;

      return {
        id: record.id,
        blob: record.blob,
        url: URL.createObjectURL(record.blob),
        metadata: record.metadata,
        thumbnail: record.thumbnailBlob,
        thumbnailUrl: record.thumbnailBlob 
          ? URL.createObjectURL(record.thumbnailBlob)
          : undefined,
      };
    } catch (error) {
      console.error('Error getting image:', error);
      return null;
    }
  }

  /**
   * Get all images
   */
  async getAllImages(): Promise<GeneratedImage[]> {
    try {
      const records = await db.generatedImages.orderBy('createdAt').reverse().toArray();
      
      return records.map(record => ({
        id: record.id,
        blob: record.blob,
        url: URL.createObjectURL(record.blob),
        metadata: record.metadata,
        thumbnail: record.thumbnailBlob,
        thumbnailUrl: record.thumbnailBlob 
          ? URL.createObjectURL(record.thumbnailBlob)
          : undefined,
      }));
    } catch (error) {
      console.error('Error getting all images:', error);
      return [];
    }
  }

  /**
   * Delete an image
   */
  async deleteImage(id: string): Promise<void> {
    try {
      await db.generatedImages.delete(id);
      console.log(`Image ${id} deleted successfully`);
    } catch (error) {
      console.error('Error deleting image:', error);
      throw new Error(`Failed to delete image: ${error}`);
    }
  }

  /**
   * Delete multiple images
   */
  async deleteImages(ids: string[]): Promise<void> {
    try {
      await db.generatedImages.bulkDelete(ids);
      console.log(`${ids.length} images deleted successfully`);
    } catch (error) {
      console.error('Error deleting images:', error);
      throw new Error(`Failed to delete images: ${error}`);
    }
  }

  /**
   * Update image metadata
   */
  async updateImageMetadata(id: string, updates: Partial<ImageMetadata>): Promise<void> {
    try {
      const record = await db.generatedImages.get(id);
      if (!record) {
        throw new Error(`Image ${id} not found`);
      }

      record.metadata = { ...record.metadata, ...updates };
      record.updatedAt = new Date();
      
      await db.generatedImages.put(record);
    } catch (error) {
      console.error('Error updating image metadata:', error);
      throw new Error(`Failed to update image: ${error}`);
    }
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id: string): Promise<void> {
    try {
      const record = await db.generatedImages.get(id);
      if (!record) {
        throw new Error(`Image ${id} not found`);
      }

      record.favorite = !record.favorite;
      record.updatedAt = new Date();
      
      await db.generatedImages.put(record);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw new Error(`Failed to toggle favorite: ${error}`);
    }
  }

  /**
   * Add tags to an image
   */
  async addTags(id: string, newTags: string[]): Promise<void> {
    try {
      const record = await db.generatedImages.get(id);
      if (!record) {
        throw new Error(`Image ${id} not found`);
      }

      const uniqueTags = Array.from(new Set([...record.tags, ...newTags]));
      record.tags = uniqueTags;
      record.updatedAt = new Date();
      
      await db.generatedImages.put(record);
    } catch (error) {
      console.error('Error adding tags:', error);
      throw new Error(`Failed to add tags: ${error}`);
    }
  }

  /**
   * Search images by criteria
   */
  async searchImages(query: {
    tags?: string[];
    favorite?: boolean;
    mode?: 'online' | 'offline';
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<GeneratedImage[]> {
    try {
      let collection = db.generatedImages.orderBy('createdAt').reverse();

      if (query.favorite !== undefined) {
        collection = collection.filter(record => record.favorite === query.favorite);
      }

      if (query.mode) {
        collection = collection.filter(record => record.metadata.mode === query.mode);
      }

      if (query.dateFrom) {
        collection = collection.filter(record => record.createdAt >= query.dateFrom!);
      }

      if (query.dateTo) {
        collection = collection.filter(record => record.createdAt <= query.dateTo!);
      }

      if (query.tags && query.tags.length > 0) {
        collection = collection.filter(record => 
          query.tags!.some(tag => record.tags.includes(tag))
        );
      }

      const records = await collection.toArray();
      
      return records.map(record => ({
        id: record.id,
        blob: record.blob,
        url: URL.createObjectURL(record.blob),
        metadata: record.metadata,
        thumbnail: record.thumbnailBlob,
        thumbnailUrl: record.thumbnailBlob 
          ? URL.createObjectURL(record.thumbnailBlob)
          : undefined,
      }));
    } catch (error) {
      console.error('Error searching images:', error);
      return [];
    }
  }

  /**
   * Get storage usage information
   */
  async getStorageUsage(): Promise<StorageQuota> {
    try {
      const records = await db.generatedImages.toArray();
      const used = records.reduce((total, record) => {
        return total + record.blob.size + (record.thumbnailBlob?.size || 0);
      }, 0);

      const available = this.maxStorageBytes - used;
      const percentage = (used / this.maxStorageBytes) * 100;

      return {
        used,
        available,
        total: this.maxStorageBytes,
        percentage: Math.min(percentage, 100),
      };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return {
        used: 0,
        available: this.maxStorageBytes,
        total: this.maxStorageBytes,
        percentage: 0,
      };
    }
  }

  /**
   * Cleanup old images to free space
   */
  async cleanup(keepCount: number = 100): Promise<number> {
    try {
      // Get all images sorted by date (oldest first)
      const allRecords = await db.generatedImages.orderBy('createdAt').toArray();
      
      if (allRecords.length <= keepCount) {
        return 0; // Nothing to clean up
      }

      // Keep favorites and recent images
      const favorites = allRecords.filter(r => r.favorite);
      const nonFavorites = allRecords.filter(r => !r.favorite);

      // Calculate how many non-favorites to delete
      const deleteCount = Math.max(0, allRecords.length - keepCount - favorites.length);
      
      if (deleteCount === 0) return 0;

      // Delete oldest non-favorites
      const toDelete = nonFavorites.slice(0, deleteCount).map(r => r.id);
      await this.deleteImages(toDelete);

      return toDelete.length;
    } catch (error) {
      console.error('Error during cleanup:', error);
      return 0;
    }
  }

  /**
   * Generate thumbnail for an image
   */
  private async generateThumbnail(imageBlob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      img.onload = () => {
        // Calculate thumbnail size maintaining aspect ratio
        const maxSize = this.thumbnailMaxSize;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and convert to blob
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create thumbnail blob'));
            }
          },
          'image/jpeg',
          0.7
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(imageBlob);
    });
  }

  /**
   * Export image to file
   */
  async exportImage(id: string, filename?: string): Promise<void> {
    try {
      const image = await this.getImage(id);
      if (!image) {
        throw new Error(`Image ${id} not found`);
      }

      const url = URL.createObjectURL(image.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `generated-${id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting image:', error);
      throw new Error(`Failed to export image: ${error}`);
    }
  }

  /**
   * Get image count
   */
  async getImageCount(): Promise<number> {
    try {
      return await db.generatedImages.count();
    } catch (error) {
      console.error('Error getting image count:', error);
      return 0;
    }
  }

  /**
   * Clear all images
   */
  async clearAll(): Promise<void> {
    try {
      await db.generatedImages.clear();
      console.log('All images cleared from storage');
    } catch (error) {
      console.error('Error clearing images:', error);
      throw new Error(`Failed to clear images: ${error}`);
    }
  }
}

// Export singleton instance
export const imageStorageService = new ImageStorageService();
