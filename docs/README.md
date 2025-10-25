# A.N.S.H.I.K.A. Application - Complete Documentation

## Overview

This is a sophisticated AI-powered Anshika application built with React, TypeScript, and Vite. The application provides a dual-mode AI chat experience with extensive document processing, image generation, voice integration, and tool-based interactions.

## Architecture

### Technology Stack

**Frontend Framework:**
- React 18.2.0 with TypeScript
- Vite for build tooling and development server
- Tailwind CSS for styling with custom components
- Framer Motion for animations

**AI Integration:**
- Google Gemini API (online mode) - supports function calling and tool integration
- Ollama (offline mode) - local AI models with model selection
- Dual-mode switching with seamless transitions

**Document Processing:**
- PDF.js for PDF text extraction
- Mammoth.js for Word document processing
- Tesseract.js for OCR on images
- File type detection and validation
- Document analysis with AI-powered summarization

**Voice & Audio:**
- Web Speech API for speech recognition
- Voice-controlled interactions

**Data Management:**
- IndexedDB with Dexie for local storage
- LZ-String for data compression
- Conversation branching and tagging system
- Document storage and search indexing

**Tools & Integrations:**
- Web search functionality
- Weather information (current and forecast)
- Time/date services with timezone support
- Task management system
- Reminder system
- Image generation with AI

### Project Structure

```
src/
├── components/          # React components
│   ├── ChatInterface.tsx           # Main chat UI with message handling
│   ├── DocumentWorkspace.tsx       # Document upload and processing
│   ├── ImageGeneration/            # AI image generation components
│   ├── MessageBubble.tsx           # Individual message display
│   ├── ModelSelector.tsx           # AI model selection for offline mode
│   ├── TemperatureControl.tsx      # AI creativity control
│   ├── VoiceControlButton.tsx      # Voice interaction controls
│   └── ... (40+ additional components)
├── contexts/
│   └── ChatContext.tsx             # Global chat state management
├── hooks/                          # Custom React hooks
│   ├── useChatStore.ts            # Chat state logic
│   ├── useDocumentProcessing.ts   # Document analysis hooks
│   ├── useVoiceIntegration.ts     # Voice synthesis/recognition
│   ├── useIntentDetection.ts      # Natural language intent parsing
│   └── ... (15+ additional hooks)
├── services/                       # Business logic and API integrations
│   ├── geminiService.ts           # Google Gemini AI integration
│   ├── ollamaService.ts           # Local Ollama AI integration
│   ├── toolManager.ts             # AI tool orchestration
│   ├── documentIntelligence/      # Document analysis services
│   ├── image/                     # Image generation services
│   ├── voiceSynthesisService.ts   # Text-to-speech
│   ├── voiceRecognitionService.ts # Speech-to-text
│   └── ... (25+ additional services)
├── types/                         # TypeScript type definitions
│   ├── conversation.ts            # Chat conversation types
│   ├── document.ts                # Document processing types
│   ├── imageGeneration.ts         # Image creation types
│   └── index.ts                   # Main type exports
├── utils/                         # Utility functions
└── tests/                         # Test files
```

## Core Features

### 1. Dual-Mode AI Chat

**Online Mode (Gemini):**
- Powered by Google Gemini 2.0 Flash API
- Function calling and tool integration
- Web search capabilities
- Streaming responses
- Temperature control (0.1 - 1.0)

**Offline Mode (Ollama):**
- Local AI models (Llama, Mistral, etc.)
- Model selection interface
- Privacy-focused (no data sent to external APIs)
- Configurable temperature settings

**Mode Switching:**
- Seamless transition between online/offline
- Visual indicators for connection status
- Automatic model preloading

### 2. Advanced Chat Features

**Message Management:**
- Edit messages with AI regeneration
- Pin important messages
- Delete individual messages
- Message reactions and threading
- Undo/redo functionality

**Command System:**
- Slash commands (`/help`, `/clear`, `/imagine`, etc.)
- Command autocomplete with suggestions
- Natural language to command conversion
- Intent detection for automatic command execution

**Conversation Management:**
- Conversation branching and forking
- Tagging system with predefined categories
- Search and filtering
- Archive/pin conversations
- Export capabilities

### 3. Document Intelligence

**File Processing:**
- Support for PDF, Word (.docx), Text, and Images
- OCR for scanned documents
- Automatic file type detection
- Progress tracking and error handling

