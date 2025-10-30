# Accessibility Documentation

## Overview

A.N.S.H.I.K.A. is committed to providing an accessible experience for all users, including those using assistive technologies. This document outlines the accessibility features, implementation guidelines, and compliance standards followed in the application.

## Accessibility Standards

### WCAG 2.1 Compliance

A.N.S.H.I.K.A. aims for WCAG 2.1 AA compliance across all features:

- **Level A**: Basic accessibility requirements
- **Level AA**: Enhanced accessibility for better usability
- **Level AAA**: Highest level of accessibility (targeted where feasible)

### Supported Assistive Technologies

- Screen readers (NVDA, JAWS, VoiceOver, TalkBack)
- Screen magnifiers
- Keyboard navigation
- Voice control
- Braille displays
- Alternative input devices

## Keyboard Navigation

### Global Keyboard Shortcuts

```typescript
// src/hooks/useKeyboardShortcuts.ts
import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const matchingShortcut = shortcuts.find(shortcut => {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = !!event.ctrlKey === !!shortcut.ctrlKey;
      const altMatch = !!event.altKey === !!shortcut.altKey;
      const shiftMatch = !!event.shiftKey === !!shortcut.shiftKey;

      return keyMatch && ctrlMatch && altMatch && shiftMatch;
    });

    if (matchingShortcut) {
      event.preventDefault();
      matchingShortcut.action();
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

// Global shortcuts
export const globalShortcuts: KeyboardShortcut[] = [
  {
    key: '/',
    ctrlKey: true,
    action: () => {
      const searchInput = document.querySelector('[data-testid="search-input"]') as HTMLInputElement;
      searchInput?.focus();
    },
    description: 'Focus search input'
  },
  {
    key: 'n',
    ctrlKey: true,
    action: () => {
      // Open new chat
      window.dispatchEvent(new CustomEvent('open-new-chat'));
    },
    description: 'Open new chat'
  },
  {
    key: 'k',
    ctrlKey: true,
    action: () => {
      // Open command palette
      window.dispatchEvent(new CustomEvent('open-command-palette'));
    },
    description: 'Open command palette'
  },
  {
    key: 'Escape',
    action: () => {
      // Close modals, clear focus, etc.
      window.dispatchEvent(new CustomEvent('global-escape'));
    },
    description: 'Close current context'
  }
];
```

### Focus Management

```typescript
// src/hooks/useFocusManagement.ts
import { useEffect, useRef, RefObject } from 'react';

export const useFocusTrap = (isActive: boolean, initialFocusRef?: RefObject<HTMLElement>) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Close modal or dialog
        window.dispatchEvent(new CustomEvent('close-focus-trap'));
      }
    };

    document.addEventListener('keydown', handleTabKey);
    document.addEventListener('keydown', handleEscapeKey);

    // Focus initial element
    const initialElement = initialFocusRef?.current || firstElement;
    initialElement?.focus();

    return () => {
      document.removeEventListener('keydown', handleTabKey);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isActive, initialFocusRef]);

  return containerRef;
};

// Skip links for screen readers
export const SkipLinks: React.FC = () => (
  <nav aria-label="Skip links">
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50"
    >
      Skip to main content
    </a>
    <a
      href="#navigation"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-32 bg-blue-600 text-white px-4 py-2 rounded z-50"
    >
      Skip to navigation
    </a>
  </nav>
);
```

## Screen Reader Support

### ARIA Implementation

```typescript
// src/components/AccessibleButton.tsx
import React, { ButtonHTMLAttributes } from 'react';

interface AccessibleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label'?: string;
  'aria-describedby'?: string;
  loading?: boolean;
  loadingText?: string;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  children,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  loading = false,
  loadingText = 'Loading...',
  disabled,
  ...props
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-disabled={isDisabled}
      disabled={isDisabled}
      aria-busy={loading}
    >
      {loading ? (
        <>
          <span aria-hidden="true">{children}</span>
          <span className="sr-only">{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};
```

### Live Regions

