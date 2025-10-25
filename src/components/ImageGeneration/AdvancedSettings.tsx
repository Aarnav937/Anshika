/**
 * 🎛️ ADVANCED SETTINGS PANEL
 * Gemini-optimized settings for online image generation
 */

import React, { useState } from 'react';
import type { AspectRatio } from '../../types/imageGeneration';

interface AdvancedSettingsProps {
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  negativePrompt: string;
  onNegativePromptChange: (prompt: string) => void;
  enhancePrompt: boolean;
  onEnhancePromptChange: (enhance: boolean) => void;
  seed: number;
  onSeedChange: (seed: number) => void;
}

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  aspectRatio,
  onAspectRatioChange,
  negativePrompt,
  onNegativePromptChange,
  enhancePrompt,
  onEnhancePromptChange,
  seed,
  onSeedChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Quick negative prompt templates
  const negativeTemplates = [
    { name: 'General', prompt: 'lowres, error, cropped, worst quality, low quality, jpeg artifacts, out of frame, watermark, signature' },
    { name: 'Portrait', prompt: 'deformed, ugly, mutilated, disfigured, text, extra limbs, face cut, head cut, extra fingers, extra arms, poorly drawn face, mutation, bad proportions' },
    { name: 'Photo', prompt: 'illustration, painting, drawing, art, sketch, cartoon, anime' },
    { name: 'Custom', prompt: '' }
  ];

  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl border border-gray-700/50 backdrop-blur-sm">
      {/* Header - Click to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎛️</span>
          <div className="text-left">
            <h3 className="text-white font-semibold text-lg">Advanced Settings</h3>
            <p className="text-gray-400 text-sm">Fine-tune your image generation</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <svg
            className={`w-6 h-6 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Settings Panel */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-6 border-t border-gray-700/50 pt-6">
          {/* Prompt Enhancement Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-white font-medium flex items-center gap-2">
                <span className="text-xl">✨</span>
                Enhance Prompt Quality
              </label>
              <button
                onClick={() => onEnhancePromptChange(!enhancePrompt)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enhancePrompt ? 'bg-purple-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enhancePrompt ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-gray-400">
              {enhancePrompt ? (
                <>
                  ✅ <strong>Enhanced:</strong> Adds quality keywords like "highly detailed, sharp focus, masterpiece quality" to your prompt
                </>
              ) : (
                <>
                  ℹ️ <strong>Basic:</strong> Uses your prompt as-is without modifications
                </>
              )}
            </p>
          </div>

          {/* Resolution Info */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2 text-sm text-gray-300">
              <span className="text-lg">ℹ️</span>
              <div>
                <div className="font-semibold text-white mb-1">Resolution Note:</div>
                <div className="text-xs">
                  Gemini generates images at <strong>~1024x1024</strong> resolution. 
                  Use prompt enhancement for better quality results.
                </div>
              </div>
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-3">
            <label className="text-white font-medium flex items-center gap-2">
              <span className="text-xl">📐</span>
              Image Shape
            </label>
            <div className="grid grid-cols-4 gap-3">
              {[
                { ratio: '1:1' as AspectRatio, label: 'Square', icon: '⬜' },
                { ratio: '16:9' as AspectRatio, label: 'Wide', icon: '🖼️' },
                { ratio: '9:16' as AspectRatio, label: 'Tall', icon: '📱' },
                { ratio: '4:3' as AspectRatio, label: 'Classic', icon: '🖥️' }
              ].map((item) => {
                const isActive = aspectRatio === item.ratio;
                return (
                  <button
                    key={item.ratio}
                    onClick={() => onAspectRatioChange(item.ratio)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      isActive
                        ? 'border-blue-500 bg-blue-500/20 text-white'
                        : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <div className="text-xs font-semibold">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.ratio}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Negative Prompt (Both modes) */}
          <div className="space-y-3">
            <label className="text-white font-medium flex items-center gap-2">
              <span className="text-xl">🚫</span>
              What to Avoid (Negative Prompt)
            </label>
            <div className="flex gap-2 mb-2">
              {negativeTemplates.map((template) => (
                <button
                  key={template.name}
                  onClick={() => onNegativePromptChange(template.prompt)}
                  className="px-3 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm text-gray-300 transition-colors"
                >
                  {template.name}
                </button>
              ))}
            </div>
            <textarea
              value={negativePrompt}
              onChange={(e) => onNegativePromptChange(e.target.value)}
              placeholder="e.g., blurry, low quality, watermark..."
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
              rows={3}
            />
            <p className="text-xs text-gray-400">
              💡 Tip: Tell the AI what you DON'T want in your image
            </p>
          </div>

          {/* Seed Control */}
          <div className="space-y-3">
            <label className="text-white font-medium flex items-center gap-2">
              <span className="text-xl">🎲</span>
              Seed (Reproducibility)
            </label>
            <div className="flex gap-3">
              <input
                type="number"
                value={seed === -1 ? '' : seed}
                onChange={(e) => {
                  const val = e.target.value === '' ? -1 : parseInt(e.target.value);
                  if (val === -1 || (val >= 0 && val <= 999999999)) {
                    onSeedChange(val);
                  }
                }}
                placeholder="Random"
                className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
              <button
                onClick={() => onSeedChange(Math.floor(Math.random() * 999999999))}
                className="px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                🎲 Random
              </button>
              <button
                onClick={() => onSeedChange(-1)}
                className="px-4 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-all"
              >
                Clear
              </button>
            </div>
            <p className="text-xs text-gray-400">
              💡 Use the same seed to reproduce identical results. Leave empty for random generation.
            </p>
          </div>



          {/* Quick Tips for Gemini */}
          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div className="text-sm text-gray-300 space-y-1">
                <div className="font-semibold text-white mb-2">Pro Tips:</div>
                <div>• Be specific and descriptive (details matter!)</div>
                <div>• Enable prompt enhancement for better quality</div>
                <div>• Use negative prompts to avoid unwanted elements</div>
                <div>• Try different aspect ratios for different subjects</div>
                <div>• Include style keywords: "photorealistic", "artistic", "cinematic"</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
