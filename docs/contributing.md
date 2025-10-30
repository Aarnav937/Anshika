# Contributing Documentation

## Overview

Welcome to A.N.S.H.I.K.A.! We welcome contributions from the community. This document provides guidelines and information for contributors to help ensure smooth collaboration and maintain code quality.

## Getting Started

### Development Environment Setup

```bash
# Clone the repository
git clone https://github.com/your-org/anshika.git
cd anshika

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Configure your API keys
# Edit .env.local with your API keys

# Start development server
npm run dev
```

### Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **Git**: Version 2.30.0 or higher
- **API Keys**: Gemini API key (required), Weather API key (optional), Web Search API key (optional)

### Development Scripts

```json
// package.json scripts
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint src --ext ts,tsx --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write src/**/*.{ts,tsx,css,md}",
    "format:check": "prettier --check src/**/*.{ts,tsx,css,md}",
    "electron": "electron .",
    "electron:build": "npm run build && electron-builder",
    "docs:build": "npm run build && cp -r docs dist/",
    "clean": "rm -rf dist node_modules/.vite"
  }
}
```

## Development Workflow

### Branching Strategy

We use a simplified Git Flow branching model:

```
main (production-ready)
├── develop (integration branch)
│   ├── feature/feature-name
│   ├── bugfix/bug-description
│   └── hotfix/critical-fix
```

#### Branch Naming Conventions

- **Features**: `feature/description-of-feature`
- **Bug Fixes**: `bugfix/description-of-bug`
- **Hotfixes**: `hotfix/description-of-fix`
- **Documentation**: `docs/description-of-docs`

### Commit Message Guidelines