```typescript
// src/components/LiveRegion.tsx
import React, { useEffect, useRef } from 'react';

interface LiveRegionProps {
  message: string;
  priority?: 'polite' | 'assertive';
  'aria-live'?: 'polite' | 'assertive' | 'off';
  role?: 'status' | 'alert' | 'log';
}

export const LiveRegion: React.FC<LiveRegionProps> = ({
  message,
  priority = 'polite',
  'aria-live': ariaLive,
  role = 'status'
}) => {
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && regionRef.current) {
      // Clear and set new message to trigger screen reader
      regionRef.current.textContent = '';
      setTimeout(() => {
        if (regionRef.current) {
          regionRef.current.textContent = message;
        }
      }, 100);
    }
  }, [message]);

  return (
    <div
      ref={regionRef}
      aria-live={ariaLive || priority}
      role={role}
      className="sr-only"
      aria-atomic="true"
    />
  );
};

// Usage for status updates
export const StatusAnnouncer: React.FC<{ message: string }> = ({ message }) => (
  <LiveRegion message={message} priority="polite" role="status" />
);

// Usage for errors
export const ErrorAnnouncer: React.FC<{ error: string }> = ({ error }) => (
  <LiveRegion message={error} priority="assertive" role="alert" />
);
```

### Semantic HTML

```typescript
// src/components/ChatInterface.tsx (accessible version)
export const AccessibleChatInterface: React.FC = () => {
  return (
    <div className="chat-interface">
      <header>
        <h1 id="chat-title">A.N.S.H.I.K.A. Chat</h1>
        <nav aria-label="Chat controls">
          <button aria-label="New chat" aria-describedby="new-chat-desc">
            <PlusIcon />
          </button>
          <span id="new-chat-desc" className="sr-only">
            Start a new conversation
          </span>
        </nav>
      </header>

      <main
        id="main-content"
        className="chat-messages"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        aria-atomic="false"
      >
        {messages.map((message) => (
          <article
            key={message.id}
            className={`message ${message.role}`}
            aria-label={`${message.role} message`}
          >
            <header className="sr-only">
              <time dateTime={message.timestamp.toISOString()}>
                {format(message.timestamp, 'HH:mm')}
              </time>
            </header>
            <div className="message-content">
              {message.content}
            </div>
            {message.reactions && message.reactions.length > 0 && (
              <div className="message-reactions" aria-label="Message reactions">
                {message.reactions.map((reaction, index) => (
                  <button
                    key={index}
                    aria-label={`${reaction.count} ${reaction.emoji} reactions`}
                    className="reaction-button"
                  >
                    {reaction.emoji} {reaction.count}
                  </button>
                ))}
              </div>
            )}
          </article>
        ))}
      </main>

      <footer>
        <form
          onSubmit={handleSubmit}
          role="form"
          aria-label="Send message"
        >
          <div className="input-group">
            <label htmlFor="message-input" className="sr-only">
              Type your message
            </label>
            <textarea
              id="message-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              aria-describedby="message-help"
              rows={1}
            />
            <div id="message-help" className="sr-only">
              Press Enter to send, Shift+Enter for new line
            </div>
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim()}
            aria-label="Send message"
          >
            Send
          </button>
        </form>
      </footer>
    </div>
  );
};
```

## Visual Accessibility

### Color Contrast

```typescript
// src/styles/accessibility.css
/* High contrast theme variables */
:root {
  --color-text-primary: #000000;
  --color-text-secondary: #333333;
  --color-background-primary: #ffffff;
  --color-background-secondary: #f8f9fa;
  --color-border: #cccccc;
  --color-focus: #0066cc;
  --color-error: #cc0000;
  --color-success: #008800;
}

/* High contrast mode */
@media (prefers-contrast: high) {
  :root {
    --color-text-primary: #ffffff;
    --color-text-secondary: #ffffff;
    --color-background-primary: #000000;
    --color-background-secondary: #111111;
    --color-border: #ffffff;
    --color-focus: #ffff00;
    --color-error: #ff0000;
    --color-success: #00ff00;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Focus Indicators

```typescript
// src/styles/focus.css
/* Visible focus indicators */
*:focus {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

*:focus:not(:focus-visible) {
  outline: none;
}

*:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(0, 102, 204, 0.3);
}

