import { Lightbulb, BookText, Sparkles, AlertTriangle } from 'lucide-react';
import type { ProcessedDocument } from '../types/document';
import { formatAnalysisDate } from '../utils/documentUtils';

interface DocumentInsightsPanelProps {
  document: ProcessedDocument | null;
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
      <BookText className="mb-3 h-10 w-10 text-gray-400" />
      <p className="text-sm text-gray-500">Select a document to view its AI-generated insights.</p>
    </div>
  );
}

function LoadingState({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-blue-200 bg-blue-50 p-6 text-blue-700">
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 animate-pulse" />
          Analyzing {title}
        </div>
        <p className="text-sm">Hang tight—Gemini is generating a detailed summary and key insights.</p>
      </div>
      <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-blue-100">
        <div className="h-2 w-1/3 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-blue-400" />
      </div>
    </div>
  );
}

function InsightBadge({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
      {children}
    </span>
  );
}

function InsightList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) {
    return null;
  }

  return (
    <section>
      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        {title}
      </h4>
      <ul className="space-y-2 text-sm text-gray-700">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="rounded-lg bg-gray-50 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function DocumentInsightsPanel({ document }: DocumentInsightsPanelProps) {
  if (!document) {
    return <EmptyState />;
  }

  if (document.status === 'analyzing') {
    const title = document.summary?.title ?? document.originalFile.name ?? 'Document';
    return <LoadingState title={title} />;
  }

  if (document.status !== 'ready') {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
        <AlertTriangle className="mb-3 h-8 w-8" />
        <p className="text-sm font-medium">Analysis unavailable</p>
        <p className="text-xs text-amber-700">
          {document.error?.message ?? 'Resolve processing errors and retry this document to generate insights.'}
        </p>
      </div>
    );
  }

  const summary = document.analysis?.summary ?? document.summary;

  if (!summary) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-blue-200 bg-blue-50 p-6 text-center text-blue-700">
        <Sparkles className="mb-3 h-8 w-8" />
        <p className="text-sm font-medium">Summary pending</p>
        <p className="text-xs text-blue-600">
          This document is ready, but no AI summary was generated. Retry processing to produce insights.
        </p>
      </div>
    );
  }

  const analysis = document.analysis;

  return (
    <article className="flex h-full flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <header className="space-y-1">
        <h3 className="text-lg font-semibold text-gray-900">{summary.title}</h3>
        <p className="text-xs text-gray-500">
          Updated {document.analysis?.analysisDate ? formatAnalysisDate(document.analysis.analysisDate) : 'recently'}
        </p>
      </header>

      {summary.mainPoints && summary.mainPoints.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Summary</h4>
          <div className="space-y-2 text-sm text-gray-700">
            {summary.mainPoints.map((point, index) => (
              <p key={`main-point-${index}`} className="rounded-lg bg-gray-50 px-3 py-2">
                {point}
              </p>
            ))}
          </div>
        </section>
      )}

      {summary.keyTopics && summary.keyTopics.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Key Topics</h4>
          <div className="flex flex-wrap gap-2">
            {summary.keyTopics.slice(0, 8).map((topic, index) => (
              <InsightBadge key={`topic-${index}`}>{topic}</InsightBadge>
            ))}
          </div>
        </section>
      )}

      <InsightList title="Key Insights" items={analysis?.keyInsights ?? []} />

      {analysis?.recommendations && analysis.recommendations.length > 0 && (
        <InsightList title="Recommendations" items={analysis.recommendations} />
      )}

      {summary.entities && summary.entities.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Important Entities</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            {summary.entities.slice(0, 6).map((entity, index) => (
              <li key={`entity-${index}`} className="rounded-lg border border-gray-200 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{entity.text}</span>
                  <span className="text-xs uppercase tracking-wide text-gray-500">{entity.type}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
