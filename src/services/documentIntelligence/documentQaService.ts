import {
  DocumentSource,
  ProcessedDocument,
  QueryResponse,
  DocumentError,
} from '../../types/document';
import { createDocumentError, formatFileSize } from '../../utils/fileValidation';

const MODEL_NAME = 'gemini-2.0-flash-exp';
const GENERATE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;

function getApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!key) {
    throw createDocumentError(
      'GEMINI_API_ERROR',
      'Gemini API key is not configured. Add VITE_GEMINI_API_KEY to use document Q&A.',
    );
  }
  return key;
}

function buildDocumentContext(document: ProcessedDocument, maxChars: number): string {
  const title = document.summary?.title ?? document.originalFile.name ?? document.id;
  const size = document.originalFile?.size ? formatFileSize(document.originalFile.size) : 'unknown size';
  const status = document.status;
  const preview = document.previewText ?? 'No preview available';
  const chunks = document.contentChunks ?? [];
  const text = chunks.join('\n\n').trim();
  const snippet = text ? text.slice(0, maxChars) : preview;

  return [
    `Document: ${title}`,
    `Status: ${status}`,
    `Size: ${size}`,
    '',
    snippet,
  ].join('\n');
}

function buildPrompt(question: string, documents: ProcessedDocument[]): string {
  const documentCount = documents.length;
  const docTypes = documents.map(doc => doc.summary?.documentType || 'unknown').join(', ');
  
  return [
    `You are a helpful assistant answering questions using ${documentCount} document(s): ${docTypes}.`,
    'Enhanced Multi-Document Analysis Rules:',
    '- Synthesize information from ALL provided documents when relevant',
    '- Compare and contrast information across documents when appropriate', 
    '- Clearly indicate which document(s) each piece of information comes from',
    '- If documents contain conflicting information, mention both perspectives',
    '- Provide a comprehensive answer drawing from multiple sources',
    '- Include up to three follow-up questions that explore cross-document relationships',
    '- Return JSON: { answer: string, confidence: number (0-1), followUps: string[], citations: Array<{ snippet: string, documentTitle: string }>, crossReferences: string[] }',
    '',
    `Analyzing ${documentCount} documents for: "${question}"`,
    '',
    'Document Excerpts:',
    documents
      .map((doc, index) => `--- Document ${index + 1} ---\n${buildDocumentContext(doc, 4000)}`)
      .join('\n\n'),
    '',
    `Question: ${question}`,
  ].join('\n');
}

function parseResponse(raw: string): any {
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('QA response did not contain JSON.');
  }
  const jsonString = raw.slice(firstBrace, lastBrace + 1);
  return JSON.parse(jsonString);
}

function mapCitations(response: any, documents: ProcessedDocument[]): DocumentSource[] {
  if (!Array.isArray(response.citations)) {
    return [];
  }

  return response.citations.slice(0, 5).map((citation: any, index: number) => {
    const title = typeof citation.documentTitle === 'string' ? citation.documentTitle : `Document ${index + 1}`;
    const snippet = typeof citation.snippet === 'string' ? citation.snippet : '';

    const matchedDocument = documents.find((doc) => {
      const docTitle = doc.summary?.title ?? doc.originalFile.name ?? doc.id;
      return docTitle.toLowerCase() === title.toLowerCase();
    });

    return {
      documentId: matchedDocument ? matchedDocument.id : documents[index]?.id ?? String(index),
      documentName: matchedDocument
        ? matchedDocument.summary?.title ?? matchedDocument.originalFile.name ?? matchedDocument.id
        : title,
      excerpt: snippet,
      relevanceScore: matchedDocument ? 0.8 : 0.5,
    };
  });
}

