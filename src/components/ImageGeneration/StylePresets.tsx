/**
 * Style Presets Component
 * Quick-apply style presets to prompts
 */

import React, { useState } from 'react';
import { Palette } from 'lucide-react';

interface StylePreset {
  id: string;
  name: string;
  emoji: string;
  description: string;
  promptAddition: string;
  negativePrompt: string;
}

const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'photorealistic',
    name: 'Photorealistic',
    emoji: '📷',
    description: 'Ultra-realistic photography style',
    promptAddition: 'photorealistic, professional photography, DSLR, 8k, high resolution, realistic lighting, detailed textures',
    negativePrompt: 'illustration, painting, drawing, art, sketch, cartoon, anime, unrealistic'
  },
  {
    id: 'digital-art',
    name: 'Digital Art',
    emoji: '🎨',
    description: 'Modern digital artwork',
    promptAddition: 'digital art, concept art, trending on artstation, highly detailed, vibrant colors, professional illustration',
    negativePrompt: 'photograph, photo, realistic, 3d render'
  },
  {
    id: 'anime',
    name: 'Anime',
    emoji: '🌸',
    description: 'Anime/manga style',
    promptAddition: 'anime style, manga, cel shading, vibrant colors, japanese animation, Studio Ghibli style',
    negativePrompt: 'realistic, photograph, 3d, western cartoon'
  },
  {
    id: 'oil-painting',
    name: 'Oil Painting',
    emoji: '🖼️',
    description: 'Classical oil painting',
    promptAddition: 'oil painting, classical art, impressionist, brushstrokes, canvas texture, masterpiece',
    negativePrompt: 'photograph, digital, modern, 3d'
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    emoji: '💧',
    description: 'Soft watercolor art',
    promptAddition: 'watercolor painting, soft colors, flowing, artistic, delicate, hand-painted',
    negativePrompt: 'photograph, digital, sharp, harsh'
  },
  {
    id: 'sketch',
    name: 'Pencil Sketch',
    emoji: '✏️',
    description: 'Hand-drawn sketch',
    promptAddition: 'pencil sketch, hand-drawn, black and white, charcoal, artistic drawing',
    negativePrompt: 'color, photograph, digital, painted'
  },
  {
    id: '3d-render',
    name: '3D Render',
    emoji: '🎲',
    description: 'CGI 3D rendering',
    promptAddition: '3d render, octane render, blender, cinema 4d, ray tracing, high quality CGI',
    negativePrompt: 'photograph, 2d, flat, painting'
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    emoji: '🌃',
    description: 'Futuristic neon cyberpunk',
    promptAddition: 'cyberpunk style, neon lights, futuristic, sci-fi, blade runner aesthetic, dark and moody',
    negativePrompt: 'natural, pastoral, historical, medieval'
  },
  {
    id: 'fantasy',
    name: 'Fantasy',
    emoji: '🧙',
    description: 'Magical fantasy world',
    promptAddition: 'fantasy art, magical, ethereal, mystical, epic, dramatic lighting, Lord of the Rings style',
    negativePrompt: 'modern, realistic, contemporary, urban'
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    emoji: '⚪',
    description: 'Clean and simple',
    promptAddition: 'minimalist, simple, clean lines, modern design, geometric, negative space',
    negativePrompt: 'detailed, complex, busy, cluttered'
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    emoji: '🎬',
    description: 'Movie-quality lighting',
    promptAddition: 'cinematic lighting, film grain, anamorphic lens, dramatic, movie still, professional cinematography',
    negativePrompt: 'flat lighting, amateur, snapshot'
  },
  {
    id: 'pixel-art',
    name: 'Pixel Art',
    emoji: '🕹️',
    description: 'Retro 8-bit/16-bit style',
    promptAddition: 'pixel art, 8-bit, 16-bit, retro gaming, sprite art, isometric',
    negativePrompt: 'realistic, high resolution, smooth, modern'
  }
];

interface StylePresetsProps {
  onStyleSelect: (style: StylePreset) => void;
}

export const StylePresets: React.FC<StylePresetsProps> = ({ onStyleSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);

  const handleStyleClick = (style: StylePreset) => {
    setSelectedStyle(style.id);
    onStyleSelect(style);
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200/50">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-purple-100/50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-3">
          <Palette className="w-6 h-6 text-purple-600" />
          <div className="text-left">
            <h3 className="text-gray-800 font-semibold text-lg">Style Presets</h3>
            <p className="text-gray-600 text-sm">Quick-apply artistic styles</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {selectedStyle && (
            <span className="text-sm text-purple-600 font-medium">
              {STYLE_PRESETS.find(s => s.id === selectedStyle)?.name}
            </span>
          )}
          <svg
            className={`w-6 h-6 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Style Grid */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-purple-200/50 pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {STYLE_PRESETS.map((style) => (
              <button
                key={style.id}
                onClick={() => handleStyleClick(style)}
                className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                  selectedStyle === style.id
                    ? 'border-purple-500 bg-purple-100 shadow-lg'
                    : 'border-gray-300 bg-white hover:border-purple-300 hover:shadow-md'
                }`}
                title={style.description}
              >
                <div className="text-3xl mb-2">{style.emoji}</div>
                <div className="text-sm font-semibold text-gray-800">{style.name}</div>
                <div className="text-xs text-gray-600 mt-1 line-clamp-2">{style.description}</div>
              </button>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-gray-700">
              💡 <strong>Tip:</strong> Styles will enhance your prompt with specific keywords and adjust negative prompts automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
