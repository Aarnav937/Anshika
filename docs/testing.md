# Testing Documentation

## Overview

A.N.S.H.I.K.A. uses a comprehensive testing strategy combining unit tests, integration tests, end-to-end tests, and visual regression tests. The testing framework is built around Vitest for fast, modern testing with React Testing Library for component testing.

## Testing Stack

### Core Testing Libraries

```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "vitest": "^0.34.0",
    "jsdom": "^22.0.0",
    "msw": "^1.3.0",
    "cypress": "^13.0.0",
    "@playwright/test": "^1.40.0"
  }
}
```

### Test Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
});
```

## Test Setup

### Global Test Setup

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend expect with jest-dom matchers
expect.extend(matchers);

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
```

### Test Utilities

```typescript
// src/test/utils.tsx
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ChatProvider } from '../contexts/ChatContext';
import { ToastProvider } from '../contexts/ToastContext';

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <ChatProvider>
            {children}
          </ChatProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

## Unit Testing

### Component Testing

```typescript
// src/components/__tests__/ChatInterface.test.tsx
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { ChatInterface } from '../ChatInterface';
import { vi } from 'vitest';

describe('ChatInterface', () => {
  const mockSendMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders chat interface correctly', () => {
    render(<ChatInterface onSendMessage={mockSendMessage} />);

    expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('sends message when form is submitted', async () => {
    render(<ChatInterface onSendMessage={mockSendMessage} />);

    const input = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Hello AI!' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Hello AI!');
    });

    expect(input).toHaveValue('');
  });

  it('shows loading state when sending message', async () => {
    let resolveSendMessage: (value: void) => void;
    const sendMessagePromise = new Promise<void>((resolve) => {
      resolveSendMessage = resolve;
    });

    mockSendMessage.mockReturnValue(sendMessagePromise);

    render(<ChatInterface onSendMessage={mockSendMessage} />);

    const input = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    expect(sendButton).toBeDisabled();
    expect(sendButton).toHaveTextContent(/sending/i);

    resolveSendMessage();

    await waitFor(() => {
      expect(sendButton).not.toBeDisabled();
      expect(sendButton).toHaveTextContent(/send/i);
    });
  });
});
```

### Service Testing

```typescript
// src/services/__tests__/GeminiService.test.ts
import { GeminiService } from '../GeminiService';
import { vi } from 'vitest';

describe('GeminiService', () => {
  let service: GeminiService;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    service = new GeminiService(mockApiKey);
    vi.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('sends message and returns response', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'Hello from Gemini!' }]
          }
        }]
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const response = await service.sendMessage('Hello');

      expect(response).toBe('Hello from Gemini!');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.any(String)
        })
      );
    });

    it('handles API errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      });

      await expect(service.sendMessage('Hello')).rejects.toThrow('API request failed');
    });

    it('handles network errors', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      await expect(service.sendMessage('Hello')).rejects.toThrow('Network error');
    });
  });

  describe('generateImage', () => {
    it('generates image with correct parameters', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'Generated image data' }]
          }
        }]
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await service.generateImage('A beautiful sunset', {
        aspectRatio: '16:9',
        stylePreset: 'natural'
      });

      expect(result).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({
          body: expect.stringContaining('A beautiful sunset')
        })
      );
    });
  });
});
```

### Hook Testing

```typescript
// src/hooks/__tests__/useChat.test.ts
import { renderHook, act, waitFor } from '../../test/utils';
import { useChat } from '../useChat';
import { vi } from 'vitest';

describe('useChat', () => {
  const mockGeminiService = {
    sendMessage: vi.fn(),
    generateImage: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with empty messages', () => {
    const { result } = renderHook(() => useChat(mockGeminiService));

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('sends message successfully', async () => {
    mockGeminiService.sendMessage.mockResolvedValueOnce('AI response');

    const { result } = renderHook(() => useChat(mockGeminiService));

    act(() => {
      result.current.sendMessage('User message');
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].content).toBe('User message');
    expect(result.current.messages[1].content).toBe('AI response');
  });

  it('handles send message error', async () => {
    mockGeminiService.sendMessage.mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => useChat(mockGeminiService));

    act(() => {
      result.current.sendMessage('User message');
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.messages).toHaveLength(1); // Only user message
    expect(result.current.error).toBeDefined();
  });
});
```

## Integration Testing

### API Integration Tests

```typescript
// src/services/__tests__/WeatherService.integration.test.ts
import { WeatherService } from '../WeatherService';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.get('https://api.weatherapi.com/v1/current.json', (req, res, ctx) => {
    return res(ctx.json({
      location: {
        name: 'New York',
        country: 'USA'
      },
      current: {
        temp_c: 20,
        condition: {
          text: 'Sunny',
          icon: '//cdn.weatherapi.com/weather/64x64/day/113.png'
        },
        humidity: 65,
        wind_kph: 15
      }
    }));
  }),

  rest.get('https://api.weatherapi.com/v1/forecast.json', (req, res, ctx) => {
    return res(ctx.json({
      forecast: {
        forecastday: [
          {
            date: '2024-01-01',
            day: {
              maxtemp_c: 22,
              mintemp_c: 15,
              condition: {
                text: 'Partly cloudy',
                icon: '//cdn.weatherapi.com/weather/64x64/day/116.png'
              }
            }
          }
        ]
      }
    }));
  })
);

