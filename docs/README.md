# A.N.S.H.I.K.A. Documentation

## Overview

A.N.S.H.I.K.A. (AI Neural System for Human Interaction, Knowledge Acquisition) is a comprehensive AI-powered chatbot application built with modern web technologies. It provides seamless interaction with AI models through both online (Gemini) and offline (Ollama) modes, featuring advanced document intelligence, image generation, task management, and multimodal capabilities.

## Key Features

- **Dual AI Modes**: Switch between online (Gemini 2.0 Flash) and offline (Ollama) AI processing
- **Document Intelligence**: Upload, analyze, compare, and search through documents with AI-powered insights
- **Image Generation**: Create images using Gemini's advanced image generation capabilities
- **Task Management**: Built-in task tracking and management system
- **Multimodal Interface**: Text-to-speech, speech-to-text, and voice interactions
- **Personality System**: Dynamic AI personality adaptation based on context and user interaction
- **Tool Integration**: Web search, weather information, time/date services, and custom tools
- **Cross-Platform**: Web application with Electron support for desktop deployment

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom cosmic theme
- **State Management**: React Context + Custom Hooks
- **AI Services**: Google Gemini API, Ollama (local models)
- **File Processing**: PDF.js, Mammoth.js, File Type detection
- **Storage**: IndexedDB (Dexie) + Local Storage
- **Build Tools**: Vite, ESLint, Vitest, Electron Builder
- **Deployment**: Web (Vite preview) + Desktop (Electron)

## Documentation Structure

This documentation is organized into the following sections:

### Core Documentation
- **[Architecture](architecture.md)** - System design, components, and data flow
- **[Features](features.md)** - Detailed feature descriptions and capabilities
- **[API Integration](api-integration.md)** - External services and API configurations
- **[Development](development.md)** - Setup, build process, and development workflow

### Technical Documentation
- **[Components](components.md)** - UI components and their usage
- **[Services](services.md)** - Backend services and business logic
- **[Types](types.md)** - TypeScript interfaces and type definitions
- **[Configuration](configuration.md)** - Environment variables and settings

### Operational Documentation
- **[Deployment](deployment.md)** - Build and deployment procedures
- **[Testing](testing.md)** - Testing setup and guidelines
- **[Security](security.md)** - Security considerations and best practices
- **[Performance](performance.md)** - Optimization techniques and monitoring

### User-Facing Documentation
- **[Accessibility](accessibility.md)** - Accessibility features and compliance
- **[Internationalization](internationalization.md)** - Multi-language support
- **[Monitoring](monitoring.md)** - Logging and error tracking
- **[Troubleshooting](troubleshooting.md)** - Common issues and solutions

### Project Management
- **[Contributing](contributing.md)** - Contribution guidelines and processes
- **[Changelog](changelog.md)** - Version history and release notes
- **[Roadmap](roadmap.md)** - Future development plans and features

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd anshika-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## Support

For questions, issues, or contributions, please refer to:
- [Contributing Guidelines](contributing.md)
- [Troubleshooting Guide](troubleshooting.md)
- [Development Setup](development.md)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

*Last updated: October 30, 2025*</content>
<parameter name="filePath">c:\Users\Aarnav\Desktop\Anshika\docs\README.md