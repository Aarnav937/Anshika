/**
 * 🎙️ Gemini 2.5 Flash TTS Service
 * =================================
 * Features:
 * - Gemini 2.5 Flash Preview TTS (ultra-realistic AI voices)
 * - 5 premium voices: Puck, Charon, Kore, Fenrir, Aoede
 * - IndexedDB caching to save API quota
 * - Web Speech API fallback when quota exceeded
 * - Playback control (pause, resume, stop)
 * - Speed control
 * - Secure API key from encrypted storage
 */

import Dexie, { Table } from 'dexie';
import { secureStorage } from './secureStorageService';

interface TTSCache {
  id?: number;
  text: string;
  voiceName: string;
  audioBlob: Blob;
  timestamp: number;
}

// IndexedDB for caching TTS audio
class TTSDatabase extends Dexie {
  ttsCache!: Table<TTSCache>;

  constructor() {
    super('AnshikaTTSCache');
    this.version(1).stores({
      ttsCache: '++id, text, voiceName, timestamp'
    });
  }
}

const db = new TTSDatabase();

export interface TTSConfig {
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede' | 'Achernar'; // Gemini 2.5 Flash TTS voices + Achernar (Archer)
  model: string;
  speakingRate: number; // New: Voice pitch control (-20.0 to 20.0)
  pitch: number; // New: Voice pitch control (-20.0 to 20.0)
  volumeGainDb: number; // New: Volume control (-96.0 to 16.0)
  useHighQuality: boolean; // true = Gemini 2.5 Flash TTS (slow, real), false = Google Cloud TTS (fast)
  useTurboMode: boolean; // New: true = Maximum speed (short chunks, aggressive caching)
  styleInstructions?: string; // New: Custom style instructions for TTS
}

export interface TTSState {
  isSpeaking: boolean;
  isPaused: boolean;
  isMuted: boolean;
  currentText: string | null;
  usingFallback: boolean;
}

class TTSService {
  private config: TTSConfig = {
    voiceName: 'Achernar', // Confident, commanding voice (perfect for Anshika)
    model: 'gemini-2.5-flash-preview-tts',
    speakingRate: 1.0, // Natural speed
    pitch: 0.0, // Natural pitch
    volumeGainDb: 0.0, // Natural volume
    useHighQuality: true, // Default to ultra-realistic Gemini TTS
    useTurboMode: false, // New: Turbo mode for maximum speed
  };

  private currentAudio: HTMLAudioElement | null = null;
  private webSpeechUtterance: SpeechSynthesisUtterance | null = null;
  private state: TTSState = {
    isSpeaking: false,
    isPaused: false,
    isMuted: false,
    currentText: null,
    usingFallback: false,
  };

  private stateChangeListeners: Set<(state: TTSState) => void> = new Set();

