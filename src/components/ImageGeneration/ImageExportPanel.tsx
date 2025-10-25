/**
 * Image Export Panel Component
 * Task 2.10: Export & Sharing UI
 * 
 * Provides user interface for exporting images in multiple formats,
 * copying to clipboard, and batch operations.
 */

import React, { useState } from 'react';
import { Download, Copy, FileImage, Sparkles, Check } from 'lucide-react';
import { GeneratedImage } from '../../types/imageGeneration';
import {
  ExportFormat,
  ExportOptions,
  imageExportService,
} from '../../services/image/imageExportService';

interface ImageExportPanelProps {
  image: GeneratedImage;
  onClose?: () => void;
}

type UseCase = 'web' | 'print' | 'social' | 'archive';

export const ImageExportPanel: React.FC<ImageExportPanelProps> = ({ image, onClose }) => {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [quality, setQuality] = useState<number>(0.95);
  const [includeMetadata, setIncludeMetadata] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState<boolean>(false);
  const [filenameTemplate, setFilenameTemplate] = useState<string>('{prompt}_{date}_{time}');

  const handleExport = async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const options: ExportOptions = {
        format,
        quality: format === 'png' ? 1.0 : quality,
        includeMetadata,
        customFilename: imageExportService.generateFilename(
          image.metadata,
          filenameTemplate,
          format
        ),
      };

      const result = await imageExportService.exportImage(image, options);

      if (result.success) {
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    const success = await imageExportService.copyImageToClipboard(image);
    if (success) {
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 3000);
    }
  };

  const handleUseCaseSelect = (useCase: UseCase) => {
    const recommendation = imageExportService.getRecommendedFormat(useCase);
    setFormat(recommendation.format);
    setQuality(recommendation.quality);
  };

  const formatSizeLabel = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileImage className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Export Image
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            ✕
          </button>
        )}
      </div>

      {/* Quick Use Case Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Quick Presets
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['web', 'print', 'social', 'archive'] as UseCase[]).map((useCase) => {
            const rec = imageExportService.getRecommendedFormat(useCase);
            return (
              <button
                key={useCase}
                onClick={() => handleUseCaseSelect(useCase)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-700 transition-colors"
              >
                <div className="font-medium capitalize">{useCase}</div>
                <div className="text-xs text-gray-500">{rec.format.toUpperCase()}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Format Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Format
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['png', 'jpeg', 'webp'] as ExportFormat[]).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setFormat(fmt)}
              className={`px-4 py-3 rounded-lg border-2 transition-all ${
                format === fmt
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-600'
                  : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
              }`}
            >
              <div className="font-bold text-sm uppercase">{fmt}</div>
              <div className="text-xs text-gray-500">
                {fmt === 'png' && 'Lossless'}
                {fmt === 'jpeg' && 'Compressed'}
                {fmt === 'webp' && 'Modern'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quality Slider (for JPEG/WebP) */}
      {format !== 'png' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Quality: {Math.round(quality * 100)}%
          </label>
          <input
            type="range"
            min="0.5"
            max="1.0"
            step="0.05"
            value={quality}
            onChange={(e) => setQuality(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Smaller file</span>
            <span>Better quality</span>
          </div>
        </div>
      )}

      {/* Filename Template */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Filename Template
        </label>
        <input
          type="text"
          value={filenameTemplate}
          onChange={(e) => setFilenameTemplate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          placeholder="{prompt}_{date}_{time}"
        />
        <div className="text-xs text-gray-500 mt-1">
          Available: {'{prompt}'}, {'{date}'}, {'{time}'}, {'{id}'}, {'{mode}'}, {'{quality}'}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          Preview: {imageExportService.generateFilename(image.metadata, filenameTemplate, format)}
        </div>
      </div>

      {/* Metadata Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Include Metadata File
          </div>
          <div className="text-xs text-gray-500">
            Export JSON with generation details
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={includeMetadata}
            onChange={(e) => setIncludeMetadata(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
        </label>
      </div>

      {/* File Size Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Original size: {formatSizeLabel(image.blob.size)}
        </div>
        {format !== 'png' && (
          <div className="text-xs text-gray-500 mt-1">
            Estimated: ~{formatSizeLabel(Math.round(image.blob.size * quality))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
        >
          {exportSuccess ? (
            <>
              <Check className="w-5 h-5" />
              Exported!
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              {isExporting ? 'Exporting...' : 'Export'}
            </>
          )}
        </button>

        <button
          onClick={handleCopyToClipboard}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all font-medium"
        >
          {copiedToClipboard ? (
            <>
              <Check className="w-5 h-5" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Format Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-800 dark:text-blue-200">
            {format === 'png' && (
              <>
                <strong>PNG:</strong> Lossless quality, larger files. Best for graphics with transparency
                or when you need perfect quality.
              </>
            )}
            {format === 'jpeg' && (
              <>
                <strong>JPEG:</strong> Good compression, smaller files. Best for photos and social media.
                No transparency support.
              </>
            )}
            {format === 'webp' && (
              <>
                <strong>WebP:</strong> Modern format with excellent compression. 25-35% smaller than JPEG
                with similar quality. Great for web use.
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageExportPanel;