**AI-Powered Analysis:**
- Document summarization
- Key topic extraction
- Entity recognition (people, organizations, dates)
- Document type classification
- Confidence scoring

**Document Workspace:**
- Batch upload with queue management
- Document search and filtering
- Comparison tools
- Insights panel with analytics
- Question-answering over documents

### 4. Image Generation

**AI Image Creation:**
- Text-to-image generation
- Voice-controlled image creation
- Multiple style options
- Image storage and management
- Export capabilities

**Integration Features:**
- Chat-based image generation (`/imagine` command)
- Voice prompts for hands-free creation
- Image editing and manipulation

### 5. Voice Integration

**Speech Recognition:**
- Real-time speech-to-text
- Voice activity detection
- Auto-send functionality
- Confidence scoring


**Voice Commands:**
- Spacebar activation
- Voice-controlled chat
- Voice image generation
- Accessibility features

### 6. Tool Ecosystem

**Available Tools:**
- **Web Search:** Real-time information retrieval
- **Weather:** Current conditions and forecasts
- **Time/Date:** Timezone-aware time services
- **Tasks:** Todo list management
- **Reminders:** Scheduled notifications
- **Calculator:** Mathematical computations

**Tool Integration:**
- Function calling in Gemini API
- Tool result formatting
- Error handling and fallbacks
- Tool enable/disable controls

### 7. Accessibility & UX

**Keyboard Navigation:**
- Full keyboard accessibility
- Custom shortcuts (`Ctrl+/` for help, `?` for shortcuts)
- Focus management
- Screen reader support

**Visual Design:**
- Dark/light theme support
- Responsive design
- Smooth animations
- Loading states and feedback

**Performance:**
- Lazy loading of components
- Efficient state management
- Data compression
- Background processing

## Configuration

### Environment Variables

```bash
# Required for Gemini API
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### Build Configuration

**Vite Config (`vite.config.ts`):**
- React plugin with SWC
- Development server on port 3000
- Host binding for network access

**TypeScript Config:**
- Strict type checking
- React JSX transform
- Path mapping for clean imports

**Tailwind Config:**
- Component scanning in src/
- Custom theme extensions
- Plugin support

### Testing Setup

**Jest Configuration:**
- TypeScript support with ts-jest
- JSDOM environment for DOM testing
- Setup files for test initialization
- Coverage collection
- Module mocking for CSS and assets

## API Integrations

### Google Gemini API

**Endpoints Used:**
- `generateContent` for chat completion
- `files` for document upload
- Streaming responses with function calling

**Features:**
- Multi-modal input (text, images)
- Function calling for tools
- Safety settings and content filtering
- Token usage tracking

### Ollama API

**Local AI Models:**
- REST API integration
- Model management
- Streaming responses
- Custom model configurations

### External Services

**Web Search:**
- Custom search implementation
- Result formatting and display

**Weather API:**
- Location-based weather data
- Forecast capabilities

**Time Services:**
- Timezone database integration
- Date calculations and formatting

## Data Flow

### Chat Flow

1. **User Input** → Command parsing or natural language
2. **Intent Detection** → Automatic command conversion
3. **AI Processing** → Gemini/Ollama API calls
4. **Tool Execution** → Function calling for external tools
5. **Response Generation** → Streaming or complete responses
6. **Voice Response** → Audio feedback

### Document Flow

1. **File Upload** → Validation and queuing
2. **Text Extraction** → OCR/PDF parsing
3. **AI Analysis** → Summarization and entity extraction
4. **Storage** → IndexedDB with compression
5. **Search/Indexing** → Full-text search capabilities

### Voice Flow

1. **Speech Recognition** → Web Speech API
2. **Text Processing** → Command parsing
3. **AI Response** → Chat processing
4. **Voice Response** → Audio feedback

## State Management

### Global State (ChatContext)

**Chat State:**
- Messages array with metadata
- Current mode (online/offline)
- Selected models and temperatures
- Voice settings and status
- Loading states

**Document State:**
- Upload queue and progress
- Processed documents
- Search filters and results
- Analysis results

**UI State:**
- Active tabs and panels
- Modal states
- Keyboard shortcut overlays

### Local Storage

**IndexedDB Tables:**
- Conversations with branching
- Document metadata and content
- Image generations
- Task lists and reminders
- User preferences

## Error Handling

### API Error Handling

**Gemini API:**
- Rate limiting with backoff
- Fallback to offline mode
- Error message formatting
- Retry logic for transient failures

**Ollama API:**
- Model availability checking
- Local service health monitoring
- Graceful degradation

### User-Facing Errors

**Toast Notifications:**
- Success/error/info messages
- Undo functionality for destructive actions
- Auto-dismiss with manual close

**Inline Error States:**
- Form validation feedback
- Upload progress with error details
- Voice recognition status

## Performance Optimizations

### Code Splitting
- Dynamic imports for heavy components
- Route-based code splitting
- Service worker for caching

### Memory Management
- Document content streaming
- Image lazy loading
- Conversation pagination
- Automatic cleanup of old data

### Network Optimization
- API response compression
- Caching strategies
- Background sync for offline mode
- Progressive loading

## Security Considerations

### API Key Management
- Environment variable storage
- No client-side key exposure
- Secure key rotation

### Data Privacy
- Local storage for sensitive data
- Offline mode for privacy
- Data encryption at rest

### Content Safety
- AI content filtering
- User input sanitization
- XSS protection with DOMPurify

## Development Workflow

### Build Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Production build
npm run preview      # Preview production build

# Testing
npm run test         # Run test suite
npm run test:watch   # Watch mode testing
npm run test:coverage # Coverage report

# Code Quality
npm run lint         # ESLint checking
```

