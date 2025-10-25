import { 
  DocumentComparison, 
  ComparisonOptions, 
  ComparisonMetrics, 
  ComparisonSection, 
  SimilarityLevel, 
  ProcessedDocument,
  DocumentError 
} from '../../types/document';
import { createDocumentError } from '../../utils/fileValidation';

// Gemini API configuration
const MODEL_NAME = 'gemini-2.5-pro'; // Use pro model for complex comparisons
const GENERATE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;

function getApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!key) {
    throw createDocumentError(
      'GEMINI_API_ERROR',
      'Gemini API key is not configured. Add VITE_GEMINI_API_KEY to your environment to enable document comparison.',
    );
  }
  return key;
}

interface ComparisonAnalysis {
  textSimilarity: number;
  structuralSimilarity: number;
  semanticSimilarity: number;
  overallScore: number;
  confidenceLevel: SimilarityLevel;
  sections: ComparisonSection[];
  aiSummary: string;
  keyInsights: string[];
  recommendations: string[];
  relationshipType: 'identical' | 'similar' | 'related' | 'different' | 'contradictory';
  confidence: number;
}

/**
 * Compare two documents using AI-powered analysis
 */
export async function compareDocuments(
  document1: ProcessedDocument,
  document2: ProcessedDocument,
  options: ComparisonOptions = {}
): Promise<DocumentComparison> {
  console.log(`🔍 Starting comparison: ${document1.originalFile.name} vs ${document2.originalFile.name}`);
  
  const startTime = performance.now();
  const comparisonId = `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Validate documents have content
    if (!document1.extractedText || !document2.extractedText) {
      throw createDocumentError(
        'PROCESSING_FAILED',
        'Both documents must have extracted text content for comparison'
      );
    }

    // Perform AI-powered comparison analysis
    const analysis = await performAIComparison(document1, document2, options);
    
    const processingTime = performance.now() - startTime;
    
    const comparison: DocumentComparison = {
      id: comparisonId,
      document1Id: document1.id,
      document2Id: document2.id,
      comparisonType: options.detailLevel === 'comprehensive' ? 'full' : 'semantic',
      status: 'completed',
      createdAt: new Date(),
      completedAt: new Date(),
      processingTime: Math.round(processingTime),
      metrics: {
        textSimilarity: analysis.textSimilarity,
        structuralSimilarity: analysis.structuralSimilarity,
        semanticSimilarity: analysis.semanticSimilarity,
        overallScore: analysis.overallScore,
        confidenceLevel: analysis.confidenceLevel
      },
      sections: analysis.sections,
      aiSummary: analysis.aiSummary,
      keyInsights: analysis.keyInsights,
      recommendations: analysis.recommendations,
      relationshipType: analysis.relationshipType,
      modelUsed: 'pro',
      confidence: analysis.confidence
    };

    console.log(`✅ Comparison completed in ${processingTime.toFixed(1)}ms`);
    return comparison;

  } catch (error) {
    console.error('❌ Document comparison failed:', error);
    
    // Return fallback comparison on error
    return createFallbackComparison(
      comparisonId,
      document1,
      document2,
      options,
      error as Error
    );
  }
}

/**
 * Perform AI-powered document comparison using Gemini
 */
async function performAIComparison(
  doc1: ProcessedDocument,
  doc2: ProcessedDocument,
  options: ComparisonOptions
): Promise<ComparisonAnalysis> {
  const apiKey = getApiKey();
  
  // Build comprehensive comparison prompt
  const prompt = buildComparisonPrompt(doc1, doc2, options);
  
  // Prepare document content for analysis
  const doc1Content = truncateContent(doc1.extractedText!, 8000);
  const doc2Content = truncateContent(doc2.extractedText!, 8000);
  
  const requestBody = {
    contents: [{
      parts: [
        { text: prompt },
        { text: `\n=== DOCUMENT 1: ${doc1.originalFile.name} ===\n${doc1Content}` },
        { text: `\n=== DOCUMENT 2: ${doc2.originalFile.name} ===\n${doc2Content}` }
      ]
    }],
    generationConfig: {
      temperature: 0.2, // Low temperature for consistent analysis
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 3048,
      responseMimeType: 'text/plain',
    }
  };

  const response = await fetch(`${GENERATE_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Gemini API error:', response.status, errorText);
    throw createDocumentError(
      'GEMINI_API_ERROR',
      `Gemini API failed: ${response.status} - ${errorText}`
    );
  }

  const data = await response.json();
  const textResponse = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? '')
    .join('\n')
    .trim();

  if (!textResponse) {
    throw createDocumentError(
      'ANALYSIS_FAILED',
      'Empty response from Gemini API'
    );
  }

  return parseComparisonResponse(textResponse, doc1, doc2);
}

