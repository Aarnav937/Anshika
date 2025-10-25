/**
 * ImageToImagePanel Component
 * Upload reference image and transform it with AI
 */

import { useState, useRef } from 'react';
import { Upload, X, Wand2, AlertCircle } from 'lucide-react';

export interface ImageToImageParams {
  referenceImage: File | null;
  referenceImageUrl: string | null;
  prompt: string;
  strength: number; // 0.0 - 1.0
  negativePrompt: string;
  seed: number;
}

interface ImageToImagePanelProps {
  onTransform: (params: ImageToImageParams) => Promise<void>;
  isTransforming: boolean;
}

export function ImageToImagePanel({ onTransform, isTransforming }: ImageToImagePanelProps) {
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [strength, setStrength] = useState(0.7); // Default 70% transformation
  const [negativePrompt, setNegativePrompt] = useState('');
  const [seed, setSeed] = useState<number>(-1);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(f => f.type.startsWith('image/'));
    
    if (imageFile) {
      handleImageSelect(imageFile);
    }
  };

  const handleImageSelect = (file: File) => {
    // Validate image
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPEG, WebP)');
      return;
    }

    // Check size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image too large. Maximum size is 10MB.');
      return;
    }

    // Create preview URL
    const url = URL.createObjectURL(file);
    
    // Clean up previous URL
    if (referenceImageUrl) {
      URL.revokeObjectURL(referenceImageUrl);
    }

    setReferenceImage(file);
    setReferenceImageUrl(url);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const clearReferenceImage = () => {
    if (referenceImageUrl) {
      URL.revokeObjectURL(referenceImageUrl);
    }
    setReferenceImage(null);
    setReferenceImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTransform = async () => {
    if (!referenceImage || !referenceImageUrl) {
      alert('Please upload a reference image first');
      return;
    }

    if (!prompt.trim()) {
      alert('Please enter a transformation prompt');
      return;
    }

    await onTransform({
      referenceImage,
      referenceImageUrl,
      prompt,
      strength,
      negativePrompt,
      seed: seed === -1 ? Math.floor(Math.random() * 1000000000) : seed
    });
  };

  const generateRandomSeed = () => {
    setSeed(Math.floor(Math.random() * 1000000000));
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">
          📸 Reference Image
        </label>
        
        {!referenceImageUrl ? (
          <div
            className={`border-3 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer bg-white ${
              dragActive
                ? 'border-purple-500 bg-purple-100'
                : 'border-gray-400 hover:border-purple-500 hover:bg-purple-50'
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-16 h-16 mx-auto text-purple-400 mb-4" />
            <p className="text-lg font-bold text-gray-800 mb-2">
              📤 Drop your image here or click to browse
            </p>
            <p className="text-sm text-gray-600 font-medium">
              Supports: PNG, JPEG, WebP • Max size: 10MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        ) : (
          <div className="relative border-2 border-gray-300 rounded-xl overflow-hidden">
            <img
              src={referenceImageUrl}
              alt="Reference"
              className="w-full h-auto max-h-96 object-contain bg-gray-100"
            />
            <button
              onClick={clearReferenceImage}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-lg"
              title="Remove image"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="absolute bottom-2 left-2 px-3 py-1 bg-black/70 text-white text-sm rounded-lg">
              {referenceImage && (
                <>
                  {(referenceImage.size / 1024 / 1024).toFixed(2)} MB •{' '}
                  {referenceImage.type.split('/')[1].toUpperCase()}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Transformation Prompt */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-800">
          ✨ Transformation Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe how you want to transform this image... (e.g., 'turn into a watercolor painting', 'make it look like a cyberpunk scene', 'convert to anime style')"
          className="w-full px-4 py-3 bg-white border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none text-gray-900 placeholder-gray-500"
          rows={4}
          disabled={isTransforming}
        />
        <p className="text-sm text-gray-600 font-medium">
          {prompt.length} / 500 characters
        </p>
      </div>

      {/* Strength Slider */}
      <div className="space-y-3 bg-white p-4 rounded-lg border-2 border-gray-300">
        <div className="flex justify-between items-center">
          <label className="text-sm font-bold text-gray-800">
            🎚️ Transformation Strength
          </label>
          <span className="text-xl font-bold text-purple-600 bg-purple-100 px-3 py-1 rounded-lg">
            {(strength * 100).toFixed(0)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={strength * 100}
          onChange={(e) => setStrength(parseInt(e.target.value) / 100)}
          className="w-full h-3 bg-gradient-to-r from-green-200 via-yellow-200 to-red-200 rounded-lg appearance-none cursor-pointer"
          style={{
            WebkitAppearance: 'none',
            appearance: 'none',
          }}
          disabled={isTransforming}
        />
        <div className="flex justify-between text-xs text-gray-700 font-medium">
          <span>🔒 Preserve (0%)</span>
          <span>🎨 Balanced (50%)</span>
          <span>🚀 Transform (100%)</span>
        </div>
        <div className="p-3 bg-blue-50 border-2 border-blue-300 rounded-lg">
          <p className="text-sm text-blue-900 font-medium">
            <strong className="text-blue-800">💡 Strength Guide:</strong>{' '}
            {strength < 0.3 && 'Subtle changes, preserves most details'}
            {strength >= 0.3 && strength < 0.6 && 'Balanced transformation'}
            {strength >= 0.6 && strength < 0.8 && 'Strong creative changes'}
            {strength >= 0.8 && 'Dramatic transformation'}
          </p>
        </div>
      </div>

      {/* Advanced Settings */}
      <details className="bg-white border-2 border-gray-400 rounded-lg p-4">
        <summary className="cursor-pointer font-bold text-gray-800 hover:text-purple-600 text-base">
          ⚙️ Advanced Settings
        </summary>
        <div className="mt-4 space-y-4">
          {/* Negative Prompt */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-800">
              🚫 Negative Prompt
            </label>
            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="Elements to avoid in transformation..."
              className="w-full px-4 py-2 bg-white border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none text-gray-900 placeholder-gray-500"
              rows={2}
              disabled={isTransforming}
            />
            <div className="flex gap-2 flex-wrap">
              {['blurry', 'distorted', 'low quality', 'artifacts'].map(tag => (
                <button
                  key={tag}
                  onClick={() => setNegativePrompt(prev => 
                    prev ? `${prev}, ${tag}` : tag
                  )}
                  className="px-3 py-1 text-xs font-semibold bg-gray-200 hover:bg-purple-200 hover:text-purple-700 rounded-lg transition-colors border border-gray-400"
                  disabled={isTransforming}
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Seed Control */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-800">
              🎲 Seed
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={seed === -1 ? '' : seed}
                onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : -1)}
                placeholder="Random (-1)"
                className="flex-1 px-4 py-2 bg-white border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                min="-1"
                max="999999999"
                disabled={isTransforming}
              />
              <button
                onClick={generateRandomSeed}
                className="px-4 py-2 bg-purple-500 text-white font-bold rounded-lg hover:bg-purple-600 transition-colors shadow-md hover:shadow-lg"
                disabled={isTransforming}
                title="Generate random seed"
              >
                🎲
              </button>
              <button
                onClick={() => setSeed(-1)}
                className="px-4 py-2 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition-colors shadow-md hover:shadow-lg"
                disabled={isTransforming}
                title="Clear seed"
              >
                🔄
              </button>
            </div>
          </div>
        </div>
      </details>

      {/* Info Box */}
      <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold mb-1">Image-to-Image Tips:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Lower strength (20-40%) for subtle style changes</li>
            <li>Medium strength (50-70%) for balanced transformations</li>
            <li>Higher strength (80-95%) for dramatic creative changes</li>
            <li>Use negative prompts to avoid unwanted elements</li>
          </ul>
        </div>
      </div>

      {/* Transform Button */}
      <button
        onClick={handleTransform}
        disabled={isTransforming || !referenceImage || !prompt.trim()}
        className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-lg font-semibold transition-all duration-200 hover:-translate-y-1 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
      >
        {isTransforming ? (
          <>
            <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ⏳ Transforming...
          </>
        ) : (
          <>
            <Wand2 className="w-6 h-6" />
            🎨 Transform Image
          </>
        )}
      </button>
    </div>
  );
}