We follow the [Conventional Commits](https://conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Commit Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

#### Examples

```
feat: add voice input for chat messages

fix: resolve memory leak in document processing

docs: update API documentation for chat service

style: format code with prettier

refactor: simplify chat context logic

test: add unit tests for message validation

chore: update dependencies
```

### Pull Request Process

1. **Create a Branch**: Create a feature branch from `develop`
2. **Make Changes**: Implement your changes with tests
3. **Run Tests**: Ensure all tests pass
4. **Update Documentation**: Update docs if needed
5. **Commit Changes**: Use conventional commit messages
6. **Create PR**: Push to your branch and create a pull request
7. **Code Review**: Address review feedback
8. **Merge**: Squash merge to `develop` after approval

#### Pull Request Template

```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change
- [ ] Documentation update
- [ ] Refactoring
- [ ] Test addition/update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] All tests pass

## Screenshots (if applicable)
Add screenshots of UI changes.

## Checklist
- [ ] Code follows project style guidelines
- [ ] Documentation updated
- [ ] Tests added for new functionality
- [ ] All CI checks pass
- [ ] Reviewed by at least one maintainer
```

## Code Quality Standards

### TypeScript Guidelines

```typescript
// ✅ Good: Use explicit types
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

// ✅ Good: Use union types for constrained values
type MessageRole = 'user' | 'assistant' | 'system';

// ✅ Good: Use generics for reusable components
interface ApiResponse<T> {
  data: T;
  error?: string;
  status: number;
}

// ❌ Bad: Avoid any type
function processData(data: any) { // Use unknown or proper types
  // ...
}

// ❌ Bad: Avoid implicit any
const users = []; // Specify type: User[]
```

### React Best Practices

```typescript
// ✅ Good: Use functional components with hooks
const ChatMessage: React.FC<ChatMessageProps> = ({ message, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="message">
      {isEditing ? (
        <MessageEditor
          message={message}
          onSave={(edited) => {
            onEdit(edited);
            setIsEditing(false);
          }}
        />
      ) : (
        <MessageDisplay message={message} onEdit={() => setIsEditing(true)} />
      )}
    </div>
  );
};

// ✅ Good: Use custom hooks for complex logic
const useChatMessages = (conversationId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    setLoading(true);
    try {
      const newMessage = await chatService.sendMessage(conversationId, content);
      setMessages(prev => [...prev, newMessage]);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  return { messages, loading, sendMessage };
};

// ❌ Bad: Avoid class components (unless necessary)
class ChatMessage extends React.Component {
  // ...
}
```

### Component Structure

```typescript
// src/components/ChatInterface/index.ts
export { ChatInterface } from './ChatInterface';
export type { ChatInterfaceProps } from './ChatInterface';

// src/components/ChatInterface/ChatInterface.tsx
import React from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useChatMessages } from '../../hooks/useChatMessages';

export interface ChatInterfaceProps {
  conversationId: string;
  className?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  conversationId,
  className
}) => {
  const { messages, loading, sendMessage } = useChatMessages(conversationId);

  return (
    <div className={`chat-interface ${className || ''}`}>
      <MessageList messages={messages} />
      <MessageInput
        onSend={sendMessage}
        disabled={loading}
      />
    </div>
  );
};

// src/components/ChatInterface/MessageList.tsx
// Component implementation...

// src/components/ChatInterface/MessageInput.tsx
// Component implementation...

// src/components/ChatInterface/__tests__/ChatInterface.test.tsx
// Tests...
```

### Testing Guidelines

#### Unit Tests

```typescript
// src/components/ChatInterface/__tests__/ChatInterface.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInterface } from '../ChatInterface';
import { ChatProvider } from '../../../contexts/ChatContext';

const renderChatInterface = (props: Partial<ChatInterfaceProps> = {}) => {
  const defaultProps: ChatInterfaceProps = {
    conversationId: 'test-conversation',
    ...props
  };

  return render(
    <ChatProvider>
      <ChatInterface {...defaultProps} />
    </ChatProvider>
  );
};

describe('ChatInterface', () => {
  it('renders message list and input', () => {
    renderChatInterface();

    expect(screen.getByRole('list', { name: /messages/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /message input/i })).toBeInTheDocument();
  });

  it('sends message when form is submitted', async () => {
    const mockSendMessage = jest.fn();
    // Mock the chat service...

    renderChatInterface();

    const input = screen.getByRole('textbox', { name: /message input/i });
    const submitButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Hello, world!' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Hello, world!');
    });
  });

  it('shows loading state while sending', async () => {
    // Test loading state...
  });
});
```

#### Integration Tests

```typescript
// src/__tests__/integration/ChatFlow.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../../App';
import { chatService } from '../../services/ChatService';

describe('Chat Flow Integration', () => {
  beforeEach(() => {
    // Reset services and mocks
    jest.clearAllMocks();
  });

  it('completes full chat interaction', async () => {
    // Mock API responses
    chatService.sendMessage = jest.fn().mockResolvedValue({
      id: 'msg-1',
      role: 'assistant',
      content: 'Hello! How can I help you?',
      timestamp: new Date()
    });

    render(<App />);

    // Navigate to chat
    const chatLink = screen.getByRole('link', { name: /chat/i });
    fireEvent.click(chatLink);

    // Type and send message
    const messageInput = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(messageInput, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);

    // Wait for response
    await waitFor(() => {
      expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument();
    });

    // Verify message was sent to service
    expect(chatService.sendMessage).toHaveBeenCalledWith('Hello');
  });
});
```

#### End-to-End Tests

```typescript
// e2e/chat.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Chat Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('user can send and receive messages', async ({ page }) => {
    // Intercept API calls
    await page.route('**/generativelanguage.googleapis.com/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [{
            content: {
              parts: [{ text: 'Hello! How can I help you today?' }]
            }
          }]
        })
      });
    });

    // Navigate to chat
    await page.click('text=Chat');

    // Send message
    await page.fill('[data-testid="message-input"]', 'Hello');
    await page.click('[data-testid="send-button"]');

    // Verify response
    await expect(page.locator('[data-testid="message-content"]').last()).toContainText('Hello! How can I help you today?');
  });

  test('handles API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/generativelanguage.googleapis.com/**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await page.click('text=Chat');
    await page.fill('[data-testid="message-input"]', 'Test message');
    await page.click('[data-testid="send-button"]');

    // Verify error handling
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });
});
```

### Code Style and Formatting

#### ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:jsx-a11y/recommended'
  ],
  ignorePatterns: ['dist', '.eslintrc.js'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname
  },
  plugins: ['react-refresh', 'jsx-a11y'],
  rules: {
    // TypeScript rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',

    // React rules
    'react/prop-types': 'off', // Using TypeScript for prop validation
    'react/jsx-uses-react': 'off',
    'react/react-in-jsx-scope': 'off',

    // General rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error'
  }
};
```

#### Prettier Configuration

```javascript
// .prettierrc.js
module.exports = {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  arrowParens: 'avoid',
  endOfLine: 'lf'
};
```

### Documentation Standards

#### Component Documentation

```typescript
// src/components/ChatInterface/ChatInterface.tsx
import React from 'react';

/**
 * Main chat interface component that displays messages and handles user input.
 *
 * @param conversationId - Unique identifier for the conversation
 * @param className - Optional CSS class name for styling
 * @param onMessageSent - Optional callback fired when a message is sent
 * @param maxMessages - Maximum number of messages to display (default: 100)
 */
export interface ChatInterfaceProps {
  conversationId: string;
  className?: string;
  onMessageSent?: (message: Message) => void;
  maxMessages?: number;
}

/**
 * ChatInterface provides a complete chat experience with message display,
 * input handling, and real-time updates. It integrates with the chat service
 * to send and receive messages.
 *
 * Features:
 * - Real-time message display
 * - Message input with validation
 * - Typing indicators
 * - Message status indicators
 * - Auto-scrolling to latest messages
 *
 * @example
 * ```tsx
 * <ChatInterface
 *   conversationId="conv-123"
 *   onMessageSent={(message) => console.log('Message sent:', message)}
 * />
 * ```
 */
export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  conversationId,
  className,
  onMessageSent,
  maxMessages = 100
}) => {
  // Component implementation...
};
```

#### API Documentation

```typescript
// src/services/ChatService.ts
/**
 * Service for handling chat operations with AI models.
 * Supports both online (Gemini) and offline (Ollama) modes.
 */