### Development Tools

**Hot Reload:**
- Vite's instant HMR
- React Fast Refresh
- CSS hot reloading

**Debugging:**
- React DevTools integration
- Console logging with prefixes
- Network request monitoring

**Testing:**
- Jest with React Testing Library
- Component and hook testing
- Service layer testing
- E2E test capabilities

## Deployment

### Build Process

1. **Type Checking:** `tsc` compilation
2. **Linting:** ESLint code quality checks
3. **Testing:** Jest test execution
4. **Build:** Vite production build
5. **Optimization:** Asset minification and bundling

### Environment Setup

**Production Requirements:**
- Node.js 18+
- Modern browser support
- HTTPS for voice features
- API keys for external services

**Offline Mode Setup:**
- Ollama server running locally
- Model downloads and management
- Local storage permissions

## Future Enhancements

### Planned Features

**Advanced AI Features:**
- Multi-modal conversations (text + images)
- Conversation memory and context
- Custom AI model fine-tuning

**Enhanced Document Processing:**
- Multi-language document support
- Advanced OCR with layout preservation
- Document comparison and diffing

**Collaboration Features:**
- Real-time collaborative chat
- Shared document workspaces
- Team conversation management

**Platform Integration:**
- Desktop app with Electron
- Mobile app with React Native
- API for third-party integrations

### Technical Improvements

**Performance:**
- WebAssembly for heavy computations
- Service worker for offline functionality
- Advanced caching strategies

**Scalability:**
- Microservices architecture
- Database integration
- Cloud deployment options

**Accessibility:**
- Advanced screen reader support
- Voice navigation
- Customizable interface themes

## Troubleshooting

### Common Issues

**API Connection Problems:**
- Check API key configuration
- Verify network connectivity
- Check API rate limits

**Voice Recognition Issues:**
- Ensure HTTPS for voice features
- Check browser permissions
- Verify microphone access

**Document Processing Errors:**
- Check file format support
- Verify file size limits
- Check OCR model availability

### Debug Information

**Console Logging:**
- API request/response logging
- Performance timing
- Error stack traces

**Network Monitoring:**
- API call inspection
- Response time analysis
- Error status codes

## Contributing

### Code Standards

**TypeScript:**
- Strict type checking enabled
- Interface definitions for all data structures
- Generic types for reusable components

**React:**
- Functional components with hooks
- Custom hooks for shared logic
- Context API for global state

**Styling:**
- Tailwind CSS utility classes
- Component-based styling
- Dark mode support

### Testing Strategy

**Unit Tests:**
- Component rendering tests
- Hook logic testing
- Service function testing

**Integration Tests:**
- API integration testing
- Component interaction testing
- End-to-end user flows

**Performance Testing:**
- Bundle size monitoring
- Runtime performance profiling
- Memory usage analysis

## License and Credits

This project integrates with various open-source libraries and APIs:

- **React & TypeScript:** Core framework
- **Vite:** Build tooling
- **Tailwind CSS:** Styling framework
- **Google Gemini API:** AI capabilities
- **Ollama:** Local AI models
- **PDF.js:** PDF processing
- **Web Speech API:** Voice recognition

## Support

For issues and feature requests, please check the codebase documentation and test suites. The application includes comprehensive error handling and user feedback systems.