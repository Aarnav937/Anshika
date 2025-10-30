# Voice Controls & Customization Guide

## Overview
Anshika provides comprehensive voice control and customization features for both Text-to-Speech (TTS) and Speech-to-Text (STT) functionality, powered by Google's Gemini 2.5 Flash and advanced speech recognition APIs.

## TTS (Text-to-Speech) Controls

### 🎤 Voice Selection
Access voice settings through the purple microphone button in the top navigation bar.

#### Available Voices
1. **Kore** (Feminine, Warm) - Recommended for general use
2. **Aoede** (Melodic, Pleasant) - Great for storytelling
3. **Puck** (Playful, Friendly) - Perfect for casual conversations
4. **Charon** (Deep, Serious) - Ideal for professional content
5. **Archer** (Confident, Commanding) - Excellent for leadership/motivational content
6. **Fenrir** (Strong, Powerful) - Best for dramatic/announcement content

### 🎛️ Advanced Parameters

#### Speaking Speed
- **Range**: 0.5x to 2.0x
- **Default**: 1.0x (normal speed)
- **Available In**: Both High Quality (Gemini) and Fast (Google Cloud) modes
- **Use Cases**:
  - 0.5x-0.8x: Slow, deliberate speech
  - 1.0x: Natural conversation speed
  - 1.2x-2.0x: Fast, energetic speech

#### Voice Pitch
- **Range**: -10.0 to +10.0 semitones
- **Default**: 0.0 (natural pitch)
- **Available In**: Fast mode (Google Cloud TTS) only
- **Effects**:
  - Negative values: Deeper, more masculine
  - Positive values: Higher, more feminine
  - Extreme values: Cartoon-like effects

#### Volume Gain
- **Range**: -20.0dB to +10.0dB
- **Default**: 0.0dB (normal volume)
- **Available In**: Fast mode (Google Cloud TTS) only
- **Use Cases**:
  - -20dB to -10dB: Quieter, intimate speech
  - 0dB: Normal conversational volume
  - +5dB to +10dB: Louder, attention-grabbing speech

### 🔄 Quality Modes

#### High Quality Mode (Gemini 2.5 Flash TTS)
- **Generation Time**: 3-5 seconds
- **Quality**: Ultra-realistic AI voices
- **Features**: Full parameter control, premium voices
- **Best For**: Important presentations, recordings, professional use

#### Fast Mode (Google Cloud TTS)
- **Generation Time**: 0.5 seconds
- **Quality**: Good neural voices
- **Features**: Limited customization, fast generation
- **Best For**: Quick responses, casual use, when quota is limited

## STT (Speech-to-Text) Controls

### 🎙️ Microphone Settings
Configure speech recognition through the voice settings panel.

#### Language Selection
- **Primary**: English (en-US)
- **Support**: Additional languages available based on browser support
- **Auto-detection**: Automatic language detection for mixed content

#### Recognition Modes
- **Continuous**: Real-time transcription
- **Command**: Triggered by wake words
- **Manual**: Push-to-talk activation

### 🔧 Advanced STT Options

#### Sensitivity Settings
- **High Sensitivity**: Picks up quiet speech, may include background noise
- **Medium Sensitivity**: Balanced for normal conversation
- **Low Sensitivity**: Filters background noise, requires clear speech

#### Noise Suppression
- **Auto**: Automatic background noise filtering
- **Manual**: User-adjustable noise gate
- **Off**: No noise filtering (for quiet environments)

## Real-time Controls

### During Playback
- **Pause/Resume**: Control speech playback
- **Stop**: Immediately halt speech generation
- **Mute**: Temporarily silence all TTS output

### Live Parameter Adjustment
- **Immediate Effect**: Changes apply instantly to current speech
- **Preview**: Test settings with sample text
- **Reset**: Return to default settings

## Integration Features

### 🤖 Auto-Speak AI Responses
- **Toggle**: Automatically speak AI responses
- **Smart Detection**: Only speaks completed responses
- **Queue Management**: Handles multiple responses in sequence

### 🎯 Context-Aware Speech
- **Personality Matching**: Voice adapts to conversation context
- **Emotion Detection**: Dynamic voice adjustments based on content
- **Language Switching**: Automatic language detection and switching

## Accessibility Features

