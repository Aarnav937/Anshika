/**
 * Document Illustration Panel Component
 * Task 2.9: Document Integration UI
 * 
 * Allows users to generate illustrations for documents,
 * extract key concepts, and create cover images.
 */

import React, { useState, useEffect } from 'react';
import { FileText, Image, Sparkles, Loader2, Check, X } from 'lucide-react';
import { ProcessedDocument } from '../types/document';
import { GeneratedImage } from '../types/imageGeneration';
import {
  DocumentConcept,
  IllustrationResult,
  CoverImageOptions,
  documentImageService,
} from '../services/image/documentImageService';

interface DocumentIllustrationPanelProps {
  document: ProcessedDocument;
  onImageGenerated?: (image: GeneratedImage, concept?: DocumentConcept) => void;
  onClose?: () => void;
}

type Tab = 'concepts' | 'cover' | 'sections';

export const DocumentIllustrationPanel: React.FC<DocumentIllustrationPanelProps> = ({
  document,
  onImageGenerated,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('concepts');
  const [concepts, setConcepts] = useState<DocumentConcept[]>([]);
  const [loadingConcepts, setLoadingConcepts] = useState<boolean>(false);
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());
  const [generatedResults, setGeneratedResults] = useState<Map<string, IllustrationResult>>(
    new Map()
  );

  // Cover image state
  const [coverStyle, setCoverStyle] = useState<'professional' | 'creative' | 'minimalist' | 'academic'>('professional');
  const [coverAspectRatio, setCoverAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3'>('16:9');
  const [generatingCover, setGeneratingCover] = useState<boolean>(false);
  const [coverImage, setCoverImage] = useState<GeneratedImage | null>(null);

  // Load concepts on mount
  useEffect(() => {
    loadConcepts();
  }, [document]);

  const loadConcepts = async () => {
    setLoadingConcepts(true);
    try {
      const extracted = await documentImageService.extractDocumentConcepts(document, 10);
      setConcepts(extracted);
    } catch (error) {
      console.error('Failed to extract concepts:', error);
    } finally {
      setLoadingConcepts(false);
    }
  };

  const handleGenerateConcept = async (concept: DocumentConcept) => {
    setGeneratingImages(prev => new Set(prev).add(concept.text));

    try {
      const result = await documentImageService.generateConceptIllustration({
        concept,
        aspectRatio: '16:9',
        style: 'professional',
      });

      setGeneratedResults(prev => new Map(prev).set(concept.text, result));

      if (result.success && onImageGenerated) {
        onImageGenerated(result.image, concept);
      }
    } catch (error) {
      console.error('Failed to generate illustration:', error);
    } finally {
      setGeneratingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(concept.text);
        return newSet;
      });
    }
  };

  const handleGenerateCover = async () => {
    if (!document.summary) {
      alert('Document must be analyzed first to generate a cover');
      return;
    }

    setGeneratingCover(true);

    try {
      const options: CoverImageOptions = {
        title: document.summary.title,
        documentType: document.summary.documentType,
        keyTopics: document.summary.keyTopics,
        style: coverStyle,
        aspectRatio: coverAspectRatio,
      };

      const image = await documentImageService.generateDocumentCover(options);
      setCoverImage(image);

      if (onImageGenerated) {
        onImageGenerated(image);
      }
    } catch (error) {
      console.error('Failed to generate cover:', error);
    } finally {
      setGeneratingCover(false);
    }
  };

  const ConceptsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {concepts.length} key concepts identified from document
        </p>
        <button
          onClick={loadConcepts}
          disabled={loadingConcepts}
          className="px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {loadingConcepts ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {loadingConcepts ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : concepts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No concepts found. Try analyzing the document first.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {concepts.map((concept, index) => {
            const isGenerating = generatingImages.has(concept.text);
            const result = generatedResults.get(concept.text);

            return (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                        {concept.type}
                      </span>
                      <span className="text-xs text-gray-500">
                        Importance: {Math.round(concept.importance * 100)}%
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                      {concept.text}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {concept.context}
                    </p>
                    <p className="text-xs text-gray-500 italic">
                      "{concept.suggestedPrompt}"
                    </p>
                  </div>

                  <button
                    onClick={() => handleGenerateConcept(concept)}
                    disabled={isGenerating || !!result}
                    className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : result ? (
                      result.success ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : (
                        <X className="w-5 h-5 text-red-400" />
                      )
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {result && result.success && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                    <img
                      src={result.image.url}
                      alt={concept.text}
                      className="w-full h-32 object-cover"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const CoverTab = () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Cover Style
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {(['professional', 'creative', 'minimalist', 'academic'] as const).map((style) => (
            <button
              key={style}
              onClick={() => setCoverStyle(style)}
              className={`px-4 py-3 rounded-lg border-2 transition-all capitalize ${
                coverStyle === style
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-600'
                  : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Aspect Ratio
        </h4>
        <div className="grid grid-cols-4 gap-2">
          {(['1:1', '16:9', '9:16', '4:3'] as const).map((ratio) => (
            <button
              key={ratio}
              onClick={() => setCoverAspectRatio(ratio)}
              className={`px-3 py-2 rounded-lg border-2 transition-all text-sm ${
                coverAspectRatio === ratio
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-600'
                  : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

      {document.summary && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Document Info
          </h4>
          <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
            <div><strong>Title:</strong> {document.summary.title}</div>
            <div><strong>Type:</strong> {document.summary.documentType}</div>
            <div><strong>Topics:</strong> {document.summary.keyTopics.join(', ')}</div>
          </div>
        </div>
      )}

      <button
        onClick={handleGenerateCover}
        disabled={generatingCover || !document.summary}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
      >
        {generatingCover ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating Cover...
          </>
        ) : (
          <>
            <Image className="w-5 h-5" />
            Generate Cover Image
          </>
        )}
      </button>

      {coverImage && (
        <div className="rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600">
          <img
            src={coverImage.url}
            alt="Document Cover"
            className="w-full object-cover"
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Document Illustration
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            ✕
          </button>
        )}
      </div>

      {/* Document name */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {document.originalFile.name}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('concepts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'concepts'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Key Concepts
        </button>
        <button
          onClick={() => setActiveTab('cover')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'cover'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Cover Image
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'concepts' && <ConceptsTab />}
        {activeTab === 'cover' && <CoverTab />}
      </div>
    </div>
  );
};

export default DocumentIllustrationPanel;
