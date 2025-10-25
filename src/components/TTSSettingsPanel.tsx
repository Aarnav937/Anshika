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
import { Volume2, VolumeX, Pause, Play, Square, Settings } from 'lucide-react';
import { ttsService, TTSState } from '../services/ttsService';

interface TTSSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  autoSpeakEnabled: boolean;
  onAutoSpeakToggle: (enabled: boolean) => void;
}

export const TTSSettingsPanel: React.FC<TTSSettingsPanelProps> = ({
  isOpen,
  onClose,
  autoSpeakEnabled,
  onAutoSpeakToggle,
}) => {
  const [ttsState, setTtsState] = useState<TTSState>(ttsService.getState());
  const [speakingRate, setSpeakingRate] = useState(1.0);
  const [voiceName, setVoiceName] = useState<'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede'>('Kore');
  const [useHighQuality, setUseHighQuality] = useState(true);
  const [cacheSize, setCacheSize] = useState(0);

  useEffect(() => {
    const config = ttsService.getConfig();
    setSpeakingRate(config.speakingRate);
    setVoiceName(config.voiceName);
    setUseHighQuality(config.useHighQuality);

    // Subscribe to state changes
    const unsubscribe = ttsService.onStateChange((state) => {
      setTtsState(state);
    });

    // Load cache size
    ttsService.getCacheSize().then(setCacheSize);

    return unsubscribe;
  }, []);

  const handleSpeedChange = (value: number) => {
    setSpeakingRate(value);
    ttsService.updateConfig({ speakingRate: value });
  };

  const handleVoiceChange = (voice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede') => {
    setVoiceName(voice);
    ttsService.updateConfig({ voiceName: voice });
  };

  const handleQualityToggle = (highQuality: boolean) => {
    setUseHighQuality(highQuality);
    ttsService.updateConfig({ useHighQuality: highQuality });
  };

  const handlePause = () => {
    if (ttsState.isPaused) {
      ttsService.resume();
    } else {
      ttsService.pause();
    }
  };

  const handleStop = () => {
    ttsService.stop();
  };

  const handleMuteToggle = () => {
    ttsService.toggleMute();
  };

  const handleClearCache = async () => {
    await ttsService.clearCache();
    setCacheSize(0);
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

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Banner */}
          {ttsState.usingFallback && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-400/30 rounded-lg p-3">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                ⚠️ <strong>Quota exceeded</strong> - Using Web Speech API fallback
              </p>
            </div>
          )}

          {/* Auto-Speak Toggle */}
          <div className="space-y-2">
            <label className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300 font-semibold">
                🤖 Auto-Speak AI Responses
              </span>
              <button
                onClick={() => onAutoSpeakToggle(!autoSpeakEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoSpeakEnabled ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoSpeakEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Automatically speak AI responses as they appear
            </p>
          </div>

          {/* TTS Quality Selection - Radio Button Style */}
          <div className="space-y-3 border-2 border-purple-300 dark:border-purple-600 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20">
            <div className="text-gray-700 dark:text-gray-300 font-semibold mb-3">
              🎙️ TTS Provider
            </div>

            {/* High Quality Option */}
            <label 
              className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                useHighQuality 
                  ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500' 
                  : 'bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:border-green-400'
              }`}
              onClick={() => handleQualityToggle(true)}
            >
              <div className="flex-shrink-0 mt-1">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  useHighQuality 
                    ? 'border-green-600 bg-green-600' 
                    : 'border-gray-400 dark:border-gray-500'
                }`}>
                  {useHighQuality && (
                    <div className="w-2.5 h-2.5 bg-white rounded-full" />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  ✨ High Quality TTS
                  {useHighQuality && <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">Active</span>}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  <strong>Gemini 2.5 Flash TTS</strong> - Ultra realistic, natural speech
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ⏱️ Slower generation (~3-5 seconds)
                </div>
              </div>
            </label>

            {/* Fast Option */}
            <label 
              className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                !useHighQuality 
                  ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500' 
                  : 'bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:border-blue-400'
              }`}
              onClick={() => handleQualityToggle(false)}
            >
              <div className="flex-shrink-0 mt-1">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  !useHighQuality 
                    ? 'border-blue-600 bg-blue-600' 
                    : 'border-gray-400 dark:border-gray-500'
                }`}>
                  {!useHighQuality && (
                    <div className="w-2.5 h-2.5 bg-white rounded-full" />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  ⚡ Fast TTS
                  {!useHighQuality && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Active</span>}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  <strong>Google Cloud Neural2-C</strong> - Fast, good quality
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  🚀 Instant generation (~0.5 seconds)
                </div>
              </div>
            </label>
          </div>

          {/* Voice Selection (only show for high quality) */}
          {useHighQuality && (
            <div className="space-y-2">
              <label className="text-gray-700 dark:text-gray-300 font-semibold flex items-center gap-2">
                🎤 AI Voice
              </label>
              <select
                value={voiceName}
                onChange={(e) => handleVoiceChange(e.target.value as any)}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-purple-300 dark:border-purple-600 rounded-lg text-gray-800 dark:text-gray-200 font-medium focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="Kore">✨ Kore (Feminine, Warm) - Recommended</option>
                <option value="Aoede">🎵 Aoede (Melodic, Pleasant)</option>
                <option value="Puck">😊 Puck (Playful, Friendly)</option>
                <option value="Charon">🎯 Charon (Deep, Serious)</option>
                <option value="Fenrir">💪 Fenrir (Strong, Confident)</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <span className="text-purple-500">⚡</span>
                Powered by Gemini 2.5 Flash TTS
              </p>
            </div>
          )}

          {/* Playback Controls */}
          <div className="space-y-3">
            <h3 className="text-gray-700 dark:text-gray-300 font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Playback Controls
            </h3>
            
            <div className="flex items-center gap-2">
              {/* Mute/Unmute */}
              <button
                onClick={handleMuteToggle}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
                  ttsState.isMuted
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-purple-500 hover:bg-purple-600 text-white'
                }`}
              >
                {ttsState.isMuted ? (
                  <>
                    <VolumeX className="w-5 h-5" />
                    Unmute
                  </>
                ) : (
                  <>
                    <Volume2 className="w-5 h-5" />
                    Mute
                  </>
                )}
              </button>

              {/* Pause/Resume */}
              <button
                onClick={handlePause}
                disabled={!ttsState.isSpeaking}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                {ttsState.isPaused ? (
                  <Play className="w-5 h-5" />
                ) : (
                  <Pause className="w-5 h-5" />
                )}
              </button>

              {/* Stop */}
              <button
                onClick={handleStop}
                disabled={!ttsState.isSpeaking}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all bg-red-500 hover:bg-red-600 text-white disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                <Square className="w-5 h-5" />
              </button>
            </div>

            {/* Current Status */}
            {ttsState.isSpeaking && (
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-400/30 rounded-lg p-3">
                <p className="text-sm text-purple-800 dark:text-purple-200 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-purple-600 rounded-full animate-pulse" />
                  {ttsState.isPaused ? 'Paused' : 'Speaking...'}
                </p>
                {ttsState.currentText && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                    "{ttsState.currentText.slice(0, 50)}..."
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Speed Control */}
          <div className="space-y-3">
            <label className="text-gray-700 dark:text-gray-300 font-semibold flex items-center justify-between">
              <span>🎚️ Speaking Speed</span>
              <span className="text-purple-600 dark:text-purple-400 font-mono">
                {speakingRate.toFixed(2)}x
              </span>
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={speakingRate}
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Slower (0.5x)</span>
              <span>Normal (1.0x)</span>
              <span>Faster (2.0x)</span>
            </div>
          </div>

          {/* Voice Info */}
          <div className="space-y-2">
            <h3 className="text-gray-700 dark:text-gray-300 font-semibold">
              🎤 Voice Configuration
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-1 text-sm">
              <p className="text-gray-600 dark:text-gray-400">
                <strong>Voice:</strong> US Female Neural2 (Most Natural)
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                <strong>Quality:</strong> Premium Neural2 AI Voice
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                <strong>Format:</strong> MP3 with SSML
              </p>
            </div>
          </div>

          {/* Cache Info */}
          <div className="space-y-2">
            <h3 className="text-gray-700 dark:text-gray-300 font-semibold">
              💾 Cache
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Cached audio clips: <strong>{cacheSize}</strong>
              </p>
              <button
                onClick={handleClearCache}
                className="w-full px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                Clear Cache
              </button>
            </div>
          </div>

          {/* Help Text */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-400/30 rounded-lg p-3">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              💡 <strong>Tip:</strong> Audio is cached to save API quota. If quota is exceeded, the system automatically falls back to Web Speech API.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
