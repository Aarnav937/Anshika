# 🎤 Voice Input Feature - Technical Specification & Design Document

## 📋 Overview

This document provides a comprehensive specification for adding **Web Speech API**-based voice input functionality to Anshika AI, complementing the existing Text-to-Speech (TTS) system.

---

## 🎯 Goals

### Primary Objectives
1. Enable users to talk to Anshika instead of typing
2. Provide real-time speech-to-text transcription
3. Support multiple languages (25+ languages)
4. Create seamless integration with existing chat flow
5. Maintain consistent UX with existing TTS feature

### Non-Goals
- Custom speech recognition models (use browser API only)
- Offline speech recognition
- Voice biometrics or speaker identification
- Voice commands for app navigation

---

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        App.tsx                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          SpeechRecognitionProvider                   │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │            TTSProvider                         │  │  │
│  │  │  ┌──────────────────────────────────────────┐  │  │  │
│  │  │  │         ToastProvider                   │  │  │  │
│  │  │  │  ┌────────────────────────────────────┐  │  │  │  │
│  │  │  │  │        ChatProvider              │  │  │  │  │
│  │  │  │  │  ┌──────────────────────────────┐ │  │  │  │  │
│  │  │  │  │  │      AppContent            │ │  │  │  │  │
│  │  │  │  │  └──────────────────────────────┘ │  │  │  │  │
│  │  │  │  └────────────────────────────────────┘  │  │  │  │
│  │  │  └──────────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   ChatInterface.tsx                          │
│  • Voice input button (🎤)                                  │
│  • Listening indicator banner                               │
│  • Interim transcript display                               │
│  • Integration with message sending                         │
└─────────────────────────────────────────────────────────────┘

                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              VoiceSettingsPanel.tsx                          │
│  ┌──────────────────┬──────────────────────────────────┐   │
│  │   TTS Settings   │     STT Settings                  │   │
│  ├──────────────────┼──────────────────────────────────┤   │
│  │ • Voice select   │ • Language select                │   │
│  │ • Quality mode   │ • Continuous mode                │   │
│  │ • Auto-speak     │ • Auto-send on pause             │   │
│  │ • Speed control  │ • Pause threshold slider         │   │
│  │ • Mute toggle    │ • Real-time status               │   │
│  └──────────────────┴──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         speechRecognitionService.ts                          │
│  • Web Speech API wrapper                                   │
│  • Real-time transcription                                  │
│  • Multi-language support                                   │
│  • Auto-send logic                                          │
│  • Error handling                                           │
│  • State management                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### 1. Speech Recognition Service (`speechRecognitionService.ts`)

#### Core Responsibilities
- Initialize and manage Web Speech API
- Handle continuous vs single-shot recognition
- Detect silence and implement auto-send
- Provide interim and final transcripts
- Manage recognition lifecycle
- Handle errors gracefully

#### API Design

```typescript
interface SpeechRecognitionConfig {
  language: string;                    // Language code (e.g., 'en-US')
  continuous: boolean;                 // Keep listening after pause
  interimResults: boolean;             // Show live transcription
  autoSendOnPause: boolean;           // Auto-send after silence
  pauseThreshold: number;             // Silence duration (ms) before auto-send
}

interface SpeechRecognitionState {
  isListening: boolean;                // Currently recording
  isPaused: boolean;                   // Recognition paused
  currentTranscript: string;           // Current full transcript
  interimTranscript: string;           // Live interim text
  error: string | null;                // Last error message
}

class SpeechRecognitionService {
  // Configuration
  updateConfig(config: Partial<SpeechRecognitionConfig>): void
  getConfig(): SpeechRecognitionConfig
  
  // State
  getState(): SpeechRecognitionState
  onStateChange(callback: (state: SpeechRecognitionState) => void): () => void
  
  // Core methods
  startListening(
    onTranscript: (text: string, isFinal: boolean) => void,
    onError?: (error: string) => void
  ): void
  stopListening(): void
  
  // Utility
  isSupported(): boolean
  getAvailableLanguages(): Array<{ code: string; name: string }>
}
```

#### Key Features

1. **Browser Compatibility Check**
```typescript
isSupported(): boolean {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}
```

2. **Silence Detection for Auto-Send**
```typescript
private silenceTimer: NodeJS.Timeout | null = null;

private resetSilenceTimer() {
  if (this.silenceTimer) clearTimeout(this.silenceTimer);
  
  if (this.config.autoSendOnPause) {
    this.silenceTimer = setTimeout(() => {
      this.finalizeAndSend();
    }, this.config.pauseThreshold);
  }
}
```