### 🖱️ Keyboard Shortcuts
- `Ctrl/Cmd + V`: Open voice settings
- `Space`: Pause/Resume speech
- `Escape`: Stop speech
- `M`: Toggle mute

### 📱 Mobile Optimization
- **Touch Controls**: Large, accessible buttons
- **Gesture Support**: Swipe gestures for parameter adjustment
- **Haptic Feedback**: Vibration for button presses

### 👁️ Visual Indicators
- **Speaking Indicator**: Animated microphone icon
- **Status Display**: Current voice and parameter values
- **Error Notifications**: Clear error messages with solutions

## Performance Tips

### ⚡ Optimization Strategies

#### For Speed
- Use Fast Mode for quick responses
- Enable caching for repeated phrases
- Pre-load common responses

#### For Quality
- Use High Quality Mode for important content
- Adjust parameters gradually for best results
- Test settings with sample text before use

#### For Battery Life
- Reduce speech rate for longer playback
- Use caching to minimize API calls
- Enable auto-mute when not in use

## Troubleshooting

### TTS Issues

#### No Audio Output
1. Check browser audio permissions
2. Verify system audio settings
3. Test with different browser
4. Check mute status in application

#### Poor Voice Quality
1. Switch to High Quality Mode
2. Adjust pitch and speed parameters
3. Try different voice options
4. Check internet connection stability

#### Slow Generation
1. Temporarily use Fast Mode
2. Check API quota status
3. Clear cache to free resources
4. Verify internet connection

### STT Issues

#### Recognition Not Working
1. Check microphone permissions
2. Test microphone in system settings
3. Try different microphone device
4. Check for background noise

#### Inaccurate Transcription
1. Speak clearly and at normal pace
2. Reduce background noise
3. Adjust sensitivity settings
4. Try different language settings

## Advanced Configuration

### Custom Voice Profiles
Save and load custom voice configurations:
```json
{
  "name": "Professional Presentation",
  "voiceName": "Archer",
  "speakingRate": 0.9,
  "pitch": -1.0,
  "volumeGainDb": 2.0,
  "useHighQuality": true
}
```

### API Integration
For developers integrating with TTS:
```typescript
// Direct TTS service usage
import { ttsService } from './services/ttsService';

// Configure custom settings
ttsService.updateConfig({
  voiceName: 'Kore',
  speakingRate: 1.1,
  pitch: 0.5,
  volumeGainDb: 1.0
});

// Generate speech
await ttsService.speak('Hello, world!');
```

## Best Practices

### 🎯 Voice Selection Guidelines

#### For Different Content Types
- **Educational**: Kore or Aoede (clear, pleasant)
- **Professional**: Charon or Archer (authoritative)
- **Entertainment**: Puck (engaging, fun)
- **Motivational**: Archer or Fenrir (inspiring, powerful)

#### For Different Audiences
- **Children**: Aoede or Puck (friendly, approachable)
- **Adults**: Kore or Charon (professional, natural)
- **Large Groups**: Archer or Fenrir (projecting, commanding)

### 🔧 Parameter Tuning

#### Finding the Right Settings
1. Start with default settings
2. Adjust one parameter at a time
3. Test with sample text
4. Get feedback from listeners
5. Save successful configurations

#### Common Adjustments
- **Too Fast**: Reduce speaking rate by 0.1-0.2
- **Too Slow**: Increase speaking rate by 0.1-0.2
- **Too High/Low**: Adjust pitch by 1-2 semitones
- **Too Quiet/Loud**: Adjust volume by 2-5 dB

## Future Features

### 🚀 Planned Enhancements
- **Voice Cloning**: Create custom voices from recordings
- **Emotion Control**: Dynamic emotional expression
- **Multi-speaker**: Multiple voices in single audio
- **Real-time Effects**: Audio filters and processing
- **Language Expansion**: Support for additional languages

### 🔬 Experimental Features
- **Context Awareness**: Voice adapts to conversation topics
- **User Preference Learning**: Automatic setting optimization
- **Cross-device Sync**: Settings sync across devices
- **Offline Mode**: Local voice generation

---

*Master your voice experience with Anshika's comprehensive customization options, ensuring every interaction sounds perfect.*</content>
<parameter name="filePath">c:\Users\Aarnav\Desktop\Anshika\docs\voice-controls-customization.md