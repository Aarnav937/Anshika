import { ProcessedDocument, DocumentSummary } from '../types/document';
import { formatFileSize, getFileIcon, getFileTypeDescription } from './fileValidation';

/**
 * Utility functions for document processing and management
 */

export function createEmptyDocument(file: File, overrides?: Partial<ProcessedDocument>): ProcessedDocument {
  return {
    id: overrides?.id ?? generateDocumentId(),
    originalFile: {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
      extension: getFileExtension(file.name),
      mimeType: file.type,
    },
    originalBlob: file,
    status: 'uploading',
    uploadedAt: new Date(),
    tags: [],
    retryCount: 0,
    isFavorite: false,
    ...overrides,
  };
}

export function generateDocumentId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return '';
  return fileName.slice(lastDot + 1).toLowerCase();
}

export function getDocumentDisplayName(document: ProcessedDocument): string {
  if (document.summary?.title) {
    return document.summary.title;
  }

  if (document.originalFile?.name) {
    return document.originalFile.name;
  }

  return document.id;
}

export function getDocumentDescription(document: ProcessedDocument): string {
  const { originalFile, summary } = document;
  const typeDesc = getFileTypeDescription(originalFile.name);
  const sizeDesc = formatFileSize(originalFile.size);
  
  if (summary?.mainPoints && summary.mainPoints.length > 0) {
    return `${typeDesc} (${sizeDesc}) - ${summary.mainPoints[0]}`;
  }
  
  return `${typeDesc} (${sizeDesc})`;
}

export function getDocumentStatusText(status: ProcessedDocument['status']): string {
  const statusMap = {
    queued: 'Queued',
    uploading: 'Uploading...',
    processing: 'Processing...',
    analyzing: 'Analyzing...',
    ready: 'Ready',
    error: 'Error',
  };
  
  return statusMap[status] || status;
}

export function getDocumentStatusColor(status: ProcessedDocument['status']): string {
  const colorMap = {
    queued: 'text-blue-500',
    uploading: 'text-blue-600',
    processing: 'text-orange-600',
    analyzing: 'text-purple-600',
    ready: 'text-green-600',
    error: 'text-red-600',
  };
  
  return colorMap[status] || 'text-gray-600';
}

export function isDocumentReady(document: ProcessedDocument): boolean {
  return document.status === 'ready' && !!document.geminiFileRef;
}

export function isDocumentProcessing(document: ProcessedDocument): boolean {
  return ['uploading', 'processing', 'analyzing'].includes(document.status);
}

export function canRetryDocument(document: ProcessedDocument): boolean {
  return document.status === 'error' && (document.retryCount || 0) < 3;
}

export function getDocumentThumbnail(document: ProcessedDocument): string {
  if (document.thumbnail) {
    return document.thumbnail;
  }
  
  // Return default icon based on file type
  return getFileIcon(document.originalFile.name);
}

export function extractTextPreview(document: ProcessedDocument, maxLength: number = 150): string {
  if (document.previewText) {
    return document.previewText.length > maxLength 
      ? document.previewText.substring(0, maxLength) + '...'
      : document.previewText;
  }
  
  if (document.summary?.mainPoints && document.summary.mainPoints.length > 0) {
    const preview = document.summary.mainPoints[0];
    return preview.length > maxLength 
      ? preview.substring(0, maxLength) + '...'
      : preview;
  }
  
  return 'No preview available';
}

export function getDocumentKeywords(document: ProcessedDocument): string[] {
  const keywords: string[] = [];
  
  // Add tags
  if (document.tags) {
    keywords.push(...document.tags);
  }
  
  // Add key topics from summary
  if (document.summary?.keyTopics) {
    keywords.push(...document.summary.keyTopics);
  }
  
  // Add document type
  if (document.summary?.documentType) {
    keywords.push(document.summary.documentType);
  }
  
  // Add file extension
  keywords.push(document.originalFile.extension);
  
  // Remove duplicates and return
  return [...new Set(keywords.map(k => k.toLowerCase()))];
}