3. **Multi-Language Support**
```typescript
getAvailableLanguages() {
  return [
    { code: 'en-US', name: 'English (United States)' },
    { code: 'en-GB', name: 'English (United Kingdom)' },
    { code: 'es-ES', name: 'Spanish (Spain)' },
    { code: 'fr-FR', name: 'French (France)' },
    { code: 'de-DE', name: 'German (Germany)' },
    { code: 'ja-JP', name: 'Japanese (Japan)' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
    { code: 'hi-IN', name: 'Hindi (India)' },
    // ... 25+ total languages
  ];
}
```

4. **Error Handling**
```typescript
private handleError(event: SpeechRecognitionErrorEvent) {
  const errorMessages: Record<string, string> = {
    'no-speech': 'No speech detected. Please try again.',
    'audio-capture': 'No microphone found. Please check your device.',
    'not-allowed': 'Microphone permission denied. Please allow microphone access.',
    'network': 'Network error. Please check your connection.',
    'aborted': 'Recognition was aborted.',
  };
  
  const message = errorMessages[event.error] || 'Speech recognition error occurred.';
  this.state.error = message;
  this.notifyStateChange();
}
```

---

### 2. Speech Recognition Context (`SpeechRecognitionContext.tsx`)

#### Provider Structure
```typescript
interface SpeechRecognitionContextType {
  state: SpeechRecognitionState;
  config: SpeechRecognitionConfig;
  startListening: (
    onTranscript: (text: string, isFinal: boolean) => void,
    onError?: (error: string) => void
  ) => void;
  stopListening: () => void;
  updateConfig: (config: Partial<SpeechRecognitionConfig>) => void;
  isSupported: boolean;
}

export const SpeechRecognitionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SpeechRecognitionState>(
    speechRecognitionService.getState()
  );
  
  useEffect(() => {
    // Subscribe to service state changes
    const unsubscribe = speechRecognitionService.onStateChange(setState);
    return unsubscribe;
  }, []);
  
  // ... provider implementation
};

export const useSpeechRecognition = () => {
  const context = useContext(SpeechRecognitionContext);
  if (!context) {
    throw new Error('useSpeechRecognition must be used within SpeechRecognitionProvider');
  }
  return context;
};
```

---

### 3. Voice Settings Panel (`VoiceSettingsPanel.tsx`)

#### Component Structure
```typescript
interface VoiceSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceSettingsPanel: React.FC<VoiceSettingsPanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'tts' | 'stt'>('tts');
  const { ttsState, autoSpeakEnabled, ... } = useTTS();
  const { state: sttState, config: sttConfig, updateConfig } = useSpeechRecognition();
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Tabs>
        <Tab label="Text-to-Speech" active={activeTab === 'tts'}>
          {/* TTS Settings */}
        </Tab>
        <Tab label="Speech-to-Text" active={activeTab === 'stt'}>
          {/* STT Settings */}
        </Tab>
      </Tabs>
    </Modal>
  );
};
```

#### STT Settings UI Elements

1. **Language Selector**
```typescript
<select 
  value={sttConfig.language} 
  onChange={(e) => updateConfig({ language: e.target.value })}
  className="cosmic-select"
>
  {speechRecognitionService.getAvailableLanguages().map(lang => (
    <option key={lang.code} value={lang.code}>
      {lang.name}
    </option>
  ))}
</select>
```

2. **Continuous Mode Toggle**
```typescript
<Toggle
  checked={sttConfig.continuous}
  onChange={(checked) => updateConfig({ continuous: checked })}
  label="Continuous Listening"
  description="Keep listening for multiple phrases"
/>
```

3. **Auto-Send Toggle**
```typescript
<Toggle
  checked={sttConfig.autoSendOnPause}
  onChange={(checked) => updateConfig({ autoSendOnPause: checked })}
  label="Auto-send on Pause"
  description="Automatically send message after silence"
/>
```

4. **Pause Threshold Slider**
```typescript
<Slider
  min={500}
  max={3000}
  step={100}
  value={sttConfig.pauseThreshold}
  onChange={(value) => updateConfig({ pauseThreshold: value })}
  label={`Pause Threshold: ${sttConfig.pauseThreshold}ms`}
  disabled={!sttConfig.autoSendOnPause}
/>
```

---

### 4. ChatInterface Integration

#### Voice Input Button