/* High contrast focus */
@media (prefers-contrast: high) {
  *:focus-visible {
    outline: 3px solid #ffffff;
    outline-offset: 1px;
  }
}

/* Skip link styles */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--color-focus);
  color: white;
  padding: 8px;
  text-decoration: none;
  border-radius: 4px;
  z-index: 1000;
}

.skip-link:focus {
  top: 6px;
}
```

### Font and Typography

```typescript
// src/styles/typography.css
/* Accessible typography */
:root {
  --font-size-base: 16px;
  --line-height-base: 1.5;
  --font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Respect user font size preferences */
html {
  font-size: var(--font-size-base);
}

body {
  font-family: var(--font-family-base);
  line-height: var(--line-height-base);
  color: var(--color-text-primary);
}

/* Headings with proper hierarchy */
h1, h2, h3, h4, h5, h6 {
  line-height: 1.2;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

h1 { font-size: 2rem; }
h2 { font-size: 1.75rem; }
h3 { font-size: 1.5rem; }
h4 { font-size: 1.25rem; }
h5 { font-size: 1.1rem; }
h6 { font-size: 1rem; }

/* Ensure minimum font size */
@media (max-width: 768px) {
  html {
    font-size: 14px;
  }
}

/* High contrast text */
@media (prefers-contrast: high) {
  body {
    font-weight: 400;
  }

  strong, b {
    font-weight: 700;
  }
}
```

## Motion and Animation

### Reduced Motion Support

```typescript
// src/hooks/useReducedMotion.ts
import { useState, useEffect } from 'react';

export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

// Usage in components
export const AnimatedComponent: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className={prefersReducedMotion ? 'no-animation' : 'animated'}
      style={{
        transition: prefersReducedMotion ? 'none' : 'all 0.3s ease'
      }}
    >
      Content
    </div>
  );
};
```

### Accessible Animations

```typescript
// src/components/AccessibleTransition.tsx
import React, { useEffect, useState } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface AccessibleTransitionProps {
  show: boolean;
  children: React.ReactNode;
  enterClass?: string;
  exitClass?: string;
  duration?: number;
}

export const AccessibleTransition: React.FC<AccessibleTransitionProps> = ({
  show,
  children,
  enterClass = 'opacity-100',
  exitClass = 'opacity-0',
  duration = 300
}) => {
  const [isVisible, setIsVisible] = useState(show);
  const [isAnimating, setIsAnimating] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setIsAnimating(true);
    } else {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsAnimating(false);
      }, prefersReducedMotion ? 0 : duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, prefersReducedMotion]);

  if (!isVisible) return null;

  return (
    <div
      className={`${show ? enterClass : exitClass} ${
        isAnimating && !prefersReducedMotion ? 'transition-all' : ''
      }`}
      style={{
        transitionDuration: prefersReducedMotion ? '0ms' : `${duration}ms`
      }}
      aria-hidden={!show}
    >
      {children}
    </div>
  );
};
```

## Form Accessibility

### Accessible Forms

```typescript
// src/components/AccessibleForm.tsx
import React, { FormHTMLAttributes, useId } from 'react';

interface AccessibleFormProps extends FormHTMLAttributes<HTMLFormElement> {
  title?: string;
  description?: string;
  error?: string;
  success?: string;
}

