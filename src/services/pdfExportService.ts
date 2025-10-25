/**
 * pdfExportService
 * Professional PDF export for document search results using jsPDF + autotable.
 * Generates formatted PDF reports with tables, metadata, and branding.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SearchResults } from '../types/document';

export interface PdfExportOptions {
  title?: string;
  includeTimestamp?: boolean;
  maxRows?: number; // safety limit
  includeFilters?: boolean;
}

export interface PdfData {
  title: string;
  includeTimestamp: boolean;
  createdAt: Date;
  query: string;
  total: number;
  searchTime: number;
  rows: Array<{
    name: string;
    type: string;
    sizeKB: string;
    relevance: string;
    uploaded: string;
  }>;
  filters?: {
    dateRange?: string;
    sizeRange?: string;
    documentTypes?: string;
  };
}

export function generatePdfData(results: SearchResults, options: PdfExportOptions = {}): PdfData {
  const { title = 'Document Search Report', includeTimestamp = true, maxRows = 500, includeFilters = true } = options;
  
  const rows = results.results.slice(0, maxRows).map(r => {
    const file = r.document.originalFile as any;
    const type = (r.document as any).documentType || r.document.summary?.documentType || 'unknown';
    return {
      name: file?.name || 'unknown',
      type,
      sizeKB: ((file?.size || 0) / 1024).toFixed(1),
      relevance: r.relevanceScore.toFixed(1),
      uploaded: new Date(r.document.uploadedAt).toLocaleDateString(),
    };
  });

  const filters = includeFilters ? {
    dateRange: results.filters.dateRange 
      ? `${results.filters.dateRange.start.toLocaleDateString()} - ${results.filters.dateRange.end.toLocaleDateString()}`
      : undefined,
    sizeRange: results.filters.sizeRange
      ? `${(results.filters.sizeRange.min / 1024).toFixed(0)}KB - ${(results.filters.sizeRange.max / 1024).toFixed(0)}KB`
      : undefined,
    documentTypes: results.filters.documentTypes?.join(', '),
  } : undefined;

  return { 
    title, 
    includeTimestamp, 
    createdAt: new Date(), 
    query: results.query, 
    total: results.totalResults,
    searchTime: results.searchTime,
    rows,
    filters
  };
}

/**
 * Generate professional PDF using jsPDF and autoTable
 */
export function exportSearchResultsAsPdf(results: SearchResults, options: PdfExportOptions = {}): Blob {
  const data = generatePdfData(results, options);
  
  // Create PDF document (A4 portrait)
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(data.title, 14, 22);
  
  let yPos = 32;
  
  // Add metadata
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  if (data.includeTimestamp) {
    doc.text(`Generated: ${data.createdAt.toLocaleString()}`, 14, yPos);
    yPos += 6;
  }
  
  doc.text(`Search Query: "${data.query}"`, 14, yPos);
  yPos += 6;
  doc.text(`Results: ${data.total} documents (showing ${data.rows.length})`, 14, yPos);
  yPos += 6;
  doc.text(`Search Time: ${data.searchTime}ms`, 14, yPos);
  yPos += 6;
  
  // Add filters if present
  if (data.filters) {
    const activeFilters: string[] = [];
    if (data.filters.dateRange) activeFilters.push(`Date: ${data.filters.dateRange}`);
    if (data.filters.sizeRange) activeFilters.push(`Size: ${data.filters.sizeRange}`);
    if (data.filters.documentTypes) activeFilters.push(`Types: ${data.filters.documentTypes}`);
    
    if (activeFilters.length > 0) {
      doc.setFont('helvetica', 'italic');
      doc.text(`Filters: ${activeFilters.join(' | ')}`, 14, yPos);
      yPos += 8;
    }
  }
  
  // Add table
  autoTable(doc, {
    startY: yPos,
    head: [['Document Name', 'Type', 'Size (KB)', 'Relevance', 'Uploaded']],
    body: data.rows.map(row => [row.name, row.type, row.sizeKB, row.relevance, row.uploaded]),
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246], // Blue-600
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251], // Gray-50
    },
    columnStyles: {
      0: { cellWidth: 60 }, // Document Name
      1: { cellWidth: 25 }, // Type
      2: { cellWidth: 20, halign: 'right' }, // Size
      3: { cellWidth: 20, halign: 'right' }, // Relevance
      4: { cellWidth: 30 }, // Uploaded
    },
    margin: { top: 10 },
  });
  
  // Add footer with page numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  // Convert to Blob
  return doc.output('blob');
}

export function downloadPdf(results: SearchResults, options: PdfExportOptions = {}) {
  const blob = exportSearchResultsAsPdf(results, options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `search-report-${Date.now()}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const pdfExportService = { exportSearchResultsAsPdf, downloadPdf, generatePdfData };