describe('WeatherService Integration', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('fetches current weather', async () => {
    const service = new WeatherService('test-api-key');
    const weather = await service.getCurrentWeather('New York');

    expect(weather.location.name).toBe('New York');
    expect(weather.current.temp_c).toBe(20);
    expect(weather.current.condition.text).toBe('Sunny');
  });

  it('fetches weather forecast', async () => {
    const service = new WeatherService('test-api-key');
    const forecast = await service.getForecast('New York', 1);

    expect(forecast.forecast.forecastday).toHaveLength(1);
    expect(forecast.forecast.forecastday[0].day.maxtemp_c).toBe(22);
  });

  it('handles API errors', async () => {
    server.use(
      rest.get('https://api.weatherapi.com/v1/current.json', (req, res, ctx) => {
        return res(ctx.status(401), ctx.json({ error: { message: 'Invalid API key' } }));
      })
    );

    const service = new WeatherService('invalid-key');

    await expect(service.getCurrentWeather('New York')).rejects.toThrow();
  });
});
```

### Context Integration Tests

```typescript
// src/contexts/__tests__/ChatContext.integration.test.tsx
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { ChatProvider, useChatContext } from '../ChatContext';
import { vi } from 'vitest';

const TestComponent = () => {
  const { messages, sendMessage, isLoading, clearMessages } = useChatContext();

  return (
    <div>
      <div data-testid="message-count">{messages.length}</div>
      <div data-testid="loading-state">{isLoading ? 'loading' : 'idle'}</div>
      <button onClick={() => sendMessage('Test message')}>Send Message</button>
      <button onClick={clearMessages}>Clear Messages</button>
      {messages.map((msg, index) => (
        <div key={index} data-testid={`message-${index}`}>
          {msg.content}
        </div>
      ))}
    </div>
  );
};

describe('ChatContext Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('manages chat state correctly', async () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    expect(screen.getByTestId('message-count')).toHaveTextContent('0');
    expect(screen.getByTestId('loading-state')).toHaveTextContent('idle');

    fireEvent.click(screen.getByText('Send Message'));

    expect(screen.getByTestId('loading-state')).toHaveTextContent('loading');

    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('idle');
    });

    expect(screen.getByTestId('message-count')).toHaveTextContent('2'); // User + AI message
    expect(screen.getByTestId('message-0')).toHaveTextContent('Test message');
  });

  it('clears messages correctly', async () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    fireEvent.click(screen.getByText('Send Message'));

    await waitFor(() => {
      expect(screen.getByTestId('message-count')).toHaveTextContent('2');
    });

    fireEvent.click(screen.getByText('Clear Messages'));

    expect(screen.getByTestId('message-count')).toHaveTextContent('0');
  });
});
```

## End-to-End Testing

### Cypress Tests

```typescript
// cypress/e2e/chat.cy.ts
describe('Chat Interface', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.intercept('POST', '**/generativelanguage.googleapis.com/**', {
      candidates: [{
        content: {
          parts: [{ text: 'Hello from AI!' }]
        }
      }]
    }).as('sendMessage');
  });

  it('should send and receive messages', () => {
    cy.get('[data-testid="message-input"]').type('Hello AI');
    cy.get('[data-testid="send-button"]').click();

    cy.wait('@sendMessage');

    cy.get('[data-testid="message-list"]').should('contain', 'Hello AI');
    cy.get('[data-testid="message-list"]').should('contain', 'Hello from AI!');
  });

  it('should handle file uploads', () => {
    cy.get('[data-testid="file-upload"]').selectFile('cypress/fixtures/sample.pdf');

    cy.get('[data-testid="upload-status"]').should('contain', 'Upload complete');
    cy.get('[data-testid="document-preview"]').should('be.visible');
  });

  it('should generate images', () => {
    cy.get('[data-testid="image-prompt"]').type('A beautiful sunset');
    cy.get('[data-testid="generate-image"]').click();

    cy.get('[data-testid="image-loading"]').should('be.visible');
    cy.get('[data-testid="generated-image"]', { timeout: 10000 }).should('be.visible');
  });
});
```

### Playwright Tests

```typescript
// e2e/chat.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.route('**/generativelanguage.googleapis.com/**', async route => {
      await route.fulfill({
        json: {
          candidates: [{
            content: {
              parts: [{ text: 'Hello from AI!' }]
            }
          }]
        }
      });
    });
  });

  test('should send and receive messages', async ({ page }) => {
    await page.fill('[data-testid="message-input"]', 'Hello AI');
    await page.click('[data-testid="send-button"]');

    await expect(page.locator('[data-testid="message-list"]')).toContainText('Hello AI');
    await expect(page.locator('[data-testid="message-list"]')).toContainText('Hello from AI!');
  });

  test('should handle voice input', async ({ page }) => {
    await page.click('[data-testid="voice-toggle"]');

    // Mock speech recognition
    await page.evaluate(() => {
      const event = new CustomEvent('speechresult', {
        detail: { transcript: 'Hello via voice' }
      });
      window.dispatchEvent(event);
    });

    await expect(page.locator('[data-testid="message-input"]')).toHaveValue('Hello via voice');
  });
});
```

## Visual Regression Testing

### Storybook + Chromatic

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-storysource'
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  docs: {
    autodocs: 'tag'
  }
};

export default config;
```

