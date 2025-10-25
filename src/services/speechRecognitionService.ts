/**
 * 🎤 Speech Recognition Service
 * ==============================
 * Web Speech API integration for voice input functionality
 * 
 * Features:
 * - Real-time speech-to-text transcription
 * - Multi-language support (25+ languages)
 * - Continuous listening mode
 * - Auto-send on pause detection
 * - Interim results for live feedback
 * - Comprehensive error handling
 */

export interface SpeechRecognitionConfig {
  language: string;                    // Language code (e.g., 'en-US')
  continuous: boolean;                 // Keep listening after pause
  interimResults: boolean;             // Show live transcription
  autoSendOnPause: boolean;           // Auto-send after silence
  pauseThreshold: number;             // Silence duration (ms) before auto-send
}

export interface SpeechRecognitionState {
  isListening: boolean;                // Currently recording
  isPaused: boolean;                   // Recognition paused
  currentTranscript: string;           // Current full transcript
  interimTranscript: string;           // Live interim text
  error: string | null;                // Last error message
}

export interface LanguageOption {
  code: string;
  name: string;
}

type TranscriptCallback = (text: string, isFinal: boolean) => void;
type ErrorCallback = (error: string) => void;

class SpeechRecognitionService {
  private recognition: any = null;
  private isRecognitionActive = false;
  
  private config: SpeechRecognitionConfig = {
    language: 'en-US',
    continuous: false,
    interimResults: true,
    autoSendOnPause: false,
    pauseThreshold: 1500, // 1.5 seconds
  };

  private state: SpeechRecognitionState = {
    isListening: false,
    isPaused: false,
    currentTranscript: '',
    interimTranscript: '',
    error: null,
  };

  private stateChangeListeners: Set<(state: SpeechRecognitionState) => void> = new Set();
  private silenceTimer: any = null;
  private onTranscriptCallback: TranscriptCallback | null = null;
  private onErrorCallback: ErrorCallback | null = null;

  constructor() {
    this.loadConfigFromStorage();
  }

