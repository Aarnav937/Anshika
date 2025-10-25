/**
 * 🎙️ Voice Settings Panel
 * ========================
 * Unified settings panel for both Text-to-Speech (TTS) and Speech-to-Text (STT)
 */

import React, { useState } from 'react';
import { X, Volume2, Mic, Play, Pause, Square, Settings } from 'lucide-react';
import { useTTS } from '../contexts/TTSContext';
import { useSpeechRecognition } from '../contexts/SpeechRecognitionContext';

interface VoiceSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceSettingsPanel: React.FC<VoiceSettingsPanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'tts' | 'stt'>('tts');

  // TTS Context
  const { 
    ttsState, 
    autoSpeakEnabled, 
    useHighQualityTTS,
    setAutoSpeakEnabled,
    setUseHighQualityTTS,
    pause: ttsPause,
    resume: ttsResume,
    stop: ttsStop,
    toggleMute,
    updateSpeed,
  } = useTTS();

  // STT Context
  const {
    state: sttState,
    config: sttConfig,
    updateConfig: updateSttConfig,
    getAvailableLanguages,
    isSupported: sttSupported,
  } = useSpeechRecognition();

  const [ttsSpeed, setTtsSpeed] = useState(1.0);

  if (!isOpen) return null;

  const handleSpeedChange = (value: number) => {
    setTtsSpeed(value);
    updateSpeed(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 rounded-2xl shadow-2xl border-2 border-purple-400/30">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-400/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Voice Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
            aria-label="Close settings"
          >
            <X className="w-6 h-6 text-gray-300" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-purple-400/20 bg-gray-900/50">
          <button
            onClick={() => setActiveTab('tts')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-all ${
              activeTab === 'tts'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                : 'text-gray-400 hover:text-gray-300 hover:bg-purple-500/5'
            }`}
          >
            <Volume2 className="w-5 h-5" />
            Text-to-Speech
          </button>
          <button
            onClick={() => setActiveTab('stt')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-all ${
              activeTab === 'stt'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                : 'text-gray-400 hover:text-gray-300 hover:bg-purple-500/5'
            }`}
          >
            <Mic className="w-5 h-5" />
            Speech-to-Text
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {activeTab === 'tts' ? (
            <div className="space-y-6">
              {/* TTS Status */}
              <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-400/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-300">Status</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${ttsState.isSpeaking ? 'bg-green-500' : 'bg-gray-500'}`} />
                    <span className="text-sm text-gray-400">
                      {ttsState.isSpeaking ? 'Speaking' : 'Idle'}
                    </span>
                  </div>
                </div>
                {ttsState.isSpeaking && ttsState.currentText && (
                  <p className="text-xs text-gray-500 mt-2 truncate">
                    "{ttsState.currentText}"
                  </p>
                )}
              </div>

              {/* Auto-Speak Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-200">Auto-Speak Responses</label>
                  <p className="text-xs text-gray-400 mt-1">Automatically read AI responses aloud</p>
                </div>
                <button
                  onClick={() => setAutoSpeakEnabled(!autoSpeakEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoSpeakEnabled ? 'bg-purple-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoSpeakEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* TTS Quality Toggle */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-lg hover:from-purple-900/40 hover:to-pink-900/40 transition-colors border border-purple-400/20">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-200 flex items-center gap-2">
                    🎤 Ultra-Realistic Voice (Gemini 2.5 Flash TTS)
                    <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-400/30">
                      BETA
                    </span>
                  </label>
                  <p className="text-xs text-gray-400 mt-1">
                    {useHighQualityTTS 
                      ? '🎭 Using experimental ultra-realistic voice (may fail sometimes)' 
                      : '⚡ Using fast & reliable Google Cloud TTS (recommended)'
                    }
                  </p>
                </div>
                <button
                  onClick={() => setUseHighQualityTTS(!useHighQualityTTS)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    useHighQualityTTS ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useHighQualityTTS ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Mute Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-200">Mute</label>
                  <p className="text-xs text-gray-400 mt-1">Silence all voice output</p>
                </div>
                <button
                  onClick={toggleMute}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    ttsState.isMuted ? 'bg-red-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      ttsState.isMuted ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Speed Control */}
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-200">Speaking Speed</label>
                  <span className="text-sm text-purple-400 font-medium">{ttsSpeed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={ttsSpeed}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>Slow (0.5x)</span>
                  <span>Normal (1.0x)</span>
                  <span>Fast (2.0x)</span>
                </div>
              </div>

              {/* Playback Controls */}
              {ttsState.isSpeaking && (
                <div className="flex gap-2">
                  {ttsState.isPaused ? (
                    <button
                      onClick={ttsResume}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-medium transition-all"
                    >
                      <Play className="w-5 h-5" />
                      Resume
                    </button>
                  ) : (
                    <button
                      onClick={ttsPause}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg font-medium transition-all"
                    >
                      <Pause className="w-5 h-5" />
                      Pause
                    </button>
                  )}
                  <button
                    onClick={ttsStop}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all"
                  >
                    <Square className="w-5 h-5" />
                    Stop
                  </button>
                </div>
              )}

              {/* Fallback Notice */}
              {ttsState.usingFallback && (
                <div className="p-4 bg-yellow-900/20 border border-yellow-400/30 rounded-lg">
                  <p className="text-sm text-yellow-300">
                    ⚠️ Using fallback Web Speech API due to quota limits
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* STT Support Check */}
              {!sttSupported ? (
                <div className="p-4 bg-red-900/20 border border-red-400/30 rounded-lg">
                  <p className="text-sm text-red-300">
                    ❌ Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.
                  </p>
                </div>
              ) : (
                <>
                  {/* STT Status */}
                  <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-400/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-300">Status</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${sttState.isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
                        <span className="text-sm text-gray-400">
                          {sttState.isListening ? 'Listening' : 'Idle'}
                        </span>
                      </div>
                    </div>
                    {sttState.interimTranscript && (
                      <p className="text-xs text-gray-400 mt-2">
                        "{sttState.interimTranscript}"
                      </p>
                    )}
                    {sttState.error && (
                      <p className="text-xs text-red-400 mt-2">
                        Error: {sttState.error}
                      </p>
                    )}
                  </div>

                  {/* Language Selector */}
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <label className="text-sm font-medium text-gray-200 block mb-3">
                      Recognition Language
                    </label>
                    <select
                      value={sttConfig.language}
                      onChange={(e) => updateSttConfig({ language: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 text-gray-200 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {getAvailableLanguages().map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Continuous Mode Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-200">Continuous Listening</label>
                      <p className="text-xs text-gray-400 mt-1">Keep listening for multiple phrases</p>
                    </div>
                    <button
                      onClick={() => updateSttConfig({ continuous: !sttConfig.continuous })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        sttConfig.continuous ? 'bg-purple-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          sttConfig.continuous ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Auto-Send Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-200">Auto-Send on Pause</label>
                      <p className="text-xs text-gray-400 mt-1">Automatically send message after silence</p>
                    </div>
                    <button
                      onClick={() => updateSttConfig({ autoSendOnPause: !sttConfig.autoSendOnPause })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        sttConfig.autoSendOnPause ? 'bg-purple-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          sttConfig.autoSendOnPause ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Pause Threshold Slider */}
                  <div className={`p-4 bg-gray-800/50 rounded-lg transition-opacity ${!sttConfig.autoSendOnPause ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-gray-200">Pause Threshold</label>
                      <span className="text-sm text-purple-400 font-medium">{sttConfig.pauseThreshold}ms</span>
                    </div>
                    <input
                      type="range"
                      min="500"
                      max="3000"
                      step="100"
                      value={sttConfig.pauseThreshold}
                      onChange={(e) => updateSttConfig({ pauseThreshold: parseInt(e.target.value) })}
                      disabled={!sttConfig.autoSendOnPause}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                      <span>0.5s</span>
                      <span>1.5s</span>
                      <span>3.0s</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Time to wait after speech before auto-sending
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
