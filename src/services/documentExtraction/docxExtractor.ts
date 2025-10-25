import mammoth from 'mammoth';

export interface DocxExtractionResult {
  text: string;
  warnings: string[];
}

export async function extractDocxText(blob: Blob): Promise<DocxExtractionResult> {
  const arrayBuffer = await blob.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });

  const warnings = (result.messages || [])
    .filter((message) => message.type === 'warning')
    .map((message) => message.message ?? 'Unknown DOCX warning');

  return {
    text: result.value ?? '',
    warnings,
  };
}
