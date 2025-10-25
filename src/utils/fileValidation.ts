import { ValidationResult, SupportedFileType, DocumentError, DOCUMENT_CONSTANTS, MIME_TYPE_MAP, ERROR_CODES } from '../types/document';

/**
 * Comprehensive file validation for document uploads
 * Validates type, size, and security constraints
 */

export function validateFile(file: File): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check file size
  if (file.size > DOCUMENT_CONSTANTS.MAX_FILE_SIZE) {
    errors.push(`File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(DOCUMENT_CONSTANTS.MAX_FILE_SIZE)})`);
  }

  // 2. Check file type by MIME type and extension
  const fileExtension = getFileExtension(file.name).toLowerCase() as SupportedFileType;
  const isValidExtension = DOCUMENT_CONSTANTS.SUPPORTED_TYPES.includes(fileExtension);
  
  if (!isValidExtension) {
    errors.push(`File type "${fileExtension}" is not supported. Supported types: ${DOCUMENT_CONSTANTS.SUPPORTED_TYPES.join(', ')}`);
  }

  // 3. Validate MIME type matches extension
  if (isValidExtension) {
    const expectedMimeTypes = MIME_TYPE_MAP[fileExtension];
    if (expectedMimeTypes && !expectedMimeTypes.includes(file.type)) {
      warnings.push(`File MIME type "${file.type}" doesn't match extension "${fileExtension}". This might indicate a renamed file.`);
    }
  }

  // 4. Check for potentially dangerous file names
  if (hasDangerousFileName(file.name)) {
    errors.push('File name contains potentially dangerous characters');
  }

  // 5. Check for empty files
  if (file.size === 0) {
    errors.push('File is empty');
  }

  // 6. Check for very large file names
  if (file.name.length > 255) {
    errors.push('File name is too long (maximum 255 characters)');
  }

  return {
    isValid: errors.length === 0,
    error: errors.length > 0 ? errors.join('; ') : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export function validateMultipleFiles(files: File[]): ValidationResult {
  if (files.length === 0) {
    return { isValid: false, error: 'No files selected' };
  }

  if (files.length > DOCUMENT_CONSTANTS.MAX_FILES) {
    return { 
      isValid: false, 
      error: `Too many files selected (${files.length}). Maximum allowed: ${DOCUMENT_CONSTANTS.MAX_FILES}` 
    };
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const maxTotalSize = DOCUMENT_CONSTANTS.MAX_FILE_SIZE * DOCUMENT_CONSTANTS.MAX_FILES;
  
  if (totalSize > maxTotalSize) {
    return {
      isValid: false,
      error: `Total file size (${formatFileSize(totalSize)}) exceeds maximum allowed (${formatFileSize(maxTotalSize)})`
    };
  }

  // Validate each file individually
  const fileErrors: string[] = [];
  const fileWarnings: string[] = [];

  files.forEach((file, index) => {
    const validation = validateFile(file);
    if (!validation.isValid && validation.error) {
      fileErrors.push(`File ${index + 1} (${file.name}): ${validation.error}`);
    }
    if (validation.warnings) {
      fileWarnings.push(...validation.warnings.map(w => `File ${index + 1} (${file.name}): ${w}`));
    }
  });

  return {
    isValid: fileErrors.length === 0,
    error: fileErrors.length > 0 ? fileErrors.join('\n') : undefined,
    warnings: fileWarnings.length > 0 ? fileWarnings : undefined,
  };
}

export function getSupportedFormats(): SupportedFileType[] {
  return [...DOCUMENT_CONSTANTS.SUPPORTED_TYPES];
}

export function getMaxFileSize(): number {
  return DOCUMENT_CONSTANTS.MAX_FILE_SIZE;
}

export function getMaxFiles(): number {
  return DOCUMENT_CONSTANTS.MAX_FILES;
}

export function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return '';
  return fileName.slice(lastDot + 1);
}

export function getFileIcon(fileName: string): string {
  const extension = getFileExtension(fileName).toLowerCase();
  
  switch (extension) {
    case 'pdf': return '📄';
    case 'docx': 
    case 'doc': return '📝';
    case 'txt': return '📄';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'webp': return '🖼️';
    case 'xlsx':
    case 'xls': return '📊';
    case 'pptx':
    case 'ppt': return '📊';
    default: return '📎';
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function sanitizeFileName(fileName: string): string {
  // Remove or replace dangerous characters
  return fileName
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Replace dangerous chars with underscore
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\.+$/, '') // Remove trailing dots
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 200); // Limit length
}

export function hasDangerousFileName(fileName: string): boolean {
  // Check for potentially dangerous patterns
  const dangerousPatterns = [
    /^\./,  // Hidden files
    /\.(exe|bat|cmd|com|scr|vbs|js|jar|app|deb|rpm)$/i, // Executable files
    /[<>:"/\\|?*\x00-\x1f]/, // Invalid characters
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Reserved Windows names
  ];

  return dangerousPatterns.some(pattern => pattern.test(fileName));
}

export function getMimeTypeFromExtension(extension: string): string | null {
  const ext = extension.toLowerCase() as SupportedFileType;
  const mimeTypes = MIME_TYPE_MAP[ext];
  return mimeTypes ? mimeTypes[0] : null;
}

export function isImageFile(fileName: string): boolean {
  const extension = getFileExtension(fileName).toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp'].includes(extension);
}

export function isDocumentFile(fileName: string): boolean {
  const extension = getFileExtension(fileName).toLowerCase();
  return ['pdf', 'docx', 'txt'].includes(extension);
}

export function createDocumentError(
  code: keyof typeof ERROR_CODES,
  message: string,
  details?: any
): DocumentError {
  return {
    code: ERROR_CODES[code],
    message,
    details,
    timestamp: new Date(),
    isRecoverable: ['NETWORK_ERROR', 'PROCESSING_FAILED'].includes(ERROR_CODES[code]),
  };
}

export function getFileTypeDescription(fileName: string): string {
  const extension = getFileExtension(fileName).toLowerCase();
  
  const descriptions: Record<string, string> = {
    pdf: 'PDF Document',
    docx: 'Word Document',
    doc: 'Word Document (Legacy)',
    txt: 'Text Document',
    jpg: 'JPEG Image',
    jpeg: 'JPEG Image',
    png: 'PNG Image',
    webp: 'WebP Image',
    xlsx: 'Excel Spreadsheet',
    xls: 'Excel Spreadsheet (Legacy)',
    pptx: 'PowerPoint Presentation',
    ppt: 'PowerPoint Presentation (Legacy)',
  };

  return descriptions[extension] || `${extension.toUpperCase()} File`;
}

/**
 * Advanced file validation using File API
 * Reads file headers to verify actual file type
 */
export async function validateFileHeader(file: File): Promise<ValidationResult> {
  try {
    // Read first few bytes to check file signature
    const buffer = await readFileBytes(file, 0, 16);
    const bytes = new Uint8Array(buffer);
    
    const fileSignature = detectFileSignature(bytes);
    const expectedExtension = getFileExtension(file.name).toLowerCase();
    
    if (fileSignature && fileSignature !== expectedExtension) {
      return {
        isValid: false,
        error: `File appears to be a ${fileSignature} file but has extension .${expectedExtension}. This might indicate a renamed or corrupted file.`
      };
    }

    return { isValid: true };
  } catch (error) {
    console.warn('Could not validate file header:', error);
    // Don't fail validation if we can't read headers
    return { isValid: true };
  }
}

function readFileBytes(file: File, start: number, end: number): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file.slice(start, end));
  });
}

