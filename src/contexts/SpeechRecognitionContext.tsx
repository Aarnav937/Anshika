/**
 * 🎙️ Speech Recognition Context Provider
 * ========================================
 * Global state management for voice input functionality
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  speechRecognitionService,
  SpeechRecognitionState,
  SpeechRecognitionConfig,
  LanguageOption,
} from '../services/speechRecognitionService';

interface SpeechRecognitionContextType {
  state: SpeechRecognitionState;
  config: SpeechRecognitionConfig;
  isSupported: boolean;
  startListening: (
    onTranscript: (text: string, isFinal: boolean) => void,
    onError?: (error: string) => void
  ) => void;
  stopListening: () => void;
  updateConfig: (config: Partial<SpeechRecognitionConfig>) => void;
  getAvailableLanguages: () => LanguageOption[];
  clearTranscript: () => void;
}

const SpeechRecognitionContext = createContext<SpeechRecognitionContextType | undefined>(undefined);

export const SpeechRecognitionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SpeechRecognitionState>(
    speechRecognitionService.getState()
  );
  const [config, setConfig] = useState<SpeechRecognitionConfig>(
    speechRecognitionService.getConfig()
  );
  const [isSupported] = useState<boolean>(speechRecognitionService.isSupported());

  useEffect(() => {
    // Subscribe to service state changes
    const unsubscribe = speechRecognitionService.onStateChange((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  const startListening = (
    onTranscript: (text: string, isFinal: boolean) => void,
    onError?: (error: string) => void
  ) => {
    speechRecognitionService.startListening(onTranscript, onError);
  };

  const stopListening = () => {
    speechRecognitionService.stopListening();
  };

  const updateConfig = (newConfig: Partial<SpeechRecognitionConfig>) => {
    speechRecognitionService.updateConfig(newConfig);
    setConfig(speechRecognitionService.getConfig());
  };

  const getAvailableLanguages = () => {
    return speechRecognitionService.getAvailableLanguages();
  };

  const clearTranscript = () => {
    speechRecognitionService.clearTranscript();
  };

  return (
    <SpeechRecognitionContext.Provider
      value={{
        state,
        config,
        isSupported,
        startListening,
        stopListening,
        updateConfig,
        getAvailableLanguages,
        clearTranscript,
      }}
    >
      {children}
    </SpeechRecognitionContext.Provider>
  );
};

export const useSpeechRecognition = () => {
  const context = useContext(SpeechRecognitionContext);
  if (!context) {
    throw new Error('useSpeechRecognition must be used within SpeechRecognitionProvider');
  }
  return context;
};
