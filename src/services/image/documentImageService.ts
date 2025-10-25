/**
 * Document-to-Image Service
 * Task 2.9: Document Integration
 * 
 * Extracts key concepts from documents and generates relevant images
 * for document illustration, section headers, and cover art.
 */

import { ProcessedDocument, DocumentSummary } from '../../types/document';
import { GeneratedImage, OnlineGenerationParams } from '../../types/imageGeneration';
import { getGeminiImageService } from './geminiImageService';

export interface DocumentConcept {
  text: string;
  type: 'main-topic' | 'section-header' | 'key-idea' | 'entity';
  importance: number; // 0-1
  context: string;
  suggestedPrompt: string;
  sectionTitle?: string;
  pageNumber?: number;
}

export interface IllustrationRequest {
  concept: DocumentConcept;
  style?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
  additionalContext?: string;
}

export interface IllustrationResult {
  concept: DocumentConcept;
  image: GeneratedImage;
  attachmentId: string;
  success: boolean;
  error?: string;
}

export interface CoverImageOptions {
  title: string;
  documentType: DocumentSummary['documentType'];
  keyTopics: string[];
  style?: 'professional' | 'creative' | 'minimalist' | 'academic';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
}

/**
 * Extract key concepts from a document for illustration
 */
export async function extractDocumentConcepts(
  document: ProcessedDocument,
  maxConcepts: number = 5
): Promise<DocumentConcept[]> {
  const concepts: DocumentConcept[] = [];

  try {
    // Use document summary if available
    if (document.summary) {
      const summary = document.summary;

      // Add main topics as high-priority concepts
      summary.keyTopics.forEach((topic, index) => {
        concepts.push({
          text: topic,
          type: 'main-topic',
          importance: 1.0 - (index * 0.1), // Decreasing importance
          context: `Main topic from ${document.originalFile.name}`,
          suggestedPrompt: generatePromptForConcept(topic, summary.documentType),
        });
      });

      // Add important entities
      const importantEntities = summary.entities
        .filter(e => e.confidence > 0.7)
        .slice(0, 3);

      importantEntities.forEach((entity, index) => {
        concepts.push({
          text: entity.text,
          type: 'entity',
          importance: 0.8 - (index * 0.1),
          context: `${entity.type} from document`,
          suggestedPrompt: generatePromptForEntity(entity.text, entity.type),
        });
      });
    }

    // If no summary, extract from text
    if (concepts.length === 0 && document.extractedText) {
      const textConcepts = extractConceptsFromText(document.extractedText, maxConcepts);
      concepts.push(...textConcepts);
    }

    // Sort by importance and limit
    return concepts
      .sort((a, b) => b.importance - a.importance)
      .slice(0, maxConcepts);
  } catch (error) {
    console.error('Failed to extract concepts:', error);
    return [];
  }
}

/**
 * Extract concepts from raw text using simple NLP
 */
function extractConceptsFromText(text: string, maxConcepts: number): DocumentConcept[] {
  const concepts: DocumentConcept[] = [];

  // Split into sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);

  // Extract noun phrases (simple approach)
  const nounPhrases = new Set<string>();
  
  sentences.slice(0, 50).forEach(sentence => {
    // Look for capitalized words and phrases
    const matches = sentence.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
    if (matches) {
      matches.forEach(match => {
        if (match.length > 3 && !commonWords.includes(match.toLowerCase())) {
          nounPhrases.add(match);
        }
      });
    }
  });

  // Convert to concepts
  Array.from(nounPhrases)
    .slice(0, maxConcepts)
    .forEach((phrase, index) => {
      concepts.push({
        text: phrase,
        type: 'key-idea',
        importance: 0.7 - (index * 0.05),
        context: 'Extracted from document text',
        suggestedPrompt: `Illustrative image representing "${phrase}" in a professional style`,
      });
    });

  return concepts;
}

/**
 * Generate prompt for a concept based on document type
 */
function generatePromptForConcept(
  concept: string,
  documentType: DocumentSummary['documentType']
): string {
  const styleMap: Record<DocumentSummary['documentType'], string> = {
    'report': 'professional infographic style, clean and corporate',
    'research': 'scientific illustration, detailed and academic',
    'presentation': 'modern presentation style, bold and clear',
    'article': 'editorial illustration, engaging and informative',
    'manual': 'technical diagram style, clear and instructional',
    'policy': 'formal documentation style, professional and structured',
    'letter': 'professional document style, clean and minimal',
    'spreadsheet': 'data visualization style, charts and graphs',
    'image': 'artistic interpretation, creative and expressive',
    'invoice': 'business document style, clean and organized',
    'unknown': 'professional illustration style, clear and informative',
  };

  const style = styleMap[documentType] || styleMap['unknown'];
  return `${concept}, ${style}, high quality, detailed`;
}

/**
 * Generate prompt for an entity
 */
function generatePromptForEntity(
  entity: string,
  type: string
): string {
  const typeMap: Record<string, string> = {
    'person': 'professional portrait style',
    'organization': 'corporate logo or building style',
    'location': 'geographic or architectural illustration',
    'date': 'timeline or calendar visualization',
    'money': 'financial chart or currency visualization',
    'percentage': 'data visualization or chart',
    'other': 'abstract concept visualization',
  };

  const style = typeMap[type] || typeMap['other'];
  return `${entity}, ${style}, professional and clean, high quality`;
}