```typescript
// State
const { state: sttState, startListening, stopListening } = useSpeechRecognition();
const [interimText, setInterimText] = useState('');

// Handlers
const handleVoiceInput = () => {
  if (sttState.isListening) {
    stopListening();
  } else {
    startListening(
      (transcript, isFinal) => {
        if (isFinal) {
          setInput(prev => prev + transcript);
          setInterimText('');
        } else {
          setInterimText(transcript);
        }
      },
      (error) => {
        showToast(error, 'error');
      }
    );
  }
};

// JSX
<button
  onClick={handleVoiceInput}
  disabled={isLoading || !useSpeechRecognition().isSupported}
  className={`voice-input-button ${sttState.isListening ? 'listening' : ''}`}
  title={sttState.isListening ? 'Stop listening' : 'Start voice input'}
>
  <Mic className={sttState.isListening ? 'animate-pulse' : ''} />
</button>
```

#### Listening Indicator Banner

```typescript
{sttState.isListening && (
  <div className="listening-banner cosmic-gradient-purple">
    <div className="flex items-center gap-3">
      <Mic className="w-5 h-5 animate-pulse text-white" />
      <div className="flex-1">
        <div className="text-sm font-medium text-white">
          Listening...
        </div>
        {interimText && (
          <div className="text-xs text-purple-200 mt-1">
            "{interimText}"
          </div>
        )}
      </div>
      <button
        onClick={stopListening}
        className="btn-small btn-danger"
      >
        Stop
      </button>
    </div>
  </div>
)}
```

---

## 🎨 Design Specifications

### Visual Elements

#### 1. Microphone Button States

**Idle State (Not Listening)**
- Background: `bg-gradient-to-r from-purple-500 to-purple-600`
- Border: `border-2 border-purple-400`
- Icon color: `text-white`
- Shadow: `shadow-lg`
- Hover: `hover:from-purple-600 hover:to-purple-700`

**Listening State (Active)**
- Background: `bg-gradient-to-r from-red-500 to-red-600`
- Border: `border-2 border-red-400`
- Icon: `text-white animate-pulse`
- Pulse effect: Outer ring animation
- Shadow: `shadow-xl`

**Disabled State**
- Background: `bg-gradient-to-r from-gray-400 to-gray-500`
- Border: `border-2 border-gray-300`
- Icon: `text-gray-200`
- Cursor: `cursor-not-allowed`
- Opacity: `opacity-60`

#### 2. Listening Banner

**Design**
- Full-width banner above input area
- Background: `bg-gradient-to-r from-purple-600/90 to-pink-600/90`
- Backdrop blur: `backdrop-blur-md`
- Padding: `p-4`
- Border radius: `rounded-xl`
- Animation: Slide down from top

**Elements**
- Animated microphone icon (pulse)
- "Listening..." text
- Interim transcript in smaller text
- Stop button (red, rounded)

#### 3. Voice Settings Panel

**Tab Design**
- Two tabs: "Text-to-Speech" | "Speech-to-Text"
- Active tab: Purple gradient underline
- Inactive tab: Gray text
- Smooth transition on tab switch

**Layout**
- Modal overlay: `bg-black/50 backdrop-blur-sm`
- Panel: Cosmic gradient background
- Max width: `max-w-2xl`
- Border: `border-2 border-purple-400/30`
- Shadow: `shadow-2xl`

**Components**
- Consistent toggle switches (cosmic theme)
- Sliders with gradient tracks
- Dropdown selectors with hover states
- Status indicators (colored dots)

---

## 🔄 User Flows

### Flow 1: Voice Input (Manual Send)

```
1. User clicks microphone button 🎤
   ↓
2. Button turns red, starts pulsing
   ↓
3. Listening banner appears
   ↓
4. User speaks: "What is the weather today?"
   ↓
5. Interim transcript shows in banner
   ↓
6. User clicks Stop or microphone button again
   ↓
7. Final transcript populates input field
   ↓
8. User reviews text
   ↓
9. User clicks Send button
   ↓
10. Message sent to AI
```

### Flow 2: Voice Input (Auto-Send)

```
1. User enables "Auto-send on pause" in settings
   ↓
2. User clicks microphone button 🎤
   ↓
3. Button turns red, starts pulsing
   ↓
4. User speaks: "Tell me a joke"
   ↓
5. Interim transcript shows live
   ↓
6. User pauses for 1.5 seconds (default threshold)
   ↓
7. System detects silence
   ↓
8. Final transcript sent automatically
   ↓
9. AI responds immediately
   ↓
10. Microphone stops, button returns to purple
```

### Flow 3: Error Handling

```
1. User clicks microphone button
   ↓
2. Browser requests microphone permission
   ↓
3. User denies permission
   ↓
4. Error toast appears: "Microphone permission denied"
   ↓
5. Button stays purple (idle)
   ↓
6. User can try again or use keyboard
```