export const AccessibleForm: React.FC<AccessibleFormProps> = ({
  title,
  description,
  error,
  success,
  children,
  ...props
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const successId = useId();

  return (
    <form
      {...props}
      role="form"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={[
        description ? descriptionId : undefined,
        error ? errorId : undefined,
        success ? successId : undefined
      ].filter(Boolean).join(' ') || undefined}
    >
      {title && (
        <h2 id={titleId} className="form-title">
          {title}
        </h2>
      )}

      {description && (
        <p id={descriptionId} className="form-description">
          {description}
        </p>
      )}

      {error && (
        <div id={errorId} role="alert" className="form-error">
          {error}
        </div>
      )}

      {success && (
        <div id={successId} role="status" className="form-success">
          {success}
        </div>
      )}

      <fieldset>
        <legend className="sr-only">Form fields</legend>
        {children}
      </fieldset>
    </form>
  );
};
```

### Accessible Form Fields

```typescript
// src/components/AccessibleField.tsx
import React, { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, useId } from 'react';

interface BaseFieldProps {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
}

interface InputFieldProps extends BaseFieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'aria-describedby'> {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
}

interface TextareaFieldProps extends BaseFieldProps, Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'aria-describedby'> {}

interface SelectFieldProps extends BaseFieldProps, Omit<SelectHTMLAttributes<HTMLSelectElement>, 'aria-describedby'> {
  options: Array<{ value: string; label: string }>;
}

export const AccessibleInput: React.FC<InputFieldProps> = ({
  label,
  description,
  error,
  required = false,
  id,
  ...props
}) => {
  const fieldId = useId();
  const descriptionId = useId();
  const errorId = useId();

  const finalId = id || fieldId;
  const describedBy = [
    description ? descriptionId : undefined,
    error ? errorId : undefined
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className="form-field">
      <label htmlFor={finalId} className="field-label">
        {label}
        {required && <span className="required-indicator" aria-label="required">*</span>}
      </label>

      {description && (
        <p id={descriptionId} className="field-description">
          {description}
        </p>
      )}

      <input
        {...props}
        id={finalId}
        aria-describedby={describedBy}
        aria-required={required}
        aria-invalid={!!error}
        className={`field-input ${error ? 'field-error' : ''}`}
      />

      {error && (
        <p id={errorId} role="alert" className="field-error-message">
          {error}
        </p>
      )}
    </div>
  );
};

export const AccessibleTextarea: React.FC<TextareaFieldProps> = ({
  label,
  description,
  error,
  required = false,
  id,
  ...props
}) => {
  const fieldId = useId();
  const descriptionId = useId();
  const errorId = useId();

  const finalId = id || fieldId;
  const describedBy = [
    description ? descriptionId : undefined,
    error ? errorId : undefined
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className="form-field">
      <label htmlFor={finalId} className="field-label">
        {label}
        {required && <span className="required-indicator" aria-label="required">*</span>}
      </label>

      {description && (
        <p id={descriptionId} className="field-description">
          {description}
        </p>
      )}

      <textarea
        {...props}
        id={finalId}
        aria-describedby={describedBy}
        aria-required={required}
        aria-invalid={!!error}
        className={`field-textarea ${error ? 'field-error' : ''}`}
      />

      {error && (
        <p id={errorId} role="alert" className="field-error-message">
          {error}
        </p>
      )}
    </div>
  );
};

export const AccessibleSelect: React.FC<SelectFieldProps> = ({
  label,
  description,
  error,
  required = false,
  options,
  id,
  ...props
}) => {
  const fieldId = useId();
  const descriptionId = useId();
  const errorId = useId();

  const finalId = id || fieldId;
  const describedBy = [
    description ? descriptionId : undefined,
    error ? errorId : undefined
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className="form-field">
      <label htmlFor={finalId} className="field-label">
        {label}
        {required && <span className="required-indicator" aria-label="required">*</span>}
      </label>

      {description && (
        <p id={descriptionId} className="field-description">
          {description}
        </p>
      )}

      <select
        {...props}
        id={finalId}
        aria-describedby={describedBy}
        aria-required={required}
        aria-invalid={!!error}
        className={`field-select ${error ? 'field-error' : ''}`}
      >
        <option value="">Select an option</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <p id={errorId} role="alert" className="field-error-message">
          {error}
        </p>
      )}
    </div>
  );
};
```

## Testing Accessibility

### Accessibility Testing Utilities

```typescript
// src/test/utils/accessibility.ts
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

export const testAccessibility = async (component: React.ReactElement) => {
  const { container } = render(component);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
};

