import { FormEvent, useMemo, useState } from 'react';
import { MessageCircle, Send, Trash2, Sparkles } from 'lucide-react';
import type { ProcessedDocument, QueryResponse } from '../types/document';
import { askQuestion } from '../services/documentIntelligence/documentQaService';

interface DocumentQuestionPanelProps {
  document: ProcessedDocument | null;
  relatedDocuments: ProcessedDocument[];
}

interface QaMessage {
  question: string;
  response: QueryResponse;
}

export default function DocumentQuestionPanel({ document, relatedDocuments }: DocumentQuestionPanelProps) {
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<QaMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableDocuments = useMemo(() => {
    if (!document) {
      return [] as ProcessedDocument[];
    }

    // Include up to 3 ready documents for multi-document queries
    const others = relatedDocuments.filter((doc) => doc.id !== document.id && doc.status === 'ready');
    return [document, ...others.slice(0, 2)];
  }, [document, relatedDocuments]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!document || !question.trim()) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await askQuestion(question, availableDocuments);
      setHistory((prev) => [...prev, { question, response }]);
      setQuestion('');
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') {
        setError((err as { message: string }).message);
      } else {
        setError('Unable to answer question.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!document) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
        <MessageCircle className="mb-3 h-10 w-10 text-gray-400" />
        <p className="text-sm">Select a document to start asking questions.</p>
      </div>
    );
  }

  if (document.status !== 'ready') {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-blue-200 bg-blue-50 p-8 text-center text-blue-700">
        <Sparkles className="mb-3 h-8 w-8" />
        <p className="text-sm font-medium">This document is still processing.</p>
        <p className="text-xs text-blue-600">Once analysis completes, you can ask targeted questions here.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">Ask your document</h3>
          {availableDocuments.length > 1 && (
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
              {availableDocuments.length} docs
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">
          {availableDocuments.length > 1 
            ? `Ask questions across ${availableDocuments.length} documents. Gemini will synthesize information from all sources and provide citations.`
            : 'Ask focused questions about the document. Gemini will answer using the extracted content and cite sources when possible.'
          }
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-300"
            placeholder="Example: Summarize the main findings and highlight any risks."
            rows={3}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            disabled={isLoading || !question.trim()}
          >
            <Send className="h-3.5 w-3.5" />
            Ask
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </form>

      {history.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700">Q&A History</h4>
            <button
              onClick={() => setHistory([])}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
          <ul className="space-y-3 text-sm text-gray-700">
            {history.map((entry, index) => (
              <li key={`qa-${index}`} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="font-semibold text-gray-900">Q: {entry.question}</p>
                <p className="mt-2 text-gray-700">A: {entry.response.answer}</p>
                {entry.response.sources.length > 0 && (
                  <div className="mt-2 space-y-1 text-xs text-gray-500">
                    <p className="font-medium text-gray-600">Sources:</p>
                    {entry.response.sources.map((source, sourceIndex) => (
                      <p key={`source-${source.documentId}-${sourceIndex}`} className="rounded bg-white px-2 py-1">
                        {source.documentName}: {source.excerpt || 'Referenced section'}
                      </p>
                    ))}
                  </div>
                )}
                {entry.response.followUpSuggestions.length > 0 && (
                  <div className="mt-2 space-y-1 text-xs text-gray-500">
                    <p className="font-medium text-gray-600">Suggested follow-ups:</p>
                    {entry.response.followUpSuggestions.map((suggestion, suggestionIndex) => (
                      <button
                        key={`followup-${suggestionIndex}`}
                        className="block w-full rounded border border-blue-200 bg-white px-2 py-1 text-left text-blue-600 hover:bg-blue-50"
                        onClick={() => setQuestion(suggestion)}
                        type="button"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