```typescript
// src/components/ChatInterface.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { ChatInterface } from './ChatInterface';

const meta: Meta<typeof ChatInterface> = {
  title: 'Components/ChatInterface',
  component: ChatInterface,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSendMessage: (message) => console.log('Message:', message),
  },
};

export const WithMessages: Story = {
  args: {
    onSendMessage: (message) => console.log('Message:', message),
    initialMessages: [
      { id: '1', content: 'Hello!', role: 'user', timestamp: new Date() },
      { id: '2', content: 'Hi there!', role: 'assistant', timestamp: new Date() },
    ],
  },
};

export const Loading: Story = {
  args: {
    onSendMessage: (message) => new Promise(resolve => setTimeout(resolve, 2000)),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByPlaceholderText(/type your message/i);
    await userEvent.type(input, 'Test message');
    await userEvent.click(canvas.getByRole('button', { name: /send/i }));
  },
};
```

## Performance Testing

### Lighthouse CI

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: http://localhost:4173
          configPath: .lighthouserc.json
          uploadArtifacts: true
          temporaryPublicStorage: true
```

```json
// .lighthouserc.json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "startServerCommand": "npm run preview",
      "startServerReadyPattern": "Local:.+(https?://.+)",
      "url": ["http://localhost:4173"]
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["error", { "minScore": 0.9 }],
        "categories:seo": ["error", { "minScore": 0.9 }]
      }
    }
  }
}
```

### Load Testing

```typescript
// src/test/load.test.ts
import { check } from 'k6';
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(99)<1500'], // 99% of requests should be below 1.5s
    http_req_failed: ['rate<0.1'],     // Error rate should be below 10%
  },
};

export default function () {
  const response = http.get('http://localhost:4173');

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  });
}
```

## Test Coverage

### Coverage Configuration

```typescript
// vitest.config.ts coverage settings
export default defineConfig({
  test: {
    coverage: {
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/**/*.stories.tsx'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        './src/components/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        './src/services/': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        }
      }
    }
  }
});
```

### Coverage Reporting

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html

# Upload to Codecov
npm run test:coverage:upload
```

## Continuous Integration

### GitHub Actions CI

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test:unit
      - run: npm run test:integration
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - name: Run E2E tests
        uses: cypress-io/github-action@v5
        with:
          start: npm run preview
          wait-on: http://localhost:4173

  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: http://localhost:4173
          configPath: .lighthouserc.json
```

## Test Data Management

### Mock Data

```typescript
// src/test/mocks/chatData.ts
export const mockMessages = [
  {
    id: '1',
    content: 'Hello, how can I help you?',
    role: 'assistant',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    mode: 'online' as const
  },
  {
    id: '2',
    content: 'I need help with React',
    role: 'user',
    timestamp: new Date('2024-01-01T10:01:00Z'),
    mode: 'online' as const
  }
];

export const mockDocumentAnalysis = {
  summary: {
    title: 'React Best Practices',
    mainPoints: [
      'Use functional components',
      'Leverage hooks for state management',
      'Implement proper error boundaries'
    ],
    keyTopics: ['React', 'JavaScript', 'Frontend'],
    documentType: 'article' as const,
    entities: [],
    wordCount: 1500,
    pageCount: 3,
    language: 'en',
    confidence: 0.95
  },
  fullAnalysis: 'Comprehensive analysis of React development patterns...',
  keyInsights: [
    'Functional components are preferred over class components',
    'Custom hooks improve code reusability'
  ],
  confidence: 0.95,
  processingTime: 1250,
  modelUsed: 'gemini-pro',
  analysisDate: new Date()
};
```

### Factory Functions

```typescript
// src/test/factories/index.ts
import { Message } from '../../types';

export const createMessage = (overrides: Partial<Message> = {}): Message => ({
  id: Math.random().toString(36).substr(2, 9),
  content: 'Test message',
  role: 'user',
  timestamp: new Date(),
  mode: 'online',
  ...overrides
});

export const createTask = (overrides: Partial<Task> = {}): Task => ({
  id: Math.random().toString(36).substr(2, 9),
  title: 'Test task',
  status: 'pending',
  priority: 'medium',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});
```

---

*Last updated: October 30, 2025*</content>
<parameter name="filePath">c:\Users\Aarnav\Desktop\Anshika\docs\testing.md