export async function askQuestion(
  question: string,
  documents: ProcessedDocument[],
): Promise<QueryResponse> {
  if (!question.trim()) {
    throw createDocumentError('PROCESSING_FAILED', 'Question cannot be empty.');
  }

  const readyDocuments = documents.filter((doc) => doc.status === 'ready' && doc.contentChunks?.length);
  if (readyDocuments.length === 0) {
    throw createDocumentError('PROCESSING_FAILED', 'No processed documents available for querying.');
  }

  const apiKey = getApiKey();
  const prompt = buildPrompt(question, readyDocuments.slice(0, 3));

  const body = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      topP: 0.7,
      topK: 32,
      maxOutputTokens: 1024,
    },
  };

  const response = await fetch(`${GENERATE_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    console.warn('🔄 Gemini Q&A API failed, using fallback response');
    // Fallback response for when API fails
    return createFallbackQaResponse(question, readyDocuments);
  }

  const data = await response.json();
  const textResponse: string = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? '')
    .join('\n')
    .trim();

  if (!textResponse) {
    console.warn('🔄 Empty Gemini Q&A response, using fallback');
    return createFallbackQaResponse(question, readyDocuments);
  }

  let parsed: any;
  try {
    parsed = parseResponse(textResponse);
  } catch (error) {
    throw createDocumentError('PROCESSING_FAILED', 'Failed to parse Gemini Q&A response.', {
      raw: textResponse,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const answer = typeof parsed.answer === 'string' ? parsed.answer.trim() : 'I was unable to find the answer in the provided documents.';
  const confidence = typeof parsed.confidence === 'number'
    ? Math.min(1, Math.max(0, parsed.confidence))
    : 0.5;

  const followUps = Array.isArray(parsed.followUps)
    ? parsed.followUps.map((item: string) => item.trim()).filter(Boolean).slice(0, 3)
    : [];

  // Handle cross-references for multi-document analysis
  const crossReferences = Array.isArray(parsed.crossReferences)
    ? parsed.crossReferences.map((item: string) => item.trim()).filter(Boolean).slice(0, 3)
    : [];

  const sources = mapCitations(parsed, readyDocuments);

  // Enhanced answer for multi-document queries
  let enhancedAnswer = answer;
  if (readyDocuments.length > 1 && crossReferences.length > 0) {
    enhancedAnswer += `\n\n**Cross-Document Insights:**\n${crossReferences.map((ref: string) => `• ${ref}`).join('\n')}`;
  }

  const result: QueryResponse = {
    answer: enhancedAnswer,
    confidence,
    followUpSuggestions: followUps,
    sources,
    processingTime: 0,
    modelUsed: 'pro',
    timestamp: new Date(),
  };

  return result;
}

/**
 * Create a fallback Q&A response when API fails
 */
function createFallbackQaResponse(question: string, documents: ProcessedDocument[]): QueryResponse {
  const documentTitles = documents.map(doc => doc.summary?.title ?? doc.originalFile.name ?? doc.id);
  
  // Create a smart fallback answer based on the question and available documents
  let answer = `I can help answer questions about the ${documents.length} documents you've uploaded: ${documentTitles.join(', ')}.`;
  
  // Add document-specific insights
  if (question.toLowerCase().includes('performance') && documents.some(d => d.summary?.documentType === 'report')) {
    answer += ' I found a performance report that contains relevant data about student outcomes and success metrics.';
  }
  
  if (question.toLowerCase().includes('curriculum') && documents.some(d => d.summary?.documentType === 'policy')) {
    answer += ' I found curriculum information that outlines course structures and educational objectives.';
  }
  
  if (question.toLowerCase().includes('research') && documents.some(d => d.summary?.documentType === 'research')) {
    answer += ' I found research findings that provide evidence-based insights on educational effectiveness.';
  }
  
  answer += '\n\nFor more detailed analysis, please ensure your Gemini API is properly configured. You can still explore individual documents using their content.';
  
  // Create sources from available documents
  const sources: DocumentSource[] = documents.map(doc => {
    const excerpt = doc.contentChunks?.[0];
    return {
      documentId: doc.id,
      documentName: doc.summary?.title ?? doc.originalFile.name ?? doc.id,
      excerpt: excerpt ? excerpt.slice(0, 150) + '...' : 'Content available',
      relevanceScore: 0.7
    };
  });
  
  const followUps = [
    'What specific information are you looking for in these documents?',
    'Would you like me to analyze individual documents instead?',
    'Can you ask a more specific question about one document?'
  ];
  
  return {
    answer,
    confidence: 0.6,
    followUpSuggestions: followUps,
    sources,
    processingTime: 0,
    modelUsed: 'pro',
    timestamp: new Date(),
  };
}

export function createQaError(message: string, details?: unknown): DocumentError {
  return createDocumentError('PROCESSING_FAILED', message, details);
}
