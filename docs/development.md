# Development Documentation

## Development Environment Setup

### Prerequisites

#### System Requirements
- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher (comes with Node.js)
- **Git**: Latest version
- **Code Editor**: VS Code recommended (with extensions)

#### Optional Requirements
- **Ollama**: For offline AI mode testing
- **Python**: For certain development scripts
- **Docker**: For containerized development

### Installation Steps

#### 1. Clone the Repository
```bash
git clone https://github.com/Aarnav937/anshika-ai.git
cd anshika-ai
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your API keys
# Required: VITE_GEMINI_API_KEY
# Optional: VITE_WEATHERAPI_KEY, VITE_GOOGLE_SEARCH_API_KEY
```

#### 4. Install Ollama (Optional)
```bash
# macOS
brew install ollama

# Windows
# Download from: https://ollama.ai/download

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model for testing
ollama pull gemma3:4b
```

#### 5. Start Development Server
```bash
npm run dev
```

### VS Code Extensions

Recommended extensions for development:

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "christian-kohler.path-intelligence",
    "ms-vscode.test-adapter-converter",
    "hbenl.vscode-test-explorer"
  ]
}
```

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── ImageGeneration/# Image generation features
│   ├── DocumentUpload/ # Document upload components
│   └── ...             # Feature-specific components
├── contexts/           # React Context providers
├── hooks/              # Custom React hooks
├── services/           # Business logic services
├── types/              # TypeScript definitions
├── utils/              # Utility functions
├── config/             # Configuration files
└── main.tsx           # Application entry point

docs/                   # Documentation
public/                 # Static assets
dist/                   # Build output
```

## Development Workflow

### 1. Branching Strategy
```bash
# Create feature branch
git checkout -b feature/new-feature

# Create bug fix branch
git checkout -b bugfix/issue-description

# Create hotfix branch
git checkout -b hotfix/critical-fix
```

### 2. Code Standards

#### TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

#### ESLint Configuration
```javascript
// eslint.config.js
export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
];
```

#### Prettier Configuration
```javascript
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

### 3. Component Development

#### Component Structure
```typescript
// ComponentName.tsx
import React, { useState, useEffect } from 'react';
import { useSomeContext } from '../contexts/SomeContext';

interface ComponentNameProps {
  title: string;
  onAction?: (data: any) => void;
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  title,
  onAction
}) => {
  const [state, setState] = useState(initialState);
  const { contextValue } = useSomeContext();

  useEffect(() => {
    // Component logic
  }, [dependencies]);

  const handleAction = () => {
    // Action logic
    onAction?.(data);
  };

  return (
    <div className="component-container">
      <h2>{title}</h2>
      {/* Component JSX */}
    </div>
  );
};
```

#### Component Testing
```typescript
// ComponentName.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('handles action correctly', () => {
    const mockAction = jest.fn();
    render(<ComponentName title="Test" onAction={mockAction} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockAction).toHaveBeenCalled();
  });
});
```

### 4. Service Development

#### Service Structure
```typescript
// exampleService.ts
import { ApiError } from '../types';

export class ExampleService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  async getData(id: string): Promise<DataType> {
    try {
      const response = await fetch(`${this.baseUrl}/data/${id}`);

      if (!response.ok) {
        throw new ApiError(response.status, 'Failed to fetch data');
      }

      return await response.json();
    } catch (error) {
      console.error('ExampleService.getData error:', error);
      throw error;
    }
  }

  async saveData(data: DataType): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new ApiError(response.status, 'Failed to save data');
      }
    } catch (error) {
      console.error('ExampleService.saveData error:', error);
      throw error;
    }
  }
}

// Singleton instance
let exampleServiceInstance: ExampleService | null = null;

export const getExampleService = (): ExampleService => {
  if (!exampleServiceInstance) {
    exampleServiceInstance = new ExampleService();
  }
  return exampleServiceInstance;
};
```

### 5. Hook Development

#### Custom Hook Pattern
```typescript
// useExample.ts
import { useState, useEffect, useCallback } from 'react';

interface UseExampleOptions {
  initialValue?: string;
  debounceMs?: number;
}

interface UseExampleReturn {
  value: string;
  setValue: (value: string) => void;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
}

export const useExample = (options: UseExampleOptions = {}): UseExampleReturn => {
  const { initialValue = '', debounceMs = 300 } = options;

  const [value, setValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSetValue = useCallback(
    debounce((newValue: string) => {
      setValue(newValue);
      // Additional logic
    }, debounceMs),
    [debounceMs]
  );

  const reset = useCallback(() => {
    setValue(initialValue);
    setError(null);
    setIsLoading(false);
  }, [initialValue]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      // Cleanup logic
    };
  }, []);

  return {
    value,
    setValue: debouncedSetValue,
    isLoading,
    error,
    reset,
  };
};

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
```

## Testing Strategy

### Unit Testing
```typescript
// Service testing
describe('ExampleService', () => {
  let service: ExampleService;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    service = new ExampleService();
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
  });

  it('should fetch data successfully', async () => {
    const mockData = { id: '1', name: 'Test' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response);

    const result = await service.getData('1');
    expect(result).toEqual(mockData);
  });
});
```

### Integration Testing
```typescript
// Component integration testing
describe('ChatInterface Integration', () => {
  it('should send message and receive response', async () => {
    render(
      <ChatProvider>
        <ChatInterface />
      </ChatProvider>
    );

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Hello AI' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Hello AI')).toBeInTheDocument();
    });

    // Wait for AI response
    await waitFor(() => {
      expect(screen.getByTestId('ai-response')).toBeInTheDocument();
    }, { timeout: 10000 });
  });
});
```

### E2E Testing
```typescript
// Playwright E2E test
import { test, expect } from '@playwright/test';

