/**
 * SearchFilters Component
 * 
 * Advanced filtering panel with multiple criteria including document type,
 * date range, file size, confidence scores, and tags.
 */

import React, { useState, useEffect } from 'react';
import './SearchComponents.css';
import { 
  ProcessedDocument, 
  SearchFilters as SearchFiltersType,
  DocumentSummary 
} from '../types/document';

interface SearchFiltersProps {
  filters: SearchFiltersType;
  documents: ProcessedDocument[];
  onFiltersChange: (filters: SearchFiltersType) => void;
  onClose: () => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  documents,
  onFiltersChange,
  onClose
}) => {
  const [localFilters, setLocalFilters] = useState<SearchFiltersType>(filters);

  // Update local filters when prop changes
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Get available options from documents
  const getAvailableOptions = () => {
    const documentTypes = new Set<DocumentSummary['documentType']>();
    const tags = new Set<string>();
    let minSize = Infinity;
    let maxSize = 0;
    let minDate = new Date();
    let maxDate = new Date(0);
    let minConfidence = 100;
    let maxConfidence = 0;

    documents.forEach(doc => {
      // Document types
      if (doc.summary?.documentType) {
        documentTypes.add(doc.summary.documentType);
      }

      // Tags
      if (doc.tags) {
        doc.tags.forEach(tag => tags.add(tag));
      }

      // File sizes
      const size = doc.originalFile.size;
      minSize = Math.min(minSize, size);
      maxSize = Math.max(maxSize, size);

      // Dates
      const date = doc.processedAt || doc.uploadedAt;
      if (date < minDate) minDate = date;
      if (date > maxDate) maxDate = date;

      // Confidence scores
      if (doc.summary?.confidence) {
        minConfidence = Math.min(minConfidence, doc.summary.confidence);
        maxConfidence = Math.max(maxConfidence, doc.summary.confidence);
      }
    });

    return {
      documentTypes: Array.from(documentTypes).sort(),
      tags: Array.from(tags).sort(),
      sizeRange: { min: minSize, max: maxSize },
      dateRange: { min: minDate, max: maxDate },
      confidenceRange: { min: minConfidence, max: maxConfidence }
    };
  };

  const availableOptions = getAvailableOptions();

  // Format file size for display
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle filter updates
  const updateFilter = (key: keyof SearchFiltersType, value: any) => {
    const updatedFilters = { ...localFilters, [key]: value };
    setLocalFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  // Handle document type selection
  const handleDocumentTypeChange = (type: DocumentSummary['documentType'], checked: boolean) => {
    const currentTypes = localFilters.documentTypes || [];
    const updatedTypes = checked
      ? [...currentTypes, type]
      : currentTypes.filter(t => t !== type);
    
    updateFilter('documentTypes', updatedTypes.length > 0 ? updatedTypes : undefined);
  };

  // Handle tag selection
  const handleTagChange = (tag: string, checked: boolean) => {
    const currentTags = localFilters.tags || [];
    const updatedTags = checked
      ? [...currentTags, tag]
      : currentTags.filter(t => t !== tag);
    
    updateFilter('tags', updatedTags.length > 0 ? updatedTags : undefined);
  };

  // Clear all filters
  const clearAllFilters = () => {
    const emptyFilters: SearchFiltersType = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  // Count active filters
  const activeFiltersCount = Object.values(localFilters).filter(value => 
    value !== undefined && 
    value !== null && 
    (Array.isArray(value) ? value.length > 0 : true)
  ).length;

  return (
    <div className="search-filters-panel">
      {/* Header */}
      <div className="filters-header">
        <div className="filters-title">
          <span className="filters-icon">🔧</span>
          <h3>Advanced Filters</h3>
          {activeFiltersCount > 0 && (
            <span className="active-filters-badge">
              {activeFiltersCount} active
            </span>
          )}
        </div>
        
        <div className="filters-actions">
          <button 
            onClick={clearAllFilters}
            className="clear-filters-btn"
            disabled={activeFiltersCount === 0}
          >
            Clear All
          </button>
          <button 
            onClick={onClose}
            className="close-filters-btn"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Filter Content */}
      <div className="filters-content">
        
        {/* Document Types */}
        <div className="filter-section">
          <h4 className="filter-section-title">📄 Document Type</h4>
          <div className="filter-options">
            {availableOptions.documentTypes.map(type => (
              <label key={type} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={(localFilters.documentTypes || []).includes(type)}
                  onChange={(e) => handleDocumentTypeChange(type, e.target.checked)}
                />
                <span className="checkbox-label">
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </span>
                <span className="option-count">
                  ({documents.filter(d => d.summary?.documentType === type).length})
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="filter-section">
          <h4 className="filter-section-title">📅 Date Range</h4>
          <div className="date-range-inputs">
            <div className="date-input-group">
              <label>From:</label>
              <input
                type="date"
                value={localFilters.dateRange?.start?.toISOString().split('T')[0] || ''}
                onChange={(e) => {
                  const startDate = e.target.value ? new Date(e.target.value) : undefined;
                  updateFilter('dateRange', {
                    ...localFilters.dateRange,
                    start: startDate
                  });
                }}
              />
            </div>
            <div className="date-input-group">
              <label>To:</label>
              <input
                type="date"
                value={localFilters.dateRange?.end?.toISOString().split('T')[0] || ''}
                onChange={(e) => {
                  const endDate = e.target.value ? new Date(e.target.value) : undefined;
                  updateFilter('dateRange', {
                    ...localFilters.dateRange,
                    end: endDate
                  });
                }}
              />
            </div>
          </div>
        </div>

        {/* File Size */}
        <div className="filter-section">
          <h4 className="filter-section-title">📦 File Size</h4>
          <div className="size-range-inputs">
            <div className="size-input-group">
              <label>Min: {formatFileSize(localFilters.sizeRange?.min || 0)}</label>
              <input
                type="range"
                min={availableOptions.sizeRange.min}
                max={availableOptions.sizeRange.max}
                value={localFilters.sizeRange?.min || availableOptions.sizeRange.min}
                onChange={(e) => {
                  const minSize = parseInt(e.target.value);
                  updateFilter('sizeRange', {
                    ...localFilters.sizeRange,
                    min: minSize
                  });
                }}
              />
            </div>
            <div className="size-input-group">
              <label>Max: {formatFileSize(localFilters.sizeRange?.max || availableOptions.sizeRange.max)}</label>
              <input
                type="range"
                min={availableOptions.sizeRange.min}
                max={availableOptions.sizeRange.max}
                value={localFilters.sizeRange?.max || availableOptions.sizeRange.max}
                onChange={(e) => {
                  const maxSize = parseInt(e.target.value);
                  updateFilter('sizeRange', {
                    ...localFilters.sizeRange,
                    max: maxSize
                  });
                }}
              />
            </div>
          </div>
        </div>

        {/* Confidence Score */}
        <div className="filter-section">
          <h4 className="filter-section-title">🎯 Analysis Confidence</h4>
          <div className="confidence-range-inputs">
            <div className="confidence-input-group">
              <label>Min: {localFilters.confidenceRange?.min || 0}%</label>
              <input
                type="range"
                min={0}
                max={100}
                value={localFilters.confidenceRange?.min || 0}
                onChange={(e) => {
                  const minConfidence = parseInt(e.target.value);
                  updateFilter('confidenceRange', {
                    ...localFilters.confidenceRange,
                    min: minConfidence
                  });
                }}
              />
            </div>
            <div className="confidence-input-group">
              <label>Max: {localFilters.confidenceRange?.max || 100}%</label>
              <input
                type="range"
                min={0}
                max={100}
                value={localFilters.confidenceRange?.max || 100}
                onChange={(e) => {
                  const maxConfidence = parseInt(e.target.value);
                  updateFilter('confidenceRange', {
                    ...localFilters.confidenceRange,
                    max: maxConfidence
                  });
                }}
              />
            </div>
          </div>
        </div>

        {/* Tags */}
        {availableOptions.tags.length > 0 && (
          <div className="filter-section">
            <h4 className="filter-section-title">🏷️ Tags</h4>
            <div className="filter-options">
              {availableOptions.tags.slice(0, 10).map(tag => (
                <label key={tag} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={(localFilters.tags || []).includes(tag)}
                    onChange={(e) => handleTagChange(tag, e.target.checked)}
                  />
                  <span className="checkbox-label">{tag}</span>
                  <span className="option-count">
                    ({documents.filter(d => d.tags?.includes(tag)).length})
                  </span>
                </label>
              ))}
              {availableOptions.tags.length > 10 && (
                <div className="more-tags-notice">
                  +{availableOptions.tags.length - 10} more tags available
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional Options */}
        <div className="filter-section">
          <h4 className="filter-section-title">⚙️ Additional Options</h4>
          <div className="filter-options">
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={localFilters.hasAnalysis || false}
                onChange={(e) => updateFilter('hasAnalysis', e.target.checked || undefined)}
              />
              <span className="checkbox-label">Has Analysis</span>
            </label>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="filters-footer">
        <div className="filter-results-preview">
          Showing documents matching {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};

export default SearchFilters;