/**
 * Generate image for a specific concept
 */
export async function generateConceptIllustration(
  request: IllustrationRequest
): Promise<IllustrationResult> {
  try {
    const params: OnlineGenerationParams = {
      prompt: request.additionalContext
        ? `${request.concept.suggestedPrompt}, ${request.additionalContext}`
        : request.concept.suggestedPrompt,
      aspectRatio: request.aspectRatio || '16:9',
      quality: 'hd',
      stylePreset: request.style,
      negativePrompt: 'text, watermark, signature, blurry, low quality',
    };

    const geminiService = getGeminiImageService();
    const image = await geminiService.generateImage(params);

    return {
      concept: request.concept,
      image,
      attachmentId: `doc-img-${Date.now()}`,
      success: true,
    };
  } catch (error) {
    return {
      concept: request.concept,
      image: {} as GeneratedImage,
      attachmentId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate cover image for document
 */
export async function generateDocumentCover(
  options: CoverImageOptions
): Promise<GeneratedImage> {
  const { title, documentType, keyTopics, style = 'professional', aspectRatio = '16:9' } = options;

  // Build comprehensive prompt
  let prompt = '';

  switch (style) {
    case 'professional':
      prompt = `Professional cover image for "${title}", ${documentType}, featuring ${keyTopics.join(', ')}, corporate style, clean layout, modern design, high quality`;
      break;
    case 'creative':
      prompt = `Creative and artistic cover for "${title}", abstract representation of ${keyTopics.join(', ')}, vibrant colors, innovative design, eye-catching`;
      break;
    case 'minimalist':
      prompt = `Minimalist cover design for "${title}", simple and elegant, ${keyTopics[0]}, clean white space, subtle colors, modern typography`;
      break;
    case 'academic':
      prompt = `Academic and scholarly cover for "${title}", ${documentType}, illustrating ${keyTopics.join(' and ')}, professional and authoritative, detailed`;
      break;
  }

  const params: OnlineGenerationParams = {
    prompt,
    aspectRatio,
    quality: 'hd',
    negativePrompt: 'text, watermark, signature, blurry, low quality, cluttered',
  };

  const geminiService = getGeminiImageService();
  return await geminiService.generateImage(params);
}

/**
 * Batch generate illustrations for multiple concepts
 */
export async function batchGenerateIllustrations(
  concepts: DocumentConcept[],
  options: {
    style?: string;
    aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
    maxConcurrent?: number;
  },
  onProgress?: (completed: number, total: number) => void
): Promise<IllustrationResult[]> {
  const results: IllustrationResult[] = [];
  const maxConcurrent = options.maxConcurrent || 1;

  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < concepts.length; i += maxConcurrent) {
    const batch = concepts.slice(i, i + maxConcurrent);
    
    const batchPromises = batch.map(concept =>
      generateConceptIllustration({
        concept,
        style: options.style,
        aspectRatio: options.aspectRatio,
      })
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    if (onProgress) {
      onProgress(results.length, concepts.length);
    }

    // Small delay between batches
    if (i + maxConcurrent < concepts.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Suggest section illustrations based on document structure
 */
export async function suggestSectionIllustrations(
  document: ProcessedDocument
): Promise<Array<{
  sectionTitle: string;
  suggestedConcept: DocumentConcept;
  priority: number;
}>> {
  const suggestions: Array<{
    sectionTitle: string;
    suggestedConcept: DocumentConcept;
    priority: number;
  }> = [];

  try {
    // If document has analysis with sections
    if (document.analysis && document.extractedText) {
      // Extract headings (simple approach - look for lines in ALL CAPS or starting with #)
      const lines = document.extractedText.split('\n');
      const headings = lines.filter(line => {
        const trimmed = line.trim();
        return (
          trimmed.length > 5 &&
          trimmed.length < 100 &&
          (trimmed === trimmed.toUpperCase() || trimmed.startsWith('#'))
        );
      });

      headings.slice(0, 5).forEach((heading, index) => {
        const cleanHeading = heading.replace(/^#+\s*/, '').trim();
        
        suggestions.push({
          sectionTitle: cleanHeading,
          suggestedConcept: {
            text: cleanHeading,
            type: 'section-header',
            importance: 0.8 - (index * 0.1),
            context: `Section from ${document.originalFile.name}`,
            suggestedPrompt: `Header illustration for "${cleanHeading}", professional and clean style, relevant to the topic`,
            sectionTitle: cleanHeading,
          },
          priority: 5 - index,
        });
      });
    }

    return suggestions.sort((a, b) => b.priority - a.priority);
  } catch (error) {
    console.error('Failed to suggest sections:', error);
    return [];
  }
}

// Common words to filter out
const commonWords = [
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her',
  'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how',
  'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did',
  'its', 'let', 'put', 'say', 'she', 'too', 'use', 'this', 'that', 'with',
  'have', 'from', 'they', 'will', 'what', 'been', 'each', 'which', 'their',
];

// Export service object
export const documentImageService = {
  extractDocumentConcepts,
  generateConceptIllustration,
  generateDocumentCover,
  batchGenerateIllustrations,
  suggestSectionIllustrations,
};