export const checkKeyboardNavigation = (container: HTMLElement) => {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  expect(focusableElements.length).toBeGreaterThan(0);

  // Check focus order
  focusableElements.forEach((element, index) => {
    const el = element as HTMLElement;
    el.focus();
    expect(document.activeElement).toBe(el);

    // Check for visible focus indicator
    const computedStyle = window.getComputedStyle(el);
    const hasFocusIndicator = computedStyle.outlineStyle !== 'none' ||
                             computedStyle.boxShadow !== 'none';
    expect(hasFocusIndicator).toBe(true);
  });
};

export const checkScreenReaderSupport = (container: HTMLElement) => {
  // Check for ARIA labels
  const buttonsWithoutLabels = container.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
  expect(buttonsWithoutLabels.length).toBe(0);

  // Check for alt text on images
  const imagesWithoutAlt = container.querySelectorAll('img:not([alt])');
  expect(imagesWithoutAlt.length).toBe(0);

  // Check for form labels
  const inputsWithoutLabels = container.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
  inputsWithoutLabels.forEach(input => {
    const id = input.getAttribute('id');
    if (id) {
      const label = container.querySelector(`label[for="${id}"]`);
      expect(label).toBeTruthy();
    }
  });
};
```

### Accessibility Test Examples

```typescript
// src/components/__tests__/ChatInterface.accessibility.test.tsx
import { render, screen } from '../../test/utils';
import { ChatInterface } from '../ChatInterface';
import { testAccessibility, checkKeyboardNavigation, checkScreenReaderSupport } from '../../test/utils/accessibility';

describe('ChatInterface Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<ChatInterface />);
    await testAccessibility(<ChatInterface />);
  });

  it('should support keyboard navigation', () => {
    const { container } = render(<ChatInterface />);
    checkKeyboardNavigation(container);
  });

  it('should support screen readers', () => {
    const { container } = render(<ChatInterface />);
    checkScreenReaderSupport(container);
  });

  it('should announce status changes', () => {
    render(<ChatInterface />);

    // Simulate typing a message
    const input = screen.getByLabelText(/type your message/i);
    fireEvent.change(input, { target: { value: 'Hello AI' } });

    // Check for live region updates
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toBeInTheDocument();
  });

  it('should have proper heading hierarchy', () => {
    render(<ChatInterface />);

    const headings = screen.getAllByRole('heading');
    const levels = headings.map(h => parseInt(h.tagName.charAt(1)));

    // Check that heading levels increase appropriately
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]).toBeLessThanOrEqual(levels[i - 1] + 1);
    }
  });
});
```

## Accessibility Configuration

### User Accessibility Preferences

```typescript
// src/config/accessibility.ts
export interface AccessibilityPreferences {
  screenReader: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large';
  colorBlindness: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  keyboardNavigation: boolean;
  focusIndicators: boolean;
}

export const defaultAccessibilityPrefs: AccessibilityPreferences = {
  screenReader: false,
  highContrast: false,
  reducedMotion: false,
  fontSize: 'medium',
  colorBlindness: 'none',
  keyboardNavigation: true,
  focusIndicators: true
};

export const applyAccessibilityPreferences = (prefs: AccessibilityPreferences) => {
  const root = document.documentElement;

  // Font size
  root.style.setProperty('--font-size-multiplier',
    prefs.fontSize === 'small' ? '0.875' :
    prefs.fontSize === 'large' ? '1.125' : '1'
  );

  // High contrast
  if (prefs.highContrast) {
    root.classList.add('high-contrast');
  } else {
    root.classList.remove('high-contrast');
  }

  // Reduced motion
  if (prefs.reducedMotion) {
    root.style.setProperty('--animation-duration', '0ms');
  } else {
    root.style.removeProperty('--animation-duration');
  }

  // Color blindness simulation
  root.classList.remove('protanopia', 'deuteranopia', 'tritanopia');
  if (prefs.colorBlindness !== 'none') {
    root.classList.add(prefs.colorBlindness);
  }
};
```

---

*Last updated: October 30, 2025*</content>
<parameter name="filePath">c:\Users\Aarnav\Desktop\Anshika\docs\accessibility.md