function detectFileSignature(bytes: Uint8Array): string | null {
  // Common file signatures (magic numbers)
  const signatures: Array<{ signature: number[]; type: string }> = [
    { signature: [0x25, 0x50, 0x44, 0x46], type: 'pdf' }, // %PDF
    { signature: [0x50, 0x4B, 0x03, 0x04], type: 'docx' }, // ZIP (DOCX is ZIP-based)
    { signature: [0xFF, 0xD8, 0xFF], type: 'jpg' }, // JPEG
    { signature: [0x89, 0x50, 0x4E, 0x47], type: 'png' }, // PNG
    { signature: [0x52, 0x49, 0x46, 0x46], type: 'webp' }, // RIFF (WebP container)
  ];

  for (const { signature, type } of signatures) {
    if (signature.every((byte, index) => bytes[index] === byte)) {
      return type;
    }
  }

  return null;
}

/**
 * Generate a unique file ID for tracking uploads
 */
export function generateFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if file upload is likely to succeed based on browser capabilities
 */
export function checkBrowserCompatibility(): { 
  supported: boolean; 
  features: Record<string, boolean>;
  warnings: string[];
} {
  const features = {
    fileAPI: typeof File !== 'undefined' && typeof FileReader !== 'undefined',
    dragAndDrop: 'ondragstart' in document.createElement('div'),
    progressEvents: typeof ProgressEvent !== 'undefined',
    arrayBuffer: typeof ArrayBuffer !== 'undefined',
    fetch: typeof fetch !== 'undefined',
  };

  const warnings: string[] = [];
  
  if (!features.fileAPI) {
    warnings.push('File API not supported - file uploads may not work');
  }
  
  if (!features.dragAndDrop) {
    warnings.push('Drag and drop not supported - only file picker will be available');
  }

  if (!features.fetch) {
    warnings.push('Fetch API not supported - uploads may use fallback method');
  }

  return {
    supported: features.fileAPI && features.fetch,
    features,
    warnings,
  };
}