export class ChatService {
  /**
   * Sends a message to the AI and returns the response.
   *
   * @param conversationId - ID of the conversation
   * @param content - Message content to send
   * @param options - Additional options for the message
   * @returns Promise resolving to the AI response message
   * @throws {Error} When the API call fails or validation fails
   *
   * @example
   * ```typescript
   * const response = await chatService.sendMessage('conv-123', 'Hello, world!');
   * console.log(response.content);
   * ```
   */
  async sendMessage(
    conversationId: string,
    content: string,
    options: SendMessageOptions = {}
  ): Promise<Message> {
    // Implementation...
  }

  /**
   * Retrieves conversation history.
   *
   * @param conversationId - ID of the conversation
   * @param limit - Maximum number of messages to retrieve (default: 50)
   * @param offset - Number of messages to skip (default: 0)
   * @returns Promise resolving to array of messages
   */
  async getConversationHistory(
    conversationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    // Implementation...
  }
}
```

## Security Guidelines

### API Key Handling

```typescript
// ✅ Good: Use environment variables
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

// ❌ Bad: Hardcode API keys
const apiKey = 'AIzaSy...'; // Never do this!

// ✅ Good: Validate API key format
const validateApiKey = (key: string): boolean => {
  return key.startsWith('AIza') && key.length === 39;
};
```

### Input Validation

```typescript
// ✅ Good: Validate and sanitize input
const sanitizeMessage = (content: string): string => {
  return content
    .trim()
    .substring(0, 10000) // Limit length
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''); // Remove scripts
};

const validateMessage = (content: string): boolean => {
  return content.length > 0 &&
         content.length <= 10000 &&
         !/<script/i.test(content); // Basic XSS check
};
```

### Data Sanitization

```typescript
// ✅ Good: Sanitize data before storage/display
const sanitizeUserData = (data: any): any => {
  if (typeof data === 'string') {
    return data.replace(/[<>]/g, ''); // Basic HTML escaping
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeUserData);
  }
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (!['password', 'token', 'secret'].includes(key.toLowerCase())) {
        sanitized[key] = sanitizeUserData(value);
      }
    }
    return sanitized;
  }
  return data;
};
```

## Performance Guidelines

### Component Optimization

```typescript
// ✅ Good: Use React.memo for expensive components
const MessageBubble = React.memo<MessageBubbleProps>(({ message, onClick }) => {
  return (
    <div className="message-bubble" onClick={onClick}>
      {message.content}
    </div>
  );
});

// ✅ Good: Use useMemo for expensive calculations
const filteredMessages = useMemo(() => {
  return messages.filter(message =>
    message.content.toLowerCase().includes(searchTerm.toLowerCase())
  );
}, [messages, searchTerm]);

// ✅ Good: Use useCallback for event handlers
const handleMessageClick = useCallback((messageId: string) => {
  setSelectedMessageId(messageId);
}, []);
```

### Bundle Optimization

```typescript
// ✅ Good: Lazy load heavy components
const DocumentViewer = lazy(() => import('./DocumentViewer'));
const ImageGenerator = lazy(() => import('./ImageGenerator'));

// ✅ Good: Code splitting for routes
const ChatPage = lazy(() => import('./pages/ChatPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));

// ✅ Good: Dynamic imports for libraries
const loadPdfJs = () => import('pdfjs-dist');
```

## Testing Strategy

### Test Coverage Goals

- **Unit Tests**: >80% coverage for utilities and hooks
- **Integration Tests**: >70% coverage for component interactions
- **E2E Tests**: Critical user journeys covered

### Test Categories

1. **Unit Tests**: Test individual functions and components in isolation
2. **Integration Tests**: Test component interactions and service integrations
3. **E2E Tests**: Test complete user workflows
4. **Performance Tests**: Test rendering and runtime performance
5. **Accessibility Tests**: Test WCAG compliance

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

- [ ] All tests pass
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version number updated
- [ ] Build artifacts generated
- [ ] Release notes written
- [ ] Deployment to staging
- [ ] User acceptance testing
- [ ] Production deployment

### Changelog Format

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New feature description

### Changed
- Changed feature description

### Deprecated
- Deprecated feature description

### Removed
- Removed feature description

### Fixed
- Bug fix description

### Security
- Security fix description
```

## Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- Be respectful and inclusive
- Focus on constructive feedback
- Help newcomers learn and contribute
- Report issues or concerns privately
- Follow our community standards

### Getting Help

- **Documentation**: Check the docs first
- **GitHub Issues**: Search existing issues or create new ones
- **Discussions**: Use GitHub Discussions for questions
- **Discord/Slack**: Join our community chat

### Recognition

Contributors are recognized through:

- GitHub contributor statistics
- Mention in release notes
- Contributor spotlight in documentation
- Special recognition for significant contributions

## License

By contributing to A.N.S.H.I.K.A., you agree that your contributions will be licensed under the same license as the project (MIT License).

---

*Last updated: October 30, 2025*</content>
<parameter name="filePath">c:\Users\Aarnav\Desktop\Anshika\docs\contributing.md