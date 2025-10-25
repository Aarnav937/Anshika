/**
 * 🎙️ TTS Context Provider
 * =======================
 * Global state management for Text-to-Speech functionality
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ttsService, TTSState } from '../services/ttsService';

interface TTSContextType {
  ttsState: TTSState;
  autoSpeakEnabled: boolean;
  useHighQualityTTS: boolean;
  setAutoSpeakEnabled: (enabled: boolean) => void;
  setUseHighQualityTTS: (enabled: boolean) => void;
  speak: (text: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  toggleMute: () => void;
  updateSpeed: (speed: number) => void;
}

const TTSContext = createContext<TTSContextType | undefined>(undefined);

export const TTSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [ttsState, setTtsState] = useState<TTSState>(ttsService.getState());
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(() => {
    const saved = localStorage.getItem('anshika_autoSpeak');
    return saved ? JSON.parse(saved) : true; // Default to enabled
  });
  const [useHighQualityTTS, setUseHighQualityTTS] = useState(() => {
    const saved = localStorage.getItem('anshika_useHighQualityTTS');
    return saved ? JSON.parse(saved) : false; // Default to fast TTS (more reliable)
  });

  useEffect(() => {
    // Subscribe to TTS state changes
    const unsubscribe = ttsService.onStateChange((state) => {
      setTtsState(state);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Save auto-speak preference
    localStorage.setItem('anshika_autoSpeak', JSON.stringify(autoSpeakEnabled));
  }, [autoSpeakEnabled]);

  useEffect(() => {
    // Save high-quality TTS preference and update service config
    localStorage.setItem('anshika_useHighQualityTTS', JSON.stringify(useHighQualityTTS));
    ttsService.updateConfig({ useHighQuality: useHighQualityTTS });
  }, [useHighQualityTTS]);

  const speak = async (text: string) => {
    if (autoSpeakEnabled && !ttsState.isMuted) {
      await ttsService.speak(text);
    }
  };

  const pause = () => {
    ttsService.pause();
  };

  const resume = () => {
    ttsService.resume();
  };

  const stop = () => {
    ttsService.stop();
  };

  const toggleMute = () => {
    ttsService.toggleMute();
  };

  const updateSpeed = (speed: number) => {
    ttsService.updateConfig({ speakingRate: speed });
  };

  return (
    <TTSContext.Provider
      value={{
        ttsState,
        autoSpeakEnabled,
        useHighQualityTTS,
        setAutoSpeakEnabled,
        setUseHighQualityTTS,
        speak,
        pause,
        resume,
        stop,
        toggleMute,
        updateSpeed,
      }}
    >
      {children}
    </TTSContext.Provider>
  );
};

export const useTTS = () => {
  const context = useContext(TTSContext);
  if (!context) {
    throw new Error('useTTS must be used within TTSProvider');
  }
  return context;
};