/**
 * Build detailed comparison prompt for Gemini
 */
function buildComparisonPrompt(
  doc1: ProcessedDocument,
  doc2: ProcessedDocument,
  options: ComparisonOptions
): string {
  return [
    'You are an expert document analyst. Compare these two documents and provide a comprehensive analysis.',
    'Analyze both content similarity and structural differences.',
    '',
    'Return your analysis in this EXACT JSON format:',
    '{',
    '  "textSimilarity": number (0-100),',
    '  "structuralSimilarity": number (0-100),',
    '  "semanticSimilarity": number (0-100),',
    '  "overallScore": number (0-100),',
    '  "confidenceLevel": "very-low" | "low" | "medium" | "high" | "very-high",',
    '  "sections": [',
    '    {',
    '      "sectionType": "similar" | "different" | "unique-to-doc1" | "unique-to-doc2",',
    '      "title": string,',
    '      "content": string,',
    '      "doc1Extract": string (optional),',
    '      "doc2Extract": string (optional),',
    '      "similarity": number (0-100),',
    '      "importance": "high" | "medium" | "low"',
    '    }',
    '  ],',
    '  "aiSummary": string,',
    '  "keyInsights": string[],',
    '  "recommendations": string[],',
    '  "relationshipType": "identical" | "similar" | "related" | "different" | "contradictory",',
    '  "confidence": number (0-1)',
    '}',
    '',
    'Analysis Guidelines:',
    '- Focus on both textual content and document structure',
    '- Identify key similarities and differences',
    '- Provide actionable insights about document relationships',
    '- Consider document types, purposes, and target audiences',
    '- Look for overlapping topics, contradictions, or complementary information',
    '',
    `Document 1 Info: "${doc1.originalFile.name}" (${doc1.summary?.documentType || 'unknown'} type, ${doc1.summary?.wordCount || 0} words)`,
    `Document 2 Info: "${doc2.originalFile.name}" (${doc2.summary?.documentType || 'unknown'} type, ${doc2.summary?.wordCount || 0} words)`,
    '',
    options.focusAreas?.length ? `Focus Areas: ${options.focusAreas.join(', ')}` : '',
    options.detailLevel ? `Detail Level: ${options.detailLevel}` : '',
    '',
    'Compare the following documents:'
  ].filter(Boolean).join('\n');
}

/**
 * Parse Gemini's comparison response
 */
function parseComparisonResponse(
  response: string,
  doc1: ProcessedDocument,
  doc2: ProcessedDocument
): ComparisonAnalysis {
  try {
    // Extract JSON from response
    const jsonStart = response.indexOf('{');
    const jsonEnd = response.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No JSON found in response');
    }
    
    const jsonStr = response.slice(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(jsonStr);
    
    // Validate and normalize the response
    return {
      textSimilarity: Math.max(0, Math.min(100, parsed.textSimilarity || 0)),
      structuralSimilarity: Math.max(0, Math.min(100, parsed.structuralSimilarity || 0)),
      semanticSimilarity: Math.max(0, Math.min(100, parsed.semanticSimilarity || 0)),
      overallScore: Math.max(0, Math.min(100, parsed.overallScore || 
        ((parsed.textSimilarity + parsed.structuralSimilarity + parsed.semanticSimilarity) / 3))),
      confidenceLevel: validateSimilarityLevel(parsed.confidenceLevel),
      sections: Array.isArray(parsed.sections) ? parsed.sections.map(validateSection) : [],
      aiSummary: typeof parsed.aiSummary === 'string' ? parsed.aiSummary : 
        `Comparison between "${doc1.originalFile.name}" and "${doc2.originalFile.name}"`,
      keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      relationshipType: validateRelationshipType(parsed.relationshipType),
      confidence: Math.max(0, Math.min(1, parsed.confidence || 0.7))
    };
    
  } catch (error) {
    console.error('❌ Failed to parse comparison response:', error);
    throw createDocumentError(
      'ANALYSIS_FAILED',
      'Failed to parse AI comparison response'
    );
  }
}

/**
 * Create fallback comparison when AI analysis fails
 */