  /**
   * Load configuration from localStorage
   */
  private loadConfigFromStorage() {
    try {
      const saved = localStorage.getItem('anshika_speechRecognitionConfig');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.config = { ...this.config, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load speech recognition config:', error);
    }
  }

  /**
   * Save configuration to localStorage
   */
  private saveConfigToStorage() {
    try {
      localStorage.setItem('anshika_speechRecognitionConfig', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save speech recognition config:', error);
    }
  }

  /**
   * Check if Web Speech API is supported
   */
  public isSupported(): boolean {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  /**
   * Get browser-specific SpeechRecognition constructor
   */
  private getSpeechRecognition(): any {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return SpeechRecognition ? new SpeechRecognition() : null;
  }

  /**
   * Subscribe to state changes
   */
  public onStateChange(callback: (state: SpeechRecognitionState) => void): () => void {
    this.stateChangeListeners.add(callback);
    return () => this.stateChangeListeners.delete(callback);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyStateChange() {
    this.stateChangeListeners.forEach(listener => listener({ ...this.state }));
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<SpeechRecognitionConfig>) {
    this.config = { ...this.config, ...config };
    this.saveConfigToStorage();

    // If recognition is active, restart with new config
    if (this.isRecognitionActive) {
      const currentCallback = this.onTranscriptCallback;
      const currentErrorCallback = this.onErrorCallback;
      this.stopListening();
      if (currentCallback) {
        setTimeout(() => this.startListening(currentCallback, currentErrorCallback || undefined), 100);
      }
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): SpeechRecognitionConfig {
    return { ...this.config };
  }

  /**
   * Get current state
   */
  public getState(): SpeechRecognitionState {
    return { ...this.state };
  }

  /**
   * Get available languages
   */
  public getAvailableLanguages(): LanguageOption[] {
    return [
      { code: 'en-US', name: 'English (United States)' },
      { code: 'en-GB', name: 'English (United Kingdom)' },
      { code: 'en-AU', name: 'English (Australia)' },
      { code: 'en-IN', name: 'English (India)' },
      { code: 'es-ES', name: 'Spanish (Spain)' },
      { code: 'es-MX', name: 'Spanish (Mexico)' },
      { code: 'fr-FR', name: 'French (France)' },
      { code: 'de-DE', name: 'German (Germany)' },
      { code: 'it-IT', name: 'Italian (Italy)' },
      { code: 'pt-BR', name: 'Portuguese (Brazil)' },
      { code: 'pt-PT', name: 'Portuguese (Portugal)' },
      { code: 'ru-RU', name: 'Russian (Russia)' },
      { code: 'ja-JP', name: 'Japanese (Japan)' },
      { code: 'ko-KR', name: 'Korean (Korea)' },
      { code: 'zh-CN', name: 'Chinese (Simplified)' },
      { code: 'zh-TW', name: 'Chinese (Traditional)' },
      { code: 'ar-SA', name: 'Arabic (Saudi Arabia)' },
      { code: 'hi-IN', name: 'Hindi (India)' },
      { code: 'nl-NL', name: 'Dutch (Netherlands)' },
      { code: 'pl-PL', name: 'Polish (Poland)' },
      { code: 'tr-TR', name: 'Turkish (Turkey)' },
      { code: 'sv-SE', name: 'Swedish (Sweden)' },
      { code: 'da-DK', name: 'Danish (Denmark)' },
      { code: 'fi-FI', name: 'Finnish (Finland)' },
      { code: 'no-NO', name: 'Norwegian (Norway)' },
    ];
  }

  /**
   * Start listening for voice input
   */
  public startListening(
    onTranscript: TranscriptCallback,
    onError?: ErrorCallback
  ): void {
    if (!this.isSupported()) {
      const error = 'Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.';
      this.state.error = error;
      this.notifyStateChange();
      if (onError) onError(error);
      return;
    }

    if (this.isRecognitionActive) {
      console.warn('Speech recognition is already active');
      return;
    }

    this.onTranscriptCallback = onTranscript;
    this.onErrorCallback = onError || null;

    try {
      this.recognition = this.getSpeechRecognition();
      
      if (!this.recognition) {
        throw new Error('Failed to initialize speech recognition');
      }

      // Configure recognition
      this.recognition.lang = this.config.language;
      this.recognition.continuous = this.config.continuous;
      this.recognition.interimResults = this.config.interimResults;
      this.recognition.maxAlternatives = 1;

      // Reset state
      this.state.currentTranscript = '';
      this.state.interimTranscript = '';
      this.state.error = null;
      this.state.isListening = true;
      this.state.isPaused = false;
      this.isRecognitionActive = true;
      this.notifyStateChange();

      // Set up event handlers
      this.recognition.onresult = this.handleResult.bind(this);
      this.recognition.onerror = this.handleError.bind(this);
      this.recognition.onend = this.handleEnd.bind(this);
      this.recognition.onstart = this.handleStart.bind(this);

      // Start recognition
      this.recognition.start();
      console.log('🎤 Speech recognition started');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start speech recognition';
      this.state.error = message;
      this.state.isListening = false;
      this.isRecognitionActive = false;
      this.notifyStateChange();
      if (onError) onError(message);
    }
  }

  /**
   * Stop listening
   */
  public stopListening(): void {
    if (this.recognition && this.isRecognitionActive) {
      try {
        this.recognition.stop();
        console.log('🛑 Speech recognition stopped');
      } catch (error) {
        console.warn('Error stopping recognition:', error);
      }
    }

    this.clearSilenceTimer();
    this.state.isListening = false;
    this.state.isPaused = false;
    this.isRecognitionActive = false;
    this.notifyStateChange();
  }

  /**
   * Handle speech recognition start
   */
  private handleStart(): void {
    console.log('🎙️ Recognition started');
    this.state.isListening = true;
    this.notifyStateChange();
  }

  /**
   * Handle speech recognition results
   */
  private handleResult(event: any): void {
    let interimTranscript = '';
    let finalTranscript = '';

    // Process all results
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }

    // Update state
    if (finalTranscript) {
      this.state.currentTranscript += finalTranscript;
      this.state.interimTranscript = '';
      
      // Notify with final transcript
      if (this.onTranscriptCallback) {
        this.onTranscriptCallback(finalTranscript.trim(), true);
      }

      // Reset silence timer for auto-send
      this.resetSilenceTimer(finalTranscript.trim());
    } else if (interimTranscript) {
      this.state.interimTranscript = interimTranscript;
      
      // Notify with interim transcript
      if (this.onTranscriptCallback) {
        this.onTranscriptCallback(interimTranscript, false);
      }
    }

    this.notifyStateChange();
  }

  /**
   * Reset silence timer for auto-send functionality
   */
  private resetSilenceTimer(finalText: string): void {
    this.clearSilenceTimer();

    if (this.config.autoSendOnPause && finalText) {
      this.silenceTimer = setTimeout(() => {
        console.log('⏰ Silence detected, auto-sending...');
        this.stopListening();
        
        // Notify that we're done (auto-send trigger)
        if (this.onTranscriptCallback) {
          this.onTranscriptCallback(this.state.currentTranscript.trim(), true);
        }
      }, this.config.pauseThreshold);
    }
  }

  /**
   * Clear silence timer
   */
  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  /**
   * Handle speech recognition errors
   */
  private handleError(event: any): void {
    console.error('Speech recognition error:', event.error);

    const errorMessages: Record<string, string> = {
      'no-speech': 'No speech detected. Please try again.',
      'audio-capture': 'No microphone found. Please check your device.',
      'not-allowed': 'Microphone permission denied. Please allow microphone access.',
      'network': 'Network error. Please check your connection.',
      'aborted': 'Recognition was aborted.',
      'service-not-allowed': 'Speech recognition service not allowed.',
      'bad-grammar': 'Speech recognition grammar error.',
      'language-not-supported': 'Selected language is not supported.',
    };

    const message = errorMessages[event.error] || `Speech recognition error: ${event.error}`;
    
    this.state.error = message;
    this.state.isListening = false;
    this.isRecognitionActive = false;
    this.notifyStateChange();

    if (this.onErrorCallback) {
      this.onErrorCallback(message);
    }

    this.clearSilenceTimer();
  }

  /**
   * Handle speech recognition end
   */
  private handleEnd(): void {
    console.log('🏁 Recognition ended');
    
    this.clearSilenceTimer();
    
    // If continuous mode and still active, restart
    if (this.config.continuous && this.isRecognitionActive && this.state.isListening) {
      try {
        setTimeout(() => {
          if (this.recognition && this.isRecognitionActive) {
            this.recognition.start();
          }
        }, 100);
      } catch (error) {
        console.warn('Failed to restart continuous recognition:', error);
        this.state.isListening = false;
        this.isRecognitionActive = false;
        this.notifyStateChange();
      }
    } else {
      this.state.isListening = false;
      this.isRecognitionActive = false;
      this.notifyStateChange();
    }
  }

  /**
   * Pause recognition (not fully supported in all browsers)
   */
  public pause(): void {
    if (this.recognition && this.isRecognitionActive) {
      this.state.isPaused = true;
      this.notifyStateChange();
      // Note: Native pause not supported, would need custom implementation
    }
  }

  /**
   * Resume recognition (not fully supported in all browsers)
   */
  public resume(): void {
    if (this.recognition && this.isRecognitionActive) {
      this.state.isPaused = false;
      this.notifyStateChange();
      // Note: Native resume not supported, would need custom implementation
    }
  }

  /**
   * Clear current transcript
   */
  public clearTranscript(): void {
    this.state.currentTranscript = '';
    this.state.interimTranscript = '';
    this.notifyStateChange();
  }
}

// Singleton instance
export const speechRecognitionService = new SpeechRecognitionService();
