/**
 * Advanced Image Editor Component
 * Main component that integrates all image editing functionality
 * Task 3.1 - Professional Image Editor & Inpainting
 */

import React, { useState } from 'react';
import { X, Wand2, Download, Loader, Settings, Palette } from 'lucide-react';
import { DrawingCanvas } from './DrawingCanvas';
import { BrushToolbar } from './BrushToolbar';
import { useImageEditor } from '../../hooks/imageGeneration/useImageEditor';
import { INPAINTING_PRESETS, EditorImage } from '../../types/imageEditor';
import { GeneratedImage } from '../../types/imageGeneration';

interface AdvancedImageEditorProps {
  image: GeneratedImage;
  onClose: () => void;
  onImageEdited?: (editedImage: GeneratedImage) => void;
}

export const AdvancedImageEditor: React.FC<AdvancedImageEditorProps> = ({
  image,
  onClose,
  onImageEdited,
}) => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [strength, setStrength] = useState(0.8);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Convert GeneratedImage to EditorImage
  const editorImage: EditorImage = {
    id: image.id,
    originalUrl: image.url,
    originalBlob: image.blob,
    width: image.metadata.resolution.width,
    height: image.metadata.resolution.height,
    aspectRatio: `${image.metadata.resolution.width}/${image.metadata.resolution.height}`,
  };

  const {
    editorState,
    tools,
    currentImage,
    resultImage,
    maskValid,
    maskArea,
    isInpainting,
    inpaintingProgress,
    loadImage,
    selectTool,
    updateBrush,
    updateEraser,
    handleMaskChange,
    startInpainting,
    getMaskPreview,
    undo,
    redo,
    clearMask,
    reset,
  } = useImageEditor(editorImage);

  // mark some possibly-optional functions as used to satisfy TypeScript unused warnings
  void updateEraser;
  void getMaskPreview;

  // Load image on mount
  React.useEffect(() => {
    loadImage(editorImage);
  }, [loadImage, editorImage]);

  // Apply preset settings
  const applyPreset = (presetName: string) => {
    const preset = INPAINTING_PRESETS.find(p => p.name === presetName);
    if (preset) {
      updateBrush({ size: preset.brushSize });
      setStrength(preset.strength);
      setNegativePrompt(preset.negativePrompt || '');
      setSelectedPreset(presetName);
    }
  };

  const handleInpaint = async () => {
    if (!prompt.trim()) return;

    const result = await startInpainting({
      prompt: prompt.trim(),
      negativePrompt: negativePrompt.trim() || undefined,
      strength,
    });

    if (result.success && result.imageBlob) {
      // Create new GeneratedImage with edited result (match ImageGeneration types)
      const editedImage: GeneratedImage = {
        id: `edited-${Date.now()}`,
        blob: result.imageBlob,
        url: result.imageUrl || '',
        metadata: {
          // preserve original metadata where possible
          ...image.metadata,
          prompt: prompt,
          negativePrompt: negativePrompt || image.metadata.negativePrompt,
          mode: image.metadata.mode,
          model: image.metadata.model,
          parameters: image.metadata.parameters,
          timestamp: new Date(),
          fileSize: result.imageBlob.size || 0,
          resolution: { width: editorImage.width, height: editorImage.height },
          generationTime: 0,
        },
      } as GeneratedImage;

      onImageEdited?.(editedImage);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;

    const a = document.createElement('a');
    a.href = resultImage;
    a.download = `edited-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full h-full max-w-7xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-900 to-blue-900 p-4 flex items-center justify-between border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Wand2 className="w-6 h-6" />
            Advanced Image Editor - Inpainting
          </h2>
          <div className="flex items-center gap-2">
            {maskValid && (
              <span className="text-green-400 text-sm">
                Mask: {maskArea.toFixed(1)}%
              </span>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Tools */}
          <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-3">Drawing Tools</h3>
              <BrushToolbar
                currentTool={tools.currentTool}
                brush={tools.brush}
                canUndo={editorState.canUndo}
                canRedo={editorState.canRedo}
                onToolChange={selectTool}
                onBrushChange={updateBrush}
                onUndo={undo}
                onRedo={redo}
                onClear={clearMask}
                onReset={reset}
              />
            </div>

            {/* Presets */}
            <div className="p-4 border-b border-gray-700 flex-1 overflow-y-auto">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Quick Presets
              </h3>
              <div className="space-y-2">
                {INPAINTING_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset.name)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedPreset === preset.name
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{preset.icon}</span>
                      <div>
                        <div className="font-medium">{preset.name}</div>
                        <div className="text-sm opacity-75">{preset.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Center - Canvas */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Canvas</h3>
                {editorState.isDrawing && (
                  <span className="text-red-400 text-sm animate-pulse">Drawing...</span>
                )}
              </div>
            </div>

            <div className="flex-1 p-4 flex items-center justify-center bg-gray-900">
              {currentImage ? (
                <DrawingCanvas
                  imageUrl={currentImage.originalUrl}
                  width={currentImage.width}
                  height={currentImage.height}
                  brush={tools.currentTool === 'brush' ? tools.brush : tools.eraser}
                  tool={tools.currentTool}
                  onMaskChange={handleMaskChange}
                  onDrawingStateChange={(isDrawing) => {
                    // Handle drawing state if needed (use param to avoid unused var)
                    void isDrawing;
                  }}
                />
              ) : (
                <div className="text-gray-400">Loading image...</div>
              )}
            </div>
          </div>

          {/* Right Sidebar - AI Settings & Results */}
          <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
            {resultImage ? (
              /* Results View */
              <div className="p-4 space-y-4 flex-1">
                <h3 className="text-lg font-semibold text-white">Edit Complete!</h3>

                <div className="space-y-4">
                  <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3">
                    <p className="text-green-200 font-medium">✅ Inpainting successful!</p>
                  </div>

                  {/* Before/After */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Original</p>
                      <img
                        src={currentImage?.originalUrl}
                        alt="Original"
                        className="w-full rounded-lg border border-gray-600"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Edited</p>
                      <img
                        src={resultImage}
                        alt="Edited"
                        className="w-full rounded-lg border border-green-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleDownload}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={reset}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition"
                    >
                      Edit Again
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Settings View */
              <div className="p-4 space-y-4 flex-1">
                <h3 className="text-lg font-semibold text-white">AI Inpainting</h3>

                {/* Prompt */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Prompt *
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what you want in the masked area..."
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>

                {/* Negative Prompt */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Negative Prompt
                  </label>
                  <input
                    type="text"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="What to avoid (optional)..."
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Strength */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-300">Strength</label>
                    <span className="text-sm text-gray-400">{Math.round(strength * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="1.0"
                    step="0.05"
                    value={strength}
                    onChange={(e) => setStrength(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Subtle</span>
                    <span>Bold</span>
                  </div>
                </div>

                {/* Progress */}
                {isInpainting && inpaintingProgress && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">{inpaintingProgress.message}</span>
                      <span className="text-sm text-blue-400">{inpaintingProgress.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${inpaintingProgress.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <button
                  onClick={handleInpaint}
                  disabled={!maskValid || !prompt.trim() || isInpainting}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  {isInpainting ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5" />
                      Apply Inpainting
                    </>
                  )}
                </button>

                {/* Tips */}
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                  <h4 className="font-semibold text-blue-200 mb-2">💡 Tips:</h4>
                  <ul className="text-sm text-blue-200 space-y-1">
                    <li>• Draw white mask over areas to change</li>
                    <li>• Use presets for common tasks</li>
                    <li>• Lower strength = subtle changes</li>
                    <li>• Higher strength = bold changes</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};