---

## 📱 Responsive Design

### Mobile Considerations

1. **Touch Targets**
   - Minimum button size: `48px × 48px`
   - Adequate spacing between buttons
   - Touch-friendly tap areas

2. **Banner Layout**
   - Stack elements vertically on small screens
   - Reduce padding on mobile
   - Ensure text remains readable

3. **Settings Panel**
   - Full-screen on mobile devices
   - Larger form controls
   - Sticky header for tabs

### Tablet & Desktop

- Maintain fixed button sizes
- Use hover states
- Show tooltips on hover
- Multi-column layouts where appropriate

---

## ♿ Accessibility

### ARIA Labels

```typescript
<button
  aria-label={sttState.isListening ? 'Stop voice input' : 'Start voice input'}
  aria-pressed={sttState.isListening}
  role="button"
>
  <Mic aria-hidden="true" />
</button>
```

### Live Regions

```typescript
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {sttState.isListening ? 'Voice input active. Listening...' : 'Voice input inactive'}
</div>
```

### Keyboard Navigation

- All buttons focusable via Tab
- Enter/Space to activate
- Escape to stop listening
- Focus indicators visible

---

## 🧪 Testing Strategy

### Unit Tests
- [ ] Speech recognition service initialization
- [ ] Language selection
- [ ] Auto-send logic
- [ ] Error handling
- [ ] State management

### Integration Tests
- [ ] Context provider integration
- [ ] ChatInterface integration
- [ ] Settings panel communication
- [ ] Toast notifications

### Browser Tests
- [ ] Chrome/Chromium (primary)
- [ ] Edge
- [ ] Safari
- [ ] Firefox (limited support warning)

### Manual Tests
- [ ] Voice input in different languages
- [ ] Continuous mode functionality
- [ ] Auto-send after pause
- [ ] Interim transcript display
- [ ] Error scenarios (no mic, denied permission)
- [ ] Dark mode compatibility
- [ ] Mobile responsiveness

---

## 📊 Performance Considerations

### Optimization Strategies

1. **Lazy Loading**
   - Load speech recognition only when needed
   - Don't initialize until first use

2. **Resource Cleanup**
   - Stop recognition on component unmount
   - Clear timers and event listeners
   - Release microphone access

3. **State Updates**
   - Debounce interim transcript updates
   - Batch state changes
   - Minimize re-renders

4. **Memory Management**
   - No audio recording/storage
   - Use browser's native processing
   - Clean up references

---

## 🔐 Privacy & Security

### Data Handling

1. **No Server Storage**
   - All speech processing in browser
   - No transcripts sent to external servers
   - Web Speech API uses browser vendor's service

2. **User Consent**
   - Explicit microphone permission request
   - Clear indication when listening
   - Easy way to stop

3. **Local Settings**
   - Preferences stored in localStorage
   - No sensitive data in settings
   - User can clear anytime

---

## 🚀 Future Enhancements

### Phase 2 Features (Not in Current Scope)

1. **Voice Commands**
   - "Send" to send message
   - "Cancel" to discard
   - "New line" for formatting

2. **Custom Wake Words**
   - "Hey Anshika" activation
   - Hands-free operation

3. **Noise Cancellation**
   - Background noise filtering
   - Echo cancellation

4. **Transcript Editing**
   - Edit recognized text before sending
   - Inline corrections

5. **Offline Support**
   - Downloaded language models
   - Works without internet

6. **Voice Biometrics**
   - Speaker identification
   - Personalized responses

---

## 📚 References

- [Web Speech API MDN Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [SpeechRecognition Interface](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
- [Browser Compatibility](https://caniuse.com/speech-recognition)
- Existing TTS implementation in codebase

---

## ✅ Success Metrics

### User Experience
- [ ] Voice input button easily discoverable
- [ ] Clear visual feedback when listening
- [ ] Accurate transcription (browser-dependent)
- [ ] Smooth integration with chat flow
- [ ] Intuitive settings panel

### Technical
- [ ] No console errors
- [ ] Proper cleanup on unmount
- [ ] Settings persist correctly
- [ ] Error handling graceful
- [ ] Performance impact minimal

### Accessibility
- [ ] WCAG 2.1 AA compliant
- [ ] Screen reader compatible
- [ ] Keyboard navigable
- [ ] Focus indicators visible
- [ ] ARIA labels present

---

**This specification serves as the complete blueprint for implementing the voice input feature. All implementation should follow this design to ensure consistency, quality, and maintainability.**
