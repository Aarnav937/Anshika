/**
 * Accessibility Utilities
 * Keyboard navigation, focus management, screen reader announcements
 */

/**
 * Announce message to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  // Create or get existing live region
  let liveRegion = document.getElementById(`aria-live-${priority}`);
  
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = `aria-live-${priority}`;
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only'; // Screen reader only
    document.body.appendChild(liveRegion);
  }

  // Set message
  liveRegion.textContent = message;

  // Clear after announcement
  setTimeout(() => {
    if (liveRegion) {
      liveRegion.textContent = '';
    }
  }, 1000);
}

/**
 * Trap focus within a modal/dialog
 */
export function trapFocus(element: HTMLElement): () => void {
  const focusableElements = element.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  if (focusableElements.length === 0) return () => {};

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  element.addEventListener('keydown', handleKeyDown);

  // Focus first element
  firstElement.focus();

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Keyboard navigation handler
 */
export interface KeyboardNavOptions {
  items: HTMLElement[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onEscape?: () => void;
  loop?: boolean;
}

export function handleKeyboardNav(e: KeyboardEvent, options: KeyboardNavOptions): number {
  const { items, currentIndex, onSelect, onEscape, loop = true } = options;

  switch (e.key) {
    case 'ArrowDown':
    case 'ArrowRight': {
      e.preventDefault();
      const nextIndex = currentIndex + 1;
      if (nextIndex < items.length) {
        items[nextIndex]?.focus();
        return nextIndex;
      } else if (loop) {
        items[0]?.focus();
        return 0;
      }
      return currentIndex;
    }

    case 'ArrowUp':
    case 'ArrowLeft': {
      e.preventDefault();
      const prevIndex = currentIndex - 1;
      if (prevIndex >= 0) {
        items[prevIndex]?.focus();
        return prevIndex;
      } else if (loop) {
        const lastIndex = items.length - 1;
        items[lastIndex]?.focus();
        return lastIndex;
      }
      return currentIndex;
    }

    case 'Home': {
      e.preventDefault();
      items[0]?.focus();
      return 0;
    }

    case 'End': {
      e.preventDefault();
      const lastIndex = items.length - 1;
      items[lastIndex]?.focus();
      return lastIndex;
    }

    case 'Enter':
    case ' ': {
      e.preventDefault();
      onSelect(currentIndex);
      return currentIndex;
    }

    case 'Escape': {
      e.preventDefault();
      onEscape?.();
      return currentIndex;
    }

    default:
      return currentIndex;
  }
}

/**
 * Get descriptive text for keyboard shortcuts
 */
export const KEYBOARD_SHORTCUTS = {
  // Global
  'Ctrl/Cmd + Enter': 'Send message',
  'Ctrl/Cmd + K': 'New conversation',
  'Ctrl/Cmd + F': 'Search conversations',
  'Ctrl/Cmd + ,': 'Open settings',
  'Escape': 'Close modal or cancel',

  // Chat
  'Shift + Enter': 'New line in message',
  'Arrow Up': 'Edit last message',
  'Ctrl/Cmd + /': 'Show commands',

  // Voice
  'Spacebar': 'Hold to speak (voice input)',
  'Ctrl/Cmd + M': 'Toggle microphone',

  // Documents
  'Ctrl/Cmd + U': 'Upload document',
  'Ctrl/Cmd + D': 'Open document workspace',
  'Ctrl/Cmd + Shift + F': 'Document search',

  // Tasks
  'Ctrl/Cmd + T': 'Create new task',
  'Ctrl/Cmd + Shift + T': 'Open task list',
} as const;

/**
 * Check if keyboard shortcut matches event
 */
export function matchesShortcut(
  e: KeyboardEvent,
  shortcut: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean }
): boolean {
  return (
    e.key.toLowerCase() === shortcut.key.toLowerCase() &&
    (shortcut.ctrl === undefined || (e.ctrlKey || e.metaKey) === shortcut.ctrl) &&
    (shortcut.shift === undefined || e.shiftKey === shortcut.shift) &&
    (shortcut.alt === undefined || e.altKey === shortcut.alt)
  );
}

/**
 * Generate unique ID for ARIA relationships
 */
let idCounter = 0;
export function generateA11yId(prefix: string = 'a11y'): string {
  return `${prefix}-${Date.now()}-${++idCounter}`;
}

/**
 * Create skip link for keyboard navigation
 */
export function createSkipLink(targetId: string, label: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = `#${targetId}`;
  link.className = 'skip-link';
  link.textContent = label;
  link.style.cssText = `
    position: absolute;
    top: -40px;
    left: 0;
    background: #000;
    color: #fff;
    padding: 8px;
    text-decoration: none;
    z-index: 100;
  `;

  link.addEventListener('focus', () => {
    link.style.top = '0';
  });

  link.addEventListener('blur', () => {
    link.style.top = '-40px';
  });

  return link;
}

/**
 * Check if element is visible to screen readers
 */
export function isVisibleToScreenReader(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    element.getAttribute('aria-hidden') !== 'true' &&
    !element.hasAttribute('inert')
  );
}

/**
 * Get accessible label for element
 */
export function getAccessibleLabel(element: HTMLElement): string | null {
  // Check aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  // Check aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelElement = document.getElementById(labelledBy);
    return labelElement?.textContent || null;
  }

  // Check associated label
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const label = document.querySelector<HTMLLabelElement>(`label[for="${element.id}"]`);
    return label?.textContent || null;
  }

  // Check alt text for images
  if (element instanceof HTMLImageElement) {
    return element.alt;
  }

  // Fallback to text content
  return element.textContent;
}

/**
 * Ensure minimum touch target size (44x44px for WCAG AAA)
 */
export function ensureTouchTargetSize(element: HTMLElement, minSize: number = 44): void {
  const rect = element.getBoundingClientRect();
  
  if (rect.width < minSize || rect.height < minSize) {
    element.style.minWidth = `${minSize}px`;
    element.style.minHeight = `${minSize}px`;
    element.style.display = 'inline-flex';
    element.style.alignItems = 'center';
    element.style.justifyContent = 'center';
  }
}

/**
 * Add focus visible styles (only show focus ring for keyboard, not mouse)
 */
export function setupFocusVisible(): void {
  let hadKeyboardEvent = true;

  const handlePointerDown = () => {
    hadKeyboardEvent = false;
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      hadKeyboardEvent = true;
    }
  };

  const handleFocus = (e: FocusEvent) => {
    if (e.target instanceof HTMLElement) {
      if (hadKeyboardEvent) {
        e.target.classList.add('focus-visible');
      } else {
        e.target.classList.remove('focus-visible');
      }
    }
  };

  const handleBlur = (e: FocusEvent) => {
    if (e.target instanceof HTMLElement) {
      e.target.classList.remove('focus-visible');
    }
  };

  document.addEventListener('pointerdown', handlePointerDown, true);
  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('focus', handleFocus, true);
  document.addEventListener('blur', handleBlur, true);
}

/**
 * Color contrast checker (WCAG AA = 4.5:1, AAA = 7:1)
 */
export function getContrastRatio(foreground: string, background: string): number {
  const getLuminance = (hex: string): number => {
    const rgb = parseInt(hex.replace('#', ''), 16);
    const r = ((rgb >> 16) & 0xff) / 255;
    const g = ((rgb >> 8) & 0xff) / 255;
    const b = (rgb & 0xff) / 255;

    const [rL, gL, bL] = [r, g, b].map((c) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );

    return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color contrast meets WCAG standards
 */
export function meetsContrastRequirement(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  
  if (level === 'AAA') {
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }
  
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}