  constructor() {
    // Initialize Web Speech API if available
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        // Voices loaded
      };
    }
  }

  /**
   * Clean text for TTS - remove emojis, markdown, and special characters
   */
  private cleanTextForSpeech(text: string): string {
    let cleaned = text;

    // Remove emojis (including emoji descriptions like :emoji_name:)
    cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); // Emoticons
    cleaned = cleaned.replace(/[\u{1F300}-\u{1F5FF}]/gu, ''); // Misc Symbols and Pictographs
    cleaned = cleaned.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); // Transport and Map
    cleaned = cleaned.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, ''); // Flags
    cleaned = cleaned.replace(/[\u{2600}-\u{26FF}]/gu, ''); // Misc symbols
    cleaned = cleaned.replace(/[\u{2700}-\u{27BF}]/gu, ''); // Dingbats
    cleaned = cleaned.replace(/[\u{FE00}-\u{FE0F}]/gu, ''); // Variation Selectors
    cleaned = cleaned.replace(/[\u{1F900}-\u{1F9FF}]/gu, ''); // Supplemental Symbols and Pictographs
    cleaned = cleaned.replace(/[\u{1FA00}-\u{1FA6F}]/gu, ''); // Chess Symbols
    cleaned = cleaned.replace(/[\u{1FA70}-\u{1FAFF}]/gu, ''); // Symbols and Pictographs Extended-A
    cleaned = cleaned.replace(/:\w+:/g, ''); // :emoji_name: format

    // Remove markdown formatting
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1'); // Bold
    cleaned = cleaned.replace(/\*(.*?)\*/g, '$1'); // Italic
    cleaned = cleaned.replace(/__(.*?)__/g, '$1'); // Bold
    cleaned = cleaned.replace(/_(.*?)_/g, '$1'); // Italic
    cleaned = cleaned.replace(/~~(.*?)~~/g, '$1'); // Strikethrough
    cleaned = cleaned.replace(/`{1,3}(.*?)`{1,3}/g, '$1'); // Code
    cleaned = cleaned.replace(/^#{1,6}\s+/gm, ''); // Headers
    cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, ''); // Lists
    cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, ''); // Numbered lists
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Links
    cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]+\)/g, ''); // Images

    // Remove multiple spaces and trim
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }

  /**
   * Subscribe to TTS state changes
   */
  public onStateChange(callback: (state: TTSState) => void): () => void {
    this.stateChangeListeners.add(callback);
    return () => this.stateChangeListeners.delete(callback);
  }

  private notifyStateChange() {
    this.stateChangeListeners.forEach(listener => listener({ ...this.state }));
  }

  /**
   * Update TTS configuration
   */
  public updateConfig(config: Partial<TTSConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): TTSConfig {
    return { ...this.config };
  }

  /**
   * Get current state
   */
  public getState(): TTSState {
    return { ...this.state };
  }

  /**
   * Speak text using Google Cloud TTS (with caching) or Web Speech API fallback
   */
  public async speak(text: string): Promise<void> {
    if (!text || text.trim().length === 0) return;

    // Clean text - remove emojis and markdown
    const cleanedText = this.cleanTextForSpeech(text);
    
    if (!cleanedText || cleanedText.trim().length === 0) {
      console.log('No text to speak after cleaning');
      return;
    }

    // Stop any current speech
    this.stop();

    if (this.state.isMuted) {
      console.log('TTS is muted');
      return;
    }

    this.state.currentText = cleanedText;
    this.state.isSpeaking = true;
    this.notifyStateChange();

    try {
      // Check if user wants ultra-realistic Gemini TTS or fast Google Cloud TTS
      if (this.config.useHighQuality) {
        console.log('%c🎤 USING: Ultra-Realistic Gemini 2.5 Flash TTS', 'background: linear-gradient(to right, #8b5cf6, #ec4899); color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
        await this.speakWithGeminiTTS(cleanedText);
      } else {
        console.log('%c⚡ USING: Fast Google Cloud TTS', 'background: linear-gradient(to right, #3b82f6, #06b6d4); color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
        await this.speakWithFastTTS(cleanedText);
      }
    } catch (error: any) {
      console.error('TTS error:', error);
      
      // Check if quota exceeded
      if (error.message?.includes('quota') || error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        console.warn('Google TTS quota exceeded, falling back to Web Speech API');
        this.state.usingFallback = true;
        this.notifyStateChange();
        
        // Retry with fallback (already cleaned)
        await this.speakWithWebSpeech(cleanedText);
      } else {
        // Other error, fallback anyway (already cleaned)
        await this.speakWithWebSpeech(cleanedText);
      }
    }
  }

  /**
x   * Speak using Google Cloud TTS via proxy (FAST, RELIABLE)
   */
  private async speakWithFastTTS(text: string): Promise<void> {
    const cacheKey = `fast_${text}_en-US-Neural2-C_1.0`;

    // Check cache first
    const cached = await db.ttsCache
      .where('text')
      .equals(cacheKey)
      .first();

    let audioBlob: Blob;

    if (cached) {
      console.log('✅ Using cached fast TTS audio');
      audioBlob = cached.audioBlob;
    } else {
      console.log('⚡ Generating fast TTS with Google Cloud Neural2-C');

      // Get API key from secure storage
      const apiKey = await secureStorage.getApiKey('VITE_GEMINI_API_KEY');

      if (!apiKey) {
        throw new Error('Gemini API key not found. Please add it in Settings → 🔑 API Keys.');
      }

      // Use Google Cloud TTS directly for maximum reliability
      const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

      const requestBody = {
        input: { text },
        voice: {
          languageCode: 'en-US', // Standard English
          name: 'en-US-Neural2-C', // Natural female voice
          ssmlGender: 'FEMALE'
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: this.config.speakingRate,
          pitch: this.config.pitch.toString(),
          volumeGainDb: this.config.volumeGainDb,
          effectsProfileId: ['headphone-class-device']
        }
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorData = await response.json();

          // Check for quota exceeded
          if (errorData.error?.status === 'RESOURCE_EXHAUSTED' || errorData.error?.code === 429) {
            console.warn('⚠️ Google Cloud TTS quota exceeded, falling back to Web Speech');
            this.state.usingFallback = true;
            this.notifyStateChange();
            return this.speakWithWebSpeech(text);
          }

          throw new Error(errorData.error?.message || 'Fast TTS synthesis failed');
        }

        const data = await response.json();

        if (!data.audioContent) {
          throw new Error('No audio content in response');
        }

        // Convert base64 to blob
        const audioData = data.audioContent;
        const byteCharacters = atob(audioData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        audioBlob = new Blob([byteArray], { type: 'audio/mpeg' });

        // Cache the audio
        try {
          await db.ttsCache.add({
            text: cacheKey,
            voiceName: 'en-US-Neural2-C',
            audioBlob,
            timestamp: Date.now(),
          });
          console.log('💾 Cached fast TTS audio');
        } catch (cacheError) {
          console.warn('Failed to cache audio:', cacheError);
        }
      } catch (error: any) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
          console.warn('⏱️ Fast TTS timeout, falling back to Web Speech');
          this.state.usingFallback = true;
          this.notifyStateChange();
          return this.speakWithWebSpeech(text);
        }
        throw error;
      }
    }

    // Play the audio
    return this.playAudioBlobWithState(audioBlob);
  }

  /**
   * Speak using Gemini 2.5 Flash TTS - ULTRA-REALISTIC (OPTIMIZED FOR SPEED)
   */
  private async speakWithGeminiTTS(text: string): Promise<void> {
    console.log('🎤 Gemini 2.5 Flash TTS (Ultra-Realistic)');

    // Validate text is suitable for TTS
    if (!text || text.trim().length === 0) {
      console.warn('⚠️ Empty text, skipping Gemini TTS');
      return;
    }

    // Check cache first (optional caching for frequently used phrases)
    const cacheKey = `gemini_${text}_${this.config.voiceName}`;
    const cached = await db.ttsCache
      .where('text')
      .equals(cacheKey)
      .first();

    if (cached && (Date.now() - cached.timestamp) < 3600000) { // Cache for 1 hour
      console.log('✅ Using cached Gemini TTS audio');
      return this.playAudioBlobWithState(cached.audioBlob);
    }

    // Get API key from secure storage
    const apiKey = await secureStorage.getApiKey('VITE_GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('Gemini API key not found. Please add it in Settings → 🔑 API Keys.');
    }

    // Chunk long text for faster processing
    const maxChunkSize = this.config.useTurboMode ? 150 : 250; // Smaller chunks in turbo mode
    const chunks = this.chunkText(text, maxChunkSize);
    console.log(`📤 Processing ${chunks.length} text chunk(s) with Gemini TTS ${this.config.useTurboMode ? '(TURBO MODE)' : ''}`);

    // Generate all chunks in parallel for immediate playback
    const chunkPromises = chunks.map((chunk, index) => 
      this.generateChunkAudio(chunk, index === chunks.length - 1 ? cacheKey : null, apiKey)
    );

    // Process results as they complete, playing immediately
    const results = await Promise.allSettled(chunkPromises);
    
    // Create a playback queue to maintain order
    const playbackQueue: Blob[] = [];
    let isPlaying = false;

    const playNextChunk = async () => {
      if (playbackQueue.length === 0 || isPlaying) return;
      
      isPlaying = true;
      const audioBlob = playbackQueue.shift()!;
      
      try {
        await this.playAudioBlob(audioBlob);
      } catch (error) {
        console.warn('Chunk playback failed:', error);
      } finally {
        isPlaying = false;
        // Play next chunk if available
        playNextChunk();
      }
    };

    // Process each result and add to playback queue
    for (const result of results) {
      if (result.status === 'fulfilled') {
        playbackQueue.push(result.value);
        // Start playing if not already playing
        if (!isPlaying) {
          playNextChunk();
        }
      } else {
        console.warn('Chunk generation failed:', result.reason);
        // Fallback will be handled in generateChunkAudio
      }
    }

    // Wait for all chunks to be played
    while (playbackQueue.length > 0 || isPlaying) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Generate audio for a single chunk (with automatic fallback)
   */
  private async generateChunkAudio(text: string, cacheKey: string | null, apiKey: string): Promise<Blob> {
    try {
      return await this.processGeminiTTSChunk(text, cacheKey, apiKey);
    } catch (error) {
      console.warn(`⚠️ Gemini TTS chunk failed, falling back to fast TTS:`, error);
      // Generate fallback immediately
      return await this.generateFastTTSChunk(text);
    }
  }

  /**
   * Generate fast TTS chunk (used for fallback)
   */
  private async generateFastTTSChunk(text: string): Promise<Blob> {
    const cacheKey = `fast_${text}_en-US-Neural2-C_1.0`;

    // Check cache first
    const cached = await db.ttsCache
      .where('text')
      .equals(cacheKey)
      .first();

    if (cached) {
      console.log('✅ Using cached fast TTS audio for chunk');
      return cached.audioBlob;
    }

    console.log('⚡ Generating fast TTS chunk with Google Cloud Neural2-C');

    // Get API key from secure storage
    const apiKey = await secureStorage.getApiKey('VITE_GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('Gemini API key not found. Please add it in Settings → 🔑 API Keys.');
    }

    // Use Google Cloud TTS directly for maximum reliability
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

    const requestBody = {
      input: { text },
      voice: {
        languageCode: 'en-US', // Standard English
        name: 'en-US-Neural2-C', // Natural female voice
        ssmlGender: 'FEMALE'
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: this.config.speakingRate,
        pitch: this.config.pitch.toString(),
        volumeGainDb: this.config.volumeGainDb,
        effectsProfileId: ['headphone-class-device']
      }
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Fast TTS synthesis failed');
      }

      const data = await response.json();

      if (!data.audioContent) {
        throw new Error('No audio content in response');
      }

      // Convert base64 to blob
      const audioData = data.audioContent;
      const byteCharacters = atob(audioData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const audioBlob = new Blob([byteArray], { type: 'audio/mpeg' });

      // Cache the audio
      try {
        await db.ttsCache.add({
          text: cacheKey,
          voiceName: 'en-US-Neural2-C',
          audioBlob,
          timestamp: Date.now(),
        });
        console.log('💾 Cached fast TTS chunk audio');
      } catch (cacheError) {
        console.warn('Failed to cache chunk audio:', cacheError);
      }

      return audioBlob;
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        console.warn('⏱️ Fast TTS chunk timeout');
        throw error;
      }
      throw error;
    }
  }

  /**
   * Process a single chunk with Gemini TTS
   */
  private async processGeminiTTSChunk(text: string, cacheKey: string | null, apiKey: string): Promise<Blob> {
    // Call Gemini 2.5 Flash TTS directly
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [{
        parts: [{
          text: text
        }]
      }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: this.config.voiceName
            }
          }
        }
      }
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // Reduced to 15 seconds for speed

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || 'Gemini TTS failed';
        console.warn(`%c⚠️ Gemini TTS API error (${response.status}): ${errorMessage}`, 'color: #f59e0b; font-weight: bold;');

        // More aggressive fallback for any API error
        console.log('%c🔄 Auto-fallback to reliable Fast Google Cloud TTS', 'background: #3b82f6; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
        return this.generateFastTTSChunk(text);
      }

      const data = await response.json();

      // Check for blocked/refused generation
      const finishReason = data.candidates?.[0]?.finishReason;
      if (finishReason === 'OTHER' || finishReason === 'SAFETY' || finishReason === 'RECITATION') {
        console.warn(`%c⚠️ Gemini TTS refused (${finishReason})`, 'color: #f59e0b; font-weight: bold;');

        console.log('%c🔄 Auto-fallback to Fast Google Cloud TTS', 'background: #3b82f6; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
        return this.generateFastTTSChunk(text);
      }

      // Extract audio data from response
      const audioPart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);

      if (!audioPart || !audioPart.inlineData?.data) {
        console.warn('⚠️ No audio data in Gemini TTS response, falling back to fast TTS');
        return this.generateFastTTSChunk(text);
      }

      const audioBase64 = audioPart.inlineData.data;
      console.log(`🎵 Gemini TTS chunk audio ready (${this.config.voiceName} voice)`);

      // Convert base64 to blob
      const byteCharacters = atob(audioBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      // Convert PCM to WAV
      const audioBlob = this.pcmToWav(byteArray, 24000, 16, 1);

      // Cache if this is the first/last chunk and we have a cache key
      if (cacheKey) {
        try {
          await db.ttsCache.add({
            text: cacheKey,
            voiceName: `gemini_${this.config.voiceName}`,
            audioBlob,
            timestamp: Date.now(),
          });
          console.log('💾 Cached Gemini TTS audio');
        } catch (cacheError) {
          console.warn('Failed to cache Gemini audio:', cacheError);
        }
      }

      return audioBlob;

    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        console.warn('%c⏱️ Gemini TTS timeout (>15s)', 'color: #f59e0b; font-weight: bold;');
        console.log('%c🔄 Auto-fallback to Fast Google Cloud TTS', 'background: #3b82f6; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
        // Fallback to fast TTS instead of throwing error
        return this.generateFastTTSChunk(text);
      }
      throw error;
    }
  }

  /**
   * Chunk text into smaller pieces for faster processing with style context
   */
  private chunkText(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) {
      // Add style context for single chunk
      return [`(speaking in a friendly, helpful, and confident tone as Anshika AI assistant) ${text}`];
    }

    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        // Add style context to final chunk
        chunks.push(`(speaking in a friendly, helpful, and confident tone as Anshika AI assistant) ${remaining}`);
        break;
      }

      // Find a good break point (sentence end or word boundary)
      let breakPoint = maxLength;

      // Try to break at sentence end
      const sentenceEnd = remaining.lastIndexOf('.', maxLength);
      if (sentenceEnd > maxLength * 0.7) {
        breakPoint = sentenceEnd + 1;
      } else {
        // Try to break at word boundary
        const spaceIndex = remaining.lastIndexOf(' ', maxLength);
        if (spaceIndex > maxLength * 0.8) {
          breakPoint = spaceIndex;
        }
      }

      // Add style context to each chunk
      const chunk = remaining.substring(0, breakPoint).trim();
      chunks.push(`(speaking in a friendly, helpful, and confident tone as Anshika AI assistant) ${chunk}`);
      remaining = remaining.substring(breakPoint).trim();
    }

    return chunks;
  }

  /**
   * Convert PCM data to WAV format for browser playback
   */
  private pcmToWav(pcmData: Uint8Array, sampleRate: number, bitsPerSample: number, numChannels: number): Blob {
    const dataLength = pcmData.length;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    // WAV file header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // audio format (1 = PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true); // byte rate
    view.setUint16(32, numChannels * bitsPerSample / 8, true); // block align
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    // Copy PCM data
    const uint8View = new Uint8Array(buffer);
    uint8View.set(pcmData, 44);

    return new Blob([buffer], { type: 'audio/wav' });
  }

  /**
   * Play audio blob (for individual chunks - doesn't update global state)
   */
  private playAudioBlob(blob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const audioUrl = URL.createObjectURL(blob);
      this.currentAudio = new Audio(audioUrl);

      this.currentAudio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };

      this.currentAudio.onerror = (error) => {
        URL.revokeObjectURL(audioUrl);
        reject(error);
      };

      this.currentAudio.play().catch(reject);
    });
  }

  /**
   * Play audio blob and update TTS state (for single audio playback)
   */
  private playAudioBlobWithState(blob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const audioUrl = URL.createObjectURL(blob);
      this.currentAudio = new Audio(audioUrl);

      this.currentAudio.onended = () => {
        this.state.isSpeaking = false;
        this.state.isPaused = false;
        this.state.currentText = null;
        this.state.usingFallback = false;
        this.notifyStateChange();
        URL.revokeObjectURL(audioUrl);
        resolve();
      };

      this.currentAudio.onerror = (error) => {
        this.state.isSpeaking = false;
        this.state.isPaused = false;
        this.state.currentText = null;
        this.notifyStateChange();
        URL.revokeObjectURL(audioUrl);
        reject(error);
      };

      this.currentAudio.play().catch(reject);
    });
  }  /**
   * Fallback to Web Speech API
   */
  private async speakWithWebSpeech(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Web Speech API not supported'));
        return;
      }

      this.state.usingFallback = true;
      this.notifyStateChange();

      const utterance = new SpeechSynthesisUtterance(text);
      this.webSpeechUtterance = utterance;

      // Try to find a female voice
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(v => 
        v.name.toLowerCase().includes('female') || 
        v.name.toLowerCase().includes('zira') ||
        v.name.toLowerCase().includes('samantha')
      ) || voices.find(v => v.lang.startsWith('en'));

      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      utterance.rate = this.config.speakingRate;
      utterance.pitch = 1.0;
      utterance.volume = this.state.isMuted ? 0 : 1;

      utterance.onend = () => {
        this.state.isSpeaking = false;
        this.state.isPaused = false;
        this.state.currentText = null;
        this.state.usingFallback = false;
        this.notifyStateChange();
        resolve();
      };

      utterance.onerror = (error) => {
        this.state.isSpeaking = false;
        this.state.isPaused = false;
        this.state.currentText = null;
        this.state.usingFallback = false;
        this.notifyStateChange();
        reject(error);
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Pause current speech
   */
  public pause() {
    if (this.currentAudio && !this.state.isPaused) {
      this.currentAudio.pause();
      this.state.isPaused = true;
      this.notifyStateChange();
    } else if (this.webSpeechUtterance && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      this.state.isPaused = true;
      this.notifyStateChange();
    }
  }

  /**
   * Resume paused speech
   */
  public resume() {
    if (this.currentAudio && this.state.isPaused) {
      this.currentAudio.play();
      this.state.isPaused = false;
      this.notifyStateChange();
    } else if (this.webSpeechUtterance && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      this.state.isPaused = false;
      this.notifyStateChange();
    }
  }

  /**
   * Stop current speech
   */
  public stop() {
    console.log('🛑 Stopping TTS playback');
    
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }

    this.webSpeechUtterance = null;
    
    this.state.isSpeaking = false;
    this.state.isPaused = false;
    this.state.currentText = null;
    this.state.usingFallback = false;
    this.notifyStateChange();
    
    console.log('✅ TTS stopped successfully');
  }

  /**
   * Toggle mute
   */
  public toggleMute() {
    this.state.isMuted = !this.state.isMuted;
    
    if (this.state.isMuted && this.state.isSpeaking) {
      this.stop();
    }
    
    this.notifyStateChange();
  }

  /**
   * Set mute state
   */
  public setMuted(muted: boolean) {
    this.state.isMuted = muted;
    
    if (muted && this.state.isSpeaking) {
      this.stop();
    }
    
    this.notifyStateChange();
  }

  /**
   * Clear cache (for testing or storage management)
   */
  public async clearCache() {
    await db.ttsCache.clear();
    console.log('TTS cache cleared');
  }

  /**
   * Get cache size
   */
  public async getCacheSize(): Promise<number> {
    return await db.ttsCache.count();
  }
}

// Singleton instance
export const ttsService = new TTSService();
