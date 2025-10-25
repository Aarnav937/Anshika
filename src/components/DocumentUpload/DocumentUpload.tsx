import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, File, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { validateMultipleFiles, formatFileSize, getFileIcon } from '../../utils/fileValidation';
import { UploadProgress, DocumentError, DOCUMENT_CONSTANTS } from '../../types/document';

interface DocumentUploadProps {
  onFilesSelected: (files: File[]) => void;
  onUploadProgress?: (progress: Map<string, UploadProgress>) => void;
  onError?: (error: DocumentError) => void;
  maxFiles?: number;
  maxSize?: number;
  className?: string;
  disabled?: boolean;
  uploadProgressMap?: Map<string, UploadProgress>;
}

interface FilePreview {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  uploadId?: string;
}

export default function DocumentUpload({
  onFilesSelected,
  onUploadProgress,
  onError,
  maxFiles = DOCUMENT_CONSTANTS.MAX_FILES,
  maxSize = DOCUMENT_CONSTANTS.MAX_FILE_SIZE,
  className = '',
  disabled = false,
  uploadProgressMap,
}: DocumentUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FilePreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Handle file selection
  const handleFileSelection = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Validate files
    const validation = validateMultipleFiles(fileArray);
    if (!validation.isValid) {
      onError?.({
        code: 'VALIDATION_ERROR',
        message: validation.error || 'File validation failed',
        timestamp: new Date(),
        isRecoverable: false,
      });
      return;
    }

    // Show warnings if any
    if (validation.warnings) {
      console.warn('File validation warnings:', validation.warnings);
    }

    // Create file previews
    const newPreviews: FilePreview[] = fileArray.map((file) => ({
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file,
      status: 'pending',
      progress: 0,
    }));

    setSelectedFiles(prev => {
      const updated = [...prev, ...newPreviews];
      // Limit to maxFiles
      return updated.slice(0, maxFiles);
    });
    
    // Trigger file selection callback
    onFilesSelected(fileArray);
  }, [onFilesSelected, onError, maxFiles]);

  // File input change handler
  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelection]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      setIsDragOver(false);
      dragCounterRef.current = 0;
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounterRef.current = 0;

    const { files } = e.dataTransfer;
    if (files && files.length > 0) {
      handleFileSelection(files);
    }
  }, [handleFileSelection]);

  // Remove file from selection
  const removeFile = useCallback((fileId: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  // Clear all files
  const clearAllFiles = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  // Update file status (for external progress updates)
  // This will be used when we integrate with the upload service
  // const updateFileStatus = useCallback((fileId: string, status: FilePreview['status'], progress: number = 0, error?: string) => {
  //   setSelectedFiles(prev => prev.map(f => 
  //     f.id === fileId 
  //       ? { ...f, status, progress, error }
  //       : f
  //   ));
  // }, []);

  // Expose update function via ref or callback
  useEffect(() => {
    if (!uploadProgressMap) {
      return;
    }

    const progressEntries = Array.from(uploadProgressMap.values());
    const matchedIds = new Set<string>();

    setSelectedFiles(prev => prev.map(filePreview => {
      let progressEntry: UploadProgress | undefined;

      if (filePreview.uploadId && uploadProgressMap.has(filePreview.uploadId)) {
        progressEntry = uploadProgressMap.get(filePreview.uploadId);
      } else {
        progressEntry = progressEntries.find(entry => {
          const alreadyUsed = matchedIds.has(entry.fileId);
          const nameMatches = entry.fileName === filePreview.file.name;
          return !alreadyUsed && nameMatches;
        });
      }

      if (!progressEntry) {
        return filePreview;
      }

      matchedIds.add(progressEntry.fileId);

      const mappedStatus = ['ready'].includes(progressEntry.status)
        ? 'success'
        : progressEntry.status === 'error'
          ? 'error'
          : 'uploading';

      return {
        ...filePreview,
        uploadId: progressEntry.fileId,
        status: mappedStatus,
        progress: progressEntry.progress,
        error: progressEntry.error,
      };
    }));

    if (onUploadProgress) {
      onUploadProgress(uploadProgressMap);
    }
  }, [uploadProgressMap, onUploadProgress]);

  // Click to browse files
  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Get supported formats text
  const getSupportedFormatsText = () => {
    return DOCUMENT_CONSTANTS.SUPPORTED_TYPES.map(type => type.toUpperCase()).join(', ');
  };

  return (
    <div className={`document-upload ${className}`}>
      {/* Main Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${isDragOver
            ? 'border-blue-500 bg-blue-50 scale-[1.02]'
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={!disabled ? handleBrowseClick : undefined}
      >
        {/* Upload Icon */}
        <div className="flex flex-col items-center space-y-4">
          <div className={`
            p-4 rounded-full transition-colors
            ${isDragOver ? 'bg-blue-100' : 'bg-gray-100'}
          `}>
            <Upload className={`w-8 h-8 ${isDragOver ? 'text-blue-600' : 'text-gray-600'}`} />
          </div>

          {/* Main Text */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isDragOver ? 'Drop files here' : 'Upload Documents'}
            </h3>
            <p className="text-gray-600 mb-1">
              Drag & drop files here or{' '}
              <button 
                type="button"
                className="text-blue-600 hover:text-blue-800 underline"
                onClick={handleBrowseClick}
                disabled={disabled}
              >
                browse
              </button>
            </p>
            <p className="text-sm text-gray-500">
              Supports: {getSupportedFormatsText()}
            </p>
            <p className="text-sm text-gray-500">
              Max {maxFiles} files, {formatFileSize(maxSize)} each
            </p>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={DOCUMENT_CONSTANTS.SUPPORTED_TYPES.map(type => `.${type}`).join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* File Previews */}
      {selectedFiles.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-medium text-gray-900">
              Selected Files ({selectedFiles.length})
            </h4>
            <button
              onClick={clearAllFiles}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-3">
            {selectedFiles.map((filePreview) => (
              <FilePreviewCard
                key={filePreview.id}
                filePreview={filePreview}
                onRemove={removeFile}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upload Summary */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Total files: {selectedFiles.length}</span>
              <span>
                Total size: {formatFileSize(
                  selectedFiles.reduce((sum, f) => sum + f.file.size, 0)
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// File Preview Card Component
interface FilePreviewCardProps {
  filePreview: FilePreview;
  onRemove: (fileId: string) => void;
}

function FilePreviewCard({ filePreview, onRemove }: FilePreviewCardProps) {
  const { id, file, status, progress, error } = filePreview;

  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <File className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'uploading':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'uploading':
        return `${progress}%`;
      case 'success':
        return 'Complete';
      case 'error':
        return 'Failed';
      case 'pending':
        return 'Waiting';
      default:
        return status;
    }
  };

  return (
    <div className={`flex items-center p-3 border rounded-lg ${getStatusColor()}`}>
      {/* File Icon */}
      <div className="flex-shrink-0 mr-3">
        <span className="text-2xl">{getFileIcon(file.name)}</span>
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900 truncate">
            {file.name}
          </p>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <button
              onClick={() => onRemove(id)}
              className="text-gray-400 hover:text-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-500">
            {formatFileSize(file.size)}
          </p>
          <p className="text-xs text-gray-500">
            {getStatusLabel()}
          </p>
        </div>

        {/* Progress Bar */}
        {status === 'uploading' && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div
                className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {status === 'error' && error && (
          <p className="text-xs text-red-600 mt-1">{error}</p>
        )}
      </div>
    </div>
  );
}