function createFallbackComparison(
  comparisonId: string,
  doc1: ProcessedDocument,
  doc2: ProcessedDocument,
  _options: ComparisonOptions,
  error: Error
): DocumentComparison {
  console.log('🔄 Creating fallback comparison analysis');
  
  // Perform basic text-based comparison
  const basicMetrics = calculateBasicSimilarity(
    doc1.extractedText || '',
    doc2.extractedText || ''
  );
  
  const fallbackSections: ComparisonSection[] = [
    {
      sectionType: 'different',
      title: 'Basic Analysis Available',
      content: 'AI-powered comparison temporarily unavailable. Basic similarity metrics provided.',
      similarity: basicMetrics.textSimilarity,
      importance: 'high'
    }
  ];

  return {
    id: comparisonId,
    document1Id: doc1.id,
    document2Id: doc2.id,
    comparisonType: 'content',
    status: 'completed',
    createdAt: new Date(),
    completedAt: new Date(),
    processingTime: 0,
    metrics: basicMetrics,
    sections: fallbackSections,
    aiSummary: `Fallback comparison between "${doc1.originalFile.name}" and "${doc2.originalFile.name}". ${basicMetrics.overallScore > 70 ? 'Documents appear to be similar' : 'Documents appear to be different'} based on basic text analysis.`,
    keyInsights: [
      `Document 1: ${doc1.originalFile.name} (${doc1.summary?.wordCount || 0} words)`,
      `Document 2: ${doc2.originalFile.name} (${doc2.summary?.wordCount || 0} words)`,
      `Text similarity: ${basicMetrics.textSimilarity}%`,
      'Advanced AI analysis will be available when service is restored'
    ],
    recommendations: [
      'Try the comparison again when AI service is available',
      'Check individual document summaries for manual comparison',
      'Use the Q&A feature to explore specific aspects of each document'
    ],
    relationshipType: basicMetrics.overallScore > 80 ? 'similar' : 
                     basicMetrics.overallScore > 50 ? 'related' : 'different',
    modelUsed: 'pro',
    confidence: 0.6,
    error: createDocumentError(
      'ANALYSIS_FAILED',
      `AI comparison failed: ${error.message}`,
      error
    )
  };
}

/**
 * Calculate basic similarity metrics without AI
 */
function calculateBasicSimilarity(text1: string, text2: string): ComparisonMetrics {
  // Simple word-based similarity calculation
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  const jaccardSimilarity = union.size > 0 ? (intersection.size / union.size) * 100 : 0;
  
  // Length similarity
  const lengthSimilarity = Math.max(
    0,
    100 - Math.abs(text1.length - text2.length) / Math.max(text1.length, text2.length) * 100
  );
  
  const textSimilarity = Math.round(jaccardSimilarity);
  const structuralSimilarity = Math.round(lengthSimilarity);
  const semanticSimilarity = Math.round((textSimilarity + structuralSimilarity) / 2);
  const overallScore = Math.round((textSimilarity + structuralSimilarity + semanticSimilarity) / 3);
  
  return {
    textSimilarity,
    structuralSimilarity,
    semanticSimilarity,
    overallScore,
    confidenceLevel: overallScore > 80 ? 'high' : 
                     overallScore > 60 ? 'medium' : 
                     overallScore > 40 ? 'low' : 'very-low'
  };
}

/**
 * Utility functions for validation
 */
function validateSimilarityLevel(level: any): SimilarityLevel {
  const validLevels: SimilarityLevel[] = ['very-low', 'low', 'medium', 'high', 'very-high'];
  return validLevels.includes(level) ? level : 'medium';
}

function validateRelationshipType(type: any): 'identical' | 'similar' | 'related' | 'different' | 'contradictory' {
  const validTypes = ['identical', 'similar', 'related', 'different', 'contradictory'];
  return validTypes.includes(type) ? type : 'different';
}

function validateSection(section: any): ComparisonSection {
  return {
    sectionType: ['similar', 'different', 'unique-to-doc1', 'unique-to-doc2'].includes(section.sectionType) 
      ? section.sectionType : 'different',
    title: typeof section.title === 'string' ? section.title : 'Section',
    content: typeof section.content === 'string' ? section.content : '',
    doc1Extract: typeof section.doc1Extract === 'string' ? section.doc1Extract : undefined,
    doc2Extract: typeof section.doc2Extract === 'string' ? section.doc2Extract : undefined,
    similarity: Math.max(0, Math.min(100, section.similarity || 0)),
    importance: ['high', 'medium', 'low'].includes(section.importance) ? section.importance : 'medium'
  };
}

function truncateContent(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  const truncated = text.slice(0, maxChars);
  const lastSentence = truncated.lastIndexOf('. ');
  if (lastSentence > 0) {
    return `${truncated.slice(0, lastSentence + 1)}\n\n[Content truncated for analysis]`;
  }
  return `${truncated}\n\n[Content truncated for analysis]`;
}

/**
 * Get comparison progress for real-time updates
 */
export function getComparisonProgress(_comparisonId: string): { progress: number; stage: string } {
  // This would be enhanced with real progress tracking in a full implementation
  return {
    progress: 100,
    stage: 'completed'
  };
}

/**
 * Export error creation utility
 */
export function createComparisonError(message: string, details?: unknown): DocumentError {
  return createDocumentError('ANALYSIS_FAILED', message, details);
}
