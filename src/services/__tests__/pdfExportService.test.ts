import { exportSearchResultsAsPdf, generatePdfData } from '../pdfExportService';
import type { SearchResults } from '../../types/document';

// Mock SearchResults object with proper typing
const mockResults: SearchResults = {
  query: 'budget',
  totalResults: 2,
  searchTime: 45,
  searchType: 'hybrid',
  filters: {
    dateRange: {
      start: new Date('2024-01-01'),
      end: new Date('2024-12-31')
    },
    sizeRange: {
      min: 10240,
      max: 1048576
    }
  },
  results: [
    { 
      relevanceScore: 87.234, 
      matchReason: 'content' as const,
      matchedSnippets: [],
      document: { 
        id: '1',
        originalFile: { 
          name: 'report1.pdf', 
          size: 102400, 
          type: 'application/pdf', 
          lastModified: Date.now(),
          extension: '.pdf',
          mimeType: 'application/pdf'
        }, 
        uploadedAt: new Date('2024-06-15'),
        processedAt: new Date('2024-06-15'),
        status: 'ready' as const,
        extractedText: 'test',
        summary: { 
          documentType: 'report' as const,
          title: 'Test Report',
          mainPoints: [],
          keyTopics: [],
          entities: [],
          confidence: 0.9
        }
      } 
    },
    { 
      relevanceScore: 65.1, 
      matchReason: 'title' as const,
      matchedSnippets: [],
      document: { 
        id: '2',
        originalFile: { 
          name: 'report2.docx', 
          size: 20480, 
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
          lastModified: Date.now(),
          extension: '.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }, 
        uploadedAt: new Date('2024-03-10'),
        processedAt: new Date('2024-03-10'),
        status: 'ready' as const,
        extractedText: 'test',
        summary: { 
          documentType: 'article' as const,
          title: 'Test Article',
          mainPoints: [],
          keyTopics: [],
          entities: [],
          confidence: 0.9
        }
      } 
    },
  ]
};

describe('pdfExportService (real PDF generation)', () => {
  it('generates structured data with all fields', () => {
    const data = generatePdfData(mockResults);
    expect(data.rows.length).toBe(2);
    expect(data.query).toBe('budget');
    expect(data.total).toBe(2);
    expect(data.searchTime).toBe(45);
    expect(data.title).toBe('Document Search Report');
  });

  it('includes filters in generated data when requested', () => {
    const data = generatePdfData(mockResults, { includeFilters: true });
    expect(data.filters).toBeDefined();
    expect(data.filters?.dateRange).toContain('2024');
    expect(data.filters?.sizeRange).toContain('KB');
  });

  it('excludes filters when not requested', () => {
    const data = generatePdfData(mockResults, { includeFilters: false });
    expect(data.filters).toBeUndefined();
  });

  it('creates a PDF blob with correct mime type', () => {
    const blob = exportSearchResultsAsPdf(mockResults);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('limits rows to maxRows option', () => {
    const data = generatePdfData(mockResults, { maxRows: 1 });
    expect(data.rows.length).toBe(1);
  });

  it('formats relevance scores to 1 decimal place', () => {
    const data = generatePdfData(mockResults);
    expect(data.rows[0].relevance).toBe('87.2');
    expect(data.rows[1].relevance).toBe('65.1');
  });

  it('formats file sizes in KB', () => {
    const data = generatePdfData(mockResults);
    expect(data.rows[0].sizeKB).toBe('100.0');
    expect(data.rows[1].sizeKB).toBe('20.0');
  });
});