test('complete chat workflow', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Switch to online mode
  await page.click('[data-testid="mode-toggle"]');

  // Type and send message
  await page.fill('[data-testid="message-input"]', 'Hello A.N.S.H.I.K.A.');
  await page.click('[data-testid="send-button"]');

  // Wait for response
  await page.waitForSelector('[data-testid="ai-message"]');

  // Verify response appears
  const response = page.locator('[data-testid="ai-message"]');
  await expect(response).toBeVisible();
});
```

## Build and Deployment

### Development Build
```bash
# Start dev server with hot reload
npm run dev

# Start dev server on specific port
npm run dev -- --port 3000
```

### Production Build
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Electron Build
```bash
# Build desktop application
npm run electron:build

# Build for specific platforms
npm run electron:build -- --win
npm run electron:build -- --mac
npm run electron:build -- --linux
```

### Docker Build
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .

EXPOSE 5173
CMD ["npm", "run", "preview"]
```

## Performance Optimization

### Bundle Analysis
```bash
# Analyze bundle size
npm run build -- --mode analyze

# Use webpack bundle analyzer
npx vite-bundle-analyzer dist
```

### Code Splitting
```typescript
// Dynamic imports for code splitting
const ChatInterface = lazy(() =>
  import('./components/ChatInterface')
);

// Route-based splitting
const routes = [
  {
    path: '/chat',
    component: lazy(() => import('./pages/ChatPage')),
  },
  {
    path: '/documents',
    component: lazy(() => import('./pages/DocumentsPage')),
  },
];
```

### Image Optimization
```typescript
// Dynamic image imports
const images = import.meta.glob('./assets/images/*.(png|jpg|jpeg|svg|webp)');

// Lazy load images
const ImageComponent = ({ src, alt }: ImageProps) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      const module = await images[src]();
      setImageSrc(module.default);
    };
    loadImage();
  }, [src]);

  return imageSrc ? <img src={imageSrc} alt={alt} /> : <div>Loading...</div>;
};
```

## Debugging and Development Tools

### Browser DevTools
```typescript
// Debug logging
const DEBUG = process.env.NODE_ENV === 'development';

export const logger = {
  info: (message: string, ...args: any[]) => {
    if (DEBUG) {
      console.log(`ℹ️ ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (DEBUG) {
      console.warn(`⚠️ ${message}`, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    console.error(`❌ ${message}`, ...args);
  },
};
```

### React DevTools
```typescript
// Development-only component for debugging
const DebugPanel = () => {
  const { state } = useChat();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="debug-panel">
      <h3>Debug Information</h3>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </div>
  );
};
```

### Hot Module Replacement
```typescript
// Vite HMR support
if (import.meta.hot) {
  import.meta.hot.accept('./components/App', (newApp) => {
    // Hot reload logic
  });
}
```

## Contributing Guidelines

### Code Review Process
1. Create a feature branch
2. Write tests for new functionality
3. Ensure all tests pass
4. Run linting and formatting
5. Create a pull request
6. Address review comments
7. Merge after approval

### Commit Message Format
```bash
# Format: type(scope): description

# Examples:
feat(chat): add message reactions
fix(api): handle network timeouts
docs(readme): update installation instructions
style(components): format button styles
refactor(services): optimize API calls
test(utils): add validation tests
```

### Pull Request Template
```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Screenshots
If applicable, add screenshots of the changes

## Checklist
- [ ] Code follows project standards
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] No linting errors
- [ ] Performance impact assessed
```

## Troubleshooting Development Issues

### Common Issues

#### 1. API Key Issues
```bash
# Check if API keys are set
echo $VITE_GEMINI_API_KEY

# Verify API key format
# Should start with 'AIzaSy' for Gemini
```

#### 2. Build Failures
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

#### 3. TypeScript Errors
```bash
# Check TypeScript compilation
npm run build

# Run type checking only
npx tsc --noEmit
```

#### 4. Test Failures
```bash
# Run tests with verbose output
npm run test -- --verbose

# Run specific test file
npm run test -- src/components/ChatInterface.test.tsx
```

#### 5. Performance Issues
```bash
# Analyze bundle size
npm run build
npx vite-bundle-analyzer dist

# Profile React performance
# Use React DevTools Profiler
```

---

*Last updated: October 30, 2025*</content>
<parameter name="filePath">c:\Users\Aarnav\Desktop\Anshika\docs\development.md