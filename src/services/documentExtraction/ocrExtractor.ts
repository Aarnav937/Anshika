import { createDocumentError } from '../../utils/fileValidation';
import { DocumentError } from '../../types/document';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const GEMINI_OCR_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
const GEMINI_OCR_FALLBACK_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

export interface OcrExtractionResult {
  text: string;
  model: string;
  warnings: string[];
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        const base64 = result.split(',')[1] ?? '';
        resolve(base64);
      } else {
        reject(new Error('Failed to read blob as data URL'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to convert blob to base64'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Extract text from an already-uploaded Gemini file using its URI
 * This is more efficient than inline data for large images
 */
export async function extractTextWithGeminiFileRef(
  fileUri: string,
  mimeType: string,
  options: { signal?: AbortSignal } = {},
): Promise<OcrExtractionResult> {
  if (!GEMINI_API_KEY) {
    const error: DocumentError = createDocumentError(
      'GEMINI_API_ERROR',
      'Gemini API key is not configured. Upload an API key to enable OCR.',
    );
    throw error;
  }

  console.log('🔍 Extracting text from uploaded file reference:', fileUri);

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: 'Extract all readable text from this image. Return only the text content.' },
          {
            file_data: {
              mime_type: mimeType || 'image/png',
              file_uri: fileUri,
            },
          },
        ],
      },
    ],
  };

  const controller = new AbortController();
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  console.log('📡 Calling Gemini API with file reference (gemini-2.0-flash-exp)');
  const response = await fetch(`${GEMINI_OCR_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: controller.signal,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const rawDetail = await response.text();
    let detail: unknown = rawDetail;
    try {
      detail = JSON.parse(rawDetail);
    } catch (_err) {
      // ignore parse failures, keep raw detail text
    }

  let message = `Gemini OCR (file ref) failed: ${response.status} ${response.statusText}`;
    if (response.status === 404) {
      message = 'File not found. The uploaded file may have expired.';
    } else if (response.status === 401) {
      message = 'Gemini OCR rejected the request. Double-check that your API key is valid.';
    } else if (response.status === 400) {
      message = 'Gemini OCR request was malformed (400). File reference may be invalid.';
      console.error('OCR 400 error details:', detail);
    }

    // On 400, attempt one retry with fallback model and alternate payload ordering
    if (response.status === 400) {
      console.log('🔁 Retrying OCR (file ref) with same model (gemini-2.0-flash-exp)...');
      const altPayload = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                file_data: {
                  mime_type: mimeType || 'image/png',
                  file_uri: fileUri,
                },
              },
              { text: 'Extract all readable text from this image. Return only the text content.' },
            ],
          },
        ],
      };
      const retry = await fetch(`${GEMINI_OCR_FALLBACK_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(altPayload),
      });
      if (retry.ok) {
        const data = await retry.json();
        const text = data?.candidates?.[0]?.content?.parts
          ?.map((part: { text?: string }) => part.text ?? '')
          .join('\n')
          .trim();
        if (text) {
          console.log('✅ OCR retry (file ref) succeeded');
          return { text, model: 'gemini-2.0-flash-exp', warnings: ['Used retry'] };
        }
      } else {
        const t = await retry.text();
        console.warn('Fallback OCR (file ref) failed:', retry.status, t);
      }
    }
    const error: DocumentError = createDocumentError('GEMINI_API_ERROR', message, detail);
    throw error;
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? '')
    .join('\n')
    .trim();

  if (!text) {
    const error: DocumentError = createDocumentError(
      'OCR_FAILED',
      'Gemini OCR returned an empty response.',
      data,
    );
    throw error;
  }

  console.log(`✅ OCR extraction completed: ${text.length} characters extracted`);

  return {
    text,
    model: 'gemini-2.0-flash-exp',
    warnings: [],
  };
}

export async function extractTextWithGeminiOcr(
  file: File,
  options: { signal?: AbortSignal } = {},
): Promise<OcrExtractionResult> {
  if (!GEMINI_API_KEY) {
    const error: DocumentError = createDocumentError(
      'GEMINI_API_ERROR',
      'Gemini API key is not configured. Upload an API key to enable OCR.',
    );
    throw error;
  }

  console.log('🔍 Starting inline OCR extraction...');
  const base64 = await blobToBase64(file);

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: 'Extract all readable text from this image. Return only the text content.' },
          {
            inline_data: {
              mime_type: file.type || 'image/png',
              data: base64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      topK: 1,
      topP: 1,
      maxOutputTokens: 8192,
    }
  };

  const controller = new AbortController();
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  console.log('📡 Calling Gemini API with inline data (gemini-2.0-flash-exp)');
  const response = await fetch(`${GEMINI_OCR_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    },
    signal: controller.signal,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const rawDetail = await response.text();
    let detail: unknown = rawDetail;
    try {
      detail = JSON.parse(rawDetail);
    } catch (_err) {
      // ignore parse failures, keep raw detail text
    }

  let message = `Gemini OCR failed: ${response.status} ${response.statusText}`;
    if (response.status === 404) {
      message =
        'Gemini OCR endpoint returned 404. Confirm the Generative Language API is enabled for this API key and the model name is available in your project.';
    } else if (response.status === 401) {
      message = 'Gemini OCR rejected the request. Double-check that your API key is valid and has access to the Generative Language API.';
    } else if (response.status === 400) {
      message = 'Gemini OCR request was malformed (400). This may be due to invalid image format or API changes.';
      console.error('OCR 400 error details:', detail);
    }

    // On 400, retry with fallback model and alternate parts order
    if (response.status === 400) {
      console.log('🔁 Retrying OCR (inline) with same model (gemini-2.0-flash-exp)...');
      const altPayload = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                inline_data: {
                  mime_type: file.type || 'image/png',
                  data: base64,
                },
              },
              { text: 'Extract all readable text from this image. Return only the text content.' },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 8192,
        }
      };
      const retry = await fetch(`${GEMINI_OCR_FALLBACK_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
        body: JSON.stringify(altPayload),
      });
      if (retry.ok) {
        const data = await retry.json();
        const text = data?.candidates?.[0]?.content?.parts
          ?.map((part: { text?: string }) => part.text ?? '')
          .join('\n')
          .trim();
        if (text) {
          console.log('✅ OCR retry (inline) succeeded');
          return { text, model: 'gemini-2.0-flash-exp', warnings: ['Used retry'] };
        }
      } else {
        const t = await retry.text();
        console.warn('Fallback OCR (inline) failed:', retry.status, t);
      }
    }
    const error: DocumentError = createDocumentError('GEMINI_API_ERROR', message, detail);
    throw error;
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? '')
    .join('\n')
    .trim();

  if (!text) {
    const error: DocumentError = createDocumentError(
      'OCR_FAILED',
      'Gemini OCR returned an empty response.',
      data,
    );
    throw error;
  }

  return {
    text,
model: 'gemini-2.0-flash-exp',
    warnings: [],
  };
}
