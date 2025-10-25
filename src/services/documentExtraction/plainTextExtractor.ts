export interface PlainTextExtractionResult {
  text: string;
}

export async function extractPlainText(blob: Blob): Promise<PlainTextExtractionResult> {
  const text = await blob.text();
  return { text };
}