export function searchDocuments(documents: ProcessedDocument[], query: string): ProcessedDocument[] {
  if (!query.trim()) {
    return documents;
  }
  
  const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
  
  return documents.filter(document => {
    const searchableText = [
      document.originalFile.name,
      document.summary?.title || '',
      document.summary?.mainPoints?.join(' ') || '',
      document.summary?.keyTopics?.join(' ') || '',
      document.previewText || '',
      document.notes || '',
      ...(document.tags || []),
    ].join(' ').toLowerCase();
    
    return searchTerms.some(term => searchableText.includes(term));
  });
}

export function sortDocuments(
  documents: ProcessedDocument[], 
  sortBy: 'name' | 'date' | 'size' | 'type' | 'status',
  order: 'asc' | 'desc' = 'desc'
): ProcessedDocument[] {
  return [...documents].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = getDocumentDisplayName(a).localeCompare(getDocumentDisplayName(b));
        break;
      case 'date':
        comparison = a.uploadedAt.getTime() - b.uploadedAt.getTime();
        break;
      case 'size':
        comparison = a.originalFile.size - b.originalFile.size;
        break;
      case 'type':
        comparison = a.originalFile.extension.localeCompare(b.originalFile.extension);
        break;
      case 'status':
        const statusOrder = ['error', 'uploading', 'processing', 'analyzing', 'ready'];
        comparison = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
        break;
    }
    
    return order === 'asc' ? comparison : -comparison;
  });
}

export function groupDocumentsByType(documents: ProcessedDocument[]): Record<string, ProcessedDocument[]> {
  return documents.reduce((groups, document) => {
    const type = document.summary?.documentType || 'unknown';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(document);
    return groups;
  }, {} as Record<string, ProcessedDocument[]>);
}

export function getDocumentStats(documents: ProcessedDocument[]): {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  totalSize: number;
  averageSize: number;
} {
  const stats = {
    total: documents.length,
    byStatus: {} as Record<string, number>,
    byType: {} as Record<string, number>,
    totalSize: 0,
    averageSize: 0,
  };
  
  documents.forEach(document => {
    // Count by status
    stats.byStatus[document.status] = (stats.byStatus[document.status] || 0) + 1;
    
    // Count by type
    const type = document.originalFile.extension;
    stats.byType[type] = (stats.byType[type] || 0) + 1;
    
    // Calculate sizes
    stats.totalSize += document.originalFile.size;
  });
  
  stats.averageSize = stats.total > 0 ? stats.totalSize / stats.total : 0;
  
  return stats;
}

export function createDocumentSummary(
  title: string,
  _content: string,
  analysis: any
): DocumentSummary {
  return {
    title: title || 'Untitled Document',
    mainPoints: analysis.mainPoints || [],
    keyTopics: analysis.keyTopics || [],
    documentType: analysis.documentType || 'unknown',
    entities: analysis.entities || [],
    wordCount: analysis.wordCount,
    pageCount: analysis.pageCount,
    language: analysis.language || 'en',
    confidence: analysis.confidence || 0.5,
  };
}

export function formatAnalysisDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

export function getProcessingProgress(document: ProcessedDocument): number {
  const statusProgress = {
    queued: 10,
    uploading: 25,
    processing: 50,
    analyzing: 75,
    ready: 100,
    error: 0,
  };
  
  return statusProgress[document.status] || 0;
}

export function estimateProcessingTime(document: ProcessedDocument): number {
  const baseTime = 30000; // 30 seconds base
  const sizeMultiplier = document.originalFile.size / (1024 * 1024); // MB
  const typeMultiplier = document.originalFile.extension === 'pdf' ? 1.5 : 1;
  
  return Math.round(baseTime * sizeMultiplier * typeMultiplier);
}

