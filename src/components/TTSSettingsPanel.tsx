/**
 * 🎙️ TTS Settings Panel
 * ====================
 * Controls for Text-to-Speech:
 * - Enable/Disable auto-speak
 * - Playback speed control
 * - Pause/Resume/Stop controls
 * - Mute toggle
 * - Cache info
 */

import React, { useState, useEffect } from 'react';
import { Volume2, Settings, Palette, Mic, Loader2, Play } from 'lucide-react';
import { ttsService } from '../services/ttsService';

interface TTSSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TTSSettingsPanel: React.FC<TTSSettingsPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'voices' | 'controls' | 'style'>('voices');
  const [speakingRate, setSpeakingRate] = useState(1.0);
  const [useHighQuality, setUseHighQuality] = useState(true);
  const [useTurboMode, setUseTurboMode] = useState(false);
  const [pitch, setPitch] = useState(0.0);
  const [styleInstructions, setStyleInstructions] = useState('');

  // Voice options for the dropdown
  const voices = [
    { id: 'Puck', name: 'Puck (Playful, Friendly)' },
    { id: 'Charon', name: 'Charon (Deep, Serious)' },
    { id: 'Kore', name: 'Kore (Feminine, Warm)' },
    { id: 'Fenrir', name: 'Fenrir (Strong, Powerful)' },
    { id: 'Aoede', name: 'Aoede (Melodic, Pleasant)' },
    { id: 'Achernar', name: 'Achernar (Confident, Commanding)' },
  ];

  const [selectedVoice, setSelectedVoice] = useState<string>('Achernar');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [volume, setVolume] = useState(0);

  useEffect(() => {
    const config = ttsService.getConfig();
    setSpeakingRate(config.speakingRate);
    setUseHighQuality(config.useHighQuality);
    setPitch(config.pitch);
    setStyleInstructions(config.styleInstructions || '');
    setSelectedVoice(config.voiceName);
    setVolume(config.volumeGainDb);
    setUseTurboMode(config.useTurboMode || false);
  }, []);

  const handleSpeedChange = (value: number) => {
    setSpeakingRate(value);
    ttsService.updateConfig({ speakingRate: value });
  };

  const handleVoiceChange = (voice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede' | 'Achernar') => {
    setSelectedVoice(voice);
    ttsService.updateConfig({ voiceName: voice });
  };

  const handlePitchChange = (value: number) => {
    setPitch(value);
    ttsService.updateConfig({ pitch: value });
  };

  const handleVolumeChange = (value: number) => {
    setVolume(value);
    ttsService.updateConfig({ volumeGainDb: value });
  };

  const handleTurboModeChange = (enabled: boolean) => {
    setUseTurboMode(enabled);
    ttsService.updateConfig({ useTurboMode: enabled });
  };

  const handleStyleInstructionsChange = (instructions: string) => {
    setStyleInstructions(instructions);
    ttsService.updateConfig({ styleInstructions: instructions });
  };

  const handlePreviewVoice = async () => {
    setIsPreviewing(true);
    try {
      await ttsService.speak(`Hello! This is the ${selectedVoice} voice.`);
    } catch (error) {
      console.error('Voice preview failed:', error);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSave = () => {
    // All changes are already saved via individual handlers
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-20 pr-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-purple-400/30 w-96 max-h-[600px] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Volume2 className="w-6 h-6" />
            <h2 className="text-xl font-bold">TTS Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-purple-400/20 bg-gray-900/50">
          <button
            onClick={() => setActiveTab('voices')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium transition-all ${
              activeTab === 'voices'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                : 'text-gray-400 hover:text-gray-300 hover:bg-purple-500/5'
            }`}
          >
            <Mic className="w-4 h-4" />
            Voices
          </button>
          <button
            onClick={() => setActiveTab('controls')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium transition-all ${
              activeTab === 'controls'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                : 'text-gray-400 hover:text-gray-300 hover:bg-purple-500/5'
            }`}
          >
            <Settings className="w-4 h-4" />
            Controls
          </button>
          <button
            onClick={() => setActiveTab('style')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium transition-all ${
              activeTab === 'style'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                : 'text-gray-400 hover:text-gray-300 hover:bg-purple-500/5'
            }`}
          >
            <Palette className="w-4 h-4" />
            Style
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {activeTab === 'voices' && (
            <div className="space-y-6">
              {/* Voice Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Voice
                </label>
                <select
                  value={selectedVoice}
                  onChange={(e) => {
                    setSelectedVoice(e.target.value);
                    handleVoiceChange(e.target.value as any);
                  }}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                >
                  {voices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} {voice.id === 'Achernar' && '(Default)'}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Choose your preferred TTS voice
                </p>
              </div>

              {/* Voice Preview */}
              <div>
                <button
                  onClick={handlePreviewVoice}
                  disabled={isPreviewing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-xl transition-colors font-medium"
                >
                  {isPreviewing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Previewing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Preview Voice
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'controls' && (
            <div className="space-y-6">
              {/* Speaking Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Speaking Rate: {speakingRate}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={speakingRate}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>0.5x</span>
                  <span>2.0x</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Adjust speech speed
                </p>
              </div>

              {/* Pitch */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Pitch: {pitch}
                </label>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="1"
                  value={pitch}
                  onChange={(e) => handlePitchChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  disabled={useHighQuality}
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>-10</span>
                  <span>+10</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {useHighQuality ? 'Not available in Gemini mode' : 'Adjust voice pitch'}
                </p>
              </div>

              {/* Volume */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Volume: {volume}dB
                </label>
                <input
                  type="range"
                  min="-20"
                  max="10"
                  step="1"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  disabled={useHighQuality}
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>-20dB</span>
                  <span>+10dB</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {useHighQuality ? 'Not available in Gemini mode' : 'Adjust volume level'}
                </p>
              </div>

              {/* Turbo Mode Toggle */}
              {useHighQuality && (
                <div className="p-4 bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-lg border border-orange-400/20">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-200 flex items-center gap-2">
                        🚀 Turbo Mode (Faster Gemini TTS)
                        <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full border border-green-400/30">
                          FAST
                        </span>
                      </label>
                      <p className="text-xs text-gray-400 mt-1">
                        {useTurboMode 
                          ? '⚡ Smaller text chunks + aggressive caching (fastest)' 
                          : '🔄 Standard chunking with smart caching (balanced)'
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => handleTurboModeChange(!useTurboMode)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        useTurboMode ? 'bg-gradient-to-r from-orange-600 to-red-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          useTurboMode ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'style' && (
            <div className="space-y-6">
              {/* Style Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Style Instructions
                </label>
                <textarea
                  value={styleInstructions}
                  onChange={(e) => handleStyleInstructionsChange(e.target.value)}
                  placeholder="Enter custom style instructions for the voice (e.g., 'Speak in a calm, professional tone' or 'Use a cheerful, enthusiastic voice')"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                  rows={6}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Customize how the voice should sound and behave
                </p>
              </div>

              {/* Preset Styles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Quick Presets
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Professional and calm',
                    'Friendly and approachable',
                    'Enthusiastic and energetic',
                    'Authoritative and confident',
                    'Warm and reassuring',
                    'Clear and precise'
                  ].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleStyleInstructionsChange(preset)}
                      className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-purple-400/20 px-6 py-4 rounded-b-2xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
