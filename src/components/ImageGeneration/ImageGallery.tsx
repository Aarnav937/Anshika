/**
 * Image Gallery Component
 * Displays all generated images with filtering and management
 */

import React, { useEffect, useState } from 'react';
import { imageStorageService, StorageQuota } from '../../services/image/imageStorageService';
import { GeneratedImage } from '../../types/imageGeneration';
import { Download, Trash2, Star, StarOff, Search, Calendar } from 'lucide-react';
import { LazyImage } from './LazyImage';

interface ImageGalleryProps {
  onImageSelect?: (image: GeneratedImage) => void;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ onImageSelect }) => {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [filteredImages, setFilteredImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageQuota, setStorageQuota] = useState<StorageQuota | null>(null);
  const [filter, setFilter] = useState<'all' | 'today' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  // Load images on mount and set up event-based refresh
  useEffect(() => {
    loadImages();
    loadStorageInfo();
    
    // Listen for custom storage events (no more polling!)
    const handleStorageUpdate = () => {
      loadImages();
      loadStorageInfo();
    };
    
    window.addEventListener('imageStorageUpdated', handleStorageUpdate);
    
    return () => {
      window.removeEventListener('imageStorageUpdated', handleStorageUpdate);
    };
  }, []);

  // Apply filters when images or filter changes
  useEffect(() => {
    applyFilters();
  }, [images, filter, searchQuery]);

  const loadImages = async () => {
    try {
      setLoading(true);
      const allImages = await imageStorageService.getAllImages();
      setImages(allImages);
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStorageInfo = async () => {
    try {
      const quota = await imageStorageService.getStorageUsage();
      setStorageQuota(quota);
    } catch (error) {
      console.error('Error loading storage info:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...images];

    // Apply time filter
    if (filter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(img => 
        new Date(img.metadata.timestamp) >= today
      );
    } else if (filter === 'favorites') {
      filtered = filtered.filter(img => img.metadata.favorite);
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(img =>
        img.metadata.prompt.toLowerCase().includes(query) ||
        img.metadata.enhancedPrompt?.toLowerCase().includes(query) ||
        img.metadata.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredImages(filtered);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this image? This cannot be undone.')) return;

    try {
      await imageStorageService.deleteImage(id);
      await loadImages();
      await loadStorageInfo();
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image');
    }
  };

  const toggleImageSelection = (id: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedImages(new Set(filteredImages.map(img => img.id)));
  };

  const deselectAll = () => {
    setSelectedImages(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedImages.size === 0) return;
    if (!confirm(`Delete ${selectedImages.size} images? This cannot be undone.`)) return;

    try {
      for (const id of selectedImages) {
        await imageStorageService.deleteImage(id);
      }
      await loadImages();
      await loadStorageInfo();
      setSelectedImages(new Set());
      setBulkMode(false);
    } catch (error) {
      console.error('Error deleting images:', error);
      alert('Failed to delete some images');
    }
  };

  const handleBulkDownload = async () => {
    if (selectedImages.size === 0) return;

    try {
      for (const id of selectedImages) {
        await imageStorageService.exportImage(id);
        // Small delay to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error('Error downloading images:', error);
      alert('Failed to download some images');
    }
  };

  const handleBulkFavorite = async () => {
    if (selectedImages.size === 0) return;

    try {
      for (const id of selectedImages) {
        await imageStorageService.toggleFavorite(id);
      }
      await loadImages();
      setSelectedImages(new Set());
    } catch (error) {
      console.error('Error updating favorites:', error);
      alert('Failed to update favorites');
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      await imageStorageService.toggleFavorite(id);
      await loadImages();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      await imageStorageService.exportImage(id);
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Failed to download image');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date): string => {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Storage Info */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
          Image Gallery
        </h2>
        
        {storageQuota && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{images.length} images</span>
              <span>{formatFileSize(storageQuota.used)} / {formatFileSize(storageQuota.total)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  storageQuota.percentage > 90 ? 'bg-red-500' :
                  storageQuota.percentage > 70 ? 'bg-yellow-500' :
                  'bg-gradient-to-r from-purple-500 to-blue-500'
                }`}
                style={{ width: `${storageQuota.percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Filters and Bulk Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('today')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              filter === 'today'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Today
          </button>
          <button
            onClick={() => setFilter('favorites')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              filter === 'favorites'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Star className="w-4 h-4" />
            Favorites
          </button>
          
          {/* Bulk Mode Toggle */}
          <button
            onClick={() => {
              setBulkMode(!bulkMode);
              setSelectedImages(new Set());
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              bulkMode
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {bulkMode ? '✓ Bulk Select' : 'Bulk Select'}
          </button>
        </div>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {bulkMode && selectedImages.size > 0 && (
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-semibold">{selectedImages.size} selected</span>
            <button
              onClick={selectAll}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
            >
              Deselect All
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkFavorite}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded transition-colors flex items-center gap-2"
            >
              <Star className="w-4 h-4" />
              Toggle Favorites
            </button>
            <button
              onClick={handleBulkDownload}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download All
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete All
            </button>
          </div>
        </div>
      )}

      {/* Gallery Grid */}
      {filteredImages.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium">No images found</p>
          <p className="text-sm mt-2">
            {images.length === 0 
              ? 'Generate your first image to see it here!'
              : 'Try adjusting your filters'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredImages.map((image) => (
            <div
              key={image.id}
              className={`group relative bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all cursor-pointer ${
                selectedImages.has(image.id) ? 'ring-4 ring-purple-500' : ''
              }`}
              onClick={() => {
                if (bulkMode) {
                  toggleImageSelection(image.id);
                } else {
                  onImageSelect?.(image);
                }
              }}
            >
              {/* Image */}
              <div className="aspect-square overflow-hidden bg-gray-100">
                <LazyImage
                  src={image.thumbnailUrl || image.url}
                  alt={image.metadata.prompt}
                  className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                />
                
                {/* Bulk Selection Checkbox */}
                {bulkMode && (
                  <div className="absolute top-2 left-2">
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                      selectedImages.has(image.id)
                        ? 'bg-purple-600 border-purple-600'
                        : 'bg-white border-gray-300'
                    }`}>
                      {selectedImages.has(image.id) && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Overlay Actions */}
              <div className={`absolute top-2 right-2 flex gap-2 transition-opacity ${
                bulkMode ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
              }`}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(image.id);
                  }}
                  className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                  title={image.metadata.favorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {image.metadata.favorite ? (
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  ) : (
                    <StarOff className="w-4 h-4 text-gray-600" />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(image.id);
                  }}
                  className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(image.id);
                  }}
                  className="p-2 bg-white rounded-full shadow-lg hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>

              {/* Info */}
              <div className="p-4">
                <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                  {image.metadata.prompt}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="capitalize">{image.metadata.mode}</span>
                  <span>{formatDate(image.metadata.timestamp)}</span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {formatFileSize(image.metadata.fileSize)} • {image.metadata.generationTime.toFixed(1)}s
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