export function generateDocumentTags(document: ProcessedDocument): string[] {
  const tags: string[] = [];
  
  // Add type-based tags
  tags.push(document.originalFile.extension.toUpperCase());
  
  // Add size-based tags
  if (document.originalFile.size > 5 * 1024 * 1024) {
    tags.push('Large File');
  } else if (document.originalFile.size < 100 * 1024) {
    tags.push('Small File');
  }
  
  // Add analysis-based tags
  if (document.summary) {
    tags.push(...document.summary.keyTopics.slice(0, 3));
    tags.push(document.summary.documentType);
  }

  if (document.extractionDetails?.language) {
    tags.push(document.extractionDetails.language);
  }
  
  return [...new Set(tags)].slice(0, 5); // Limit to 5 unique tags
}

export function validateDocumentForQuery(document: ProcessedDocument): boolean {
  return document.status === 'ready' && !!document.geminiFileRef;
}

export function prepareDocumentContext(documents: ProcessedDocument[]): string {
  return documents
    .filter(validateDocumentForQuery)
    .map(doc => {
      const name = getDocumentDisplayName(doc);
      const preview = extractTextPreview(doc, 100);
      return `Document: ${name}\nPreview: ${preview}`;
    })
    .join('\n\n');
}

export function extractCitations(response: string, documents: ProcessedDocument[]): {
  text: string;
  documentId: string;
  documentName: string;
}[] {
  const citations: Array<{ text: string; documentId: string; documentName: string }> = [];
  
  // Look for document references in the response
  documents.forEach(document => {
    const docName = getDocumentDisplayName(document);
    
    // Simple citation extraction - look for document names in response
    if (response.toLowerCase().includes(docName.toLowerCase())) {
      citations.push({
        text: `Referenced in response`,
        documentId: document.id,
        documentName: docName,
      });
    }
  });
  
  return citations;
}

export function cleanupExpiredDocuments(documents: ProcessedDocument[], maxAge: number = 7 * 24 * 60 * 60 * 1000): string[] {
  const now = new Date().getTime();
  const expired = documents.filter(doc => {
    const age = now - doc.uploadedAt.getTime();
    return age > maxAge;
  });
  
  return expired.map(doc => doc.id);
}

export function exportDocumentData(document: ProcessedDocument): string {
  const exportData = {
    name: getDocumentDisplayName(document),
    uploadedAt: document.uploadedAt.toISOString(),
    type: getFileTypeDescription(document.originalFile.name),
    size: formatFileSize(document.originalFile.size),
    summary: document.summary,
    analysis: document.analysis,
    tags: document.tags,
    notes: document.notes,
  };
  
  return JSON.stringify(exportData, null, 2);
}

export function generateDocumentReport(documents: ProcessedDocument[]): string {
  const stats = getDocumentStats(documents);
  const ready = documents.filter(d => d.status === 'ready');
  
  let report = `# Document Library Report\n\n`;
  report += `**Generated:** ${new Date().toLocaleString()}\n\n`;
  report += `## Summary\n`;
  report += `- Total Documents: ${stats.total}\n`;
  report += `- Ready Documents: ${ready.length}\n`;
  report += `- Total Size: ${formatFileSize(stats.totalSize)}\n`;
  report += `- Average Size: ${formatFileSize(stats.averageSize)}\n\n`;
  
  report += `## By Type\n`;
  Object.entries(stats.byType).forEach(([type, count]) => {
    report += `- ${type.toUpperCase()}: ${count}\n`;
  });
  
  report += `\n## Documents\n`;
  ready.forEach((doc, index) => {
    report += `${index + 1}. **${getDocumentDisplayName(doc)}**\n`;
    if (doc.summary?.mainPoints && doc.summary.mainPoints.length > 0) {
      report += `   - ${doc.summary.mainPoints[0]}\n`;
    }
    report += `   - Type: ${getFileTypeDescription(doc.originalFile.name)}\n`;
    report += `   - Size: ${formatFileSize(doc.originalFile.size)}\n\n`;
  });
  
  return report;
}
