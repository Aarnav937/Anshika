// Import after mocking
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StreamControls } from '../StreamControls';

// Mock functions for testing
const mockPauseStreaming = jest.fn();
const mockResumeStreaming = jest.fn();
const mockCancelStreaming = jest.fn();

// Custom render function that bypasses context by passing props directly
const renderStreamControls = (props: {
  isStreaming?: boolean;
  className?: string;
  showKeyboardHints?: boolean;
} = {}) => {
  const defaultProps = {
    isStreaming: true,
    pauseStreaming: mockPauseStreaming,
    resumeStreaming: mockResumeStreaming,
    cancelStreaming: mockCancelStreaming,
    ...props,
  };

  return render(<StreamControls {...defaultProps} />);
};

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Pause: () => <div data-testid="pause-icon">PauseIcon</div>,
  Play: () => <div data-testid="play-icon">PlayIcon</div>,
  Square: () => <div data-testid="square-icon">SquareIcon</div>,
  Keyboard: () => <div data-testid="keyboard-icon">KeyboardIcon</div>,
}));

describe('StreamControls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders when streaming is active', () => {
      renderStreamControls();

      expect(screen.getByRole('toolbar')).toBeInTheDocument();
      expect(screen.getByLabelText('Streaming controls')).toBeInTheDocument();
    });

    it('does not render when streaming is inactive', () => {
      const { container } = renderStreamControls({ isStreaming: false });
      expect(container.firstChild).toBeNull();
    });

    it('renders all control buttons', () => {
      renderStreamControls();

      expect(screen.getByLabelText('Pause streaming')).toBeInTheDocument();
      expect(screen.getByLabelText('Resume streaming')).toBeInTheDocument();
      expect(screen.getByLabelText('Cancel streaming')).toBeInTheDocument();
    });

    it('renders keyboard shortcuts hint by default', () => {
      renderStreamControls();

      expect(screen.getByText('Space')).toBeInTheDocument();
      expect(screen.getAllByText('Pause')).toHaveLength(2); // Button text and keyboard hint
      expect(screen.getByText('Ctrl+C')).toBeInTheDocument();
      expect(screen.getAllByText('Cancel')).toHaveLength(2); // Button text and keyboard hint
    });

    it('renders status indicator', () => {
      renderStreamControls();

      expect(screen.getByText('Streaming active')).toBeInTheDocument();
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('Button Interactions', () => {
    it('calls pauseStreaming when pause button is clicked', () => {
      renderStreamControls();

      const pauseButton = screen.getByLabelText('Pause streaming');
      fireEvent.click(pauseButton);

      expect(mockPauseStreaming).toHaveBeenCalledTimes(1);
    });

    it('calls resumeStreaming when resume button is clicked', () => {
      renderStreamControls();

      const resumeButton = screen.getByLabelText('Resume streaming');
      fireEvent.click(resumeButton);

      expect(mockResumeStreaming).toHaveBeenCalledTimes(1);
    });

    it('calls cancelStreaming when cancel button is clicked', () => {
      renderStreamControls();

      const cancelButton = screen.getByLabelText('Cancel streaming');
      fireEvent.click(cancelButton);

      expect(mockCancelStreaming).toHaveBeenCalledTimes(1);
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('calls cancelStreaming when Ctrl+C is pressed', () => {
      renderStreamControls();

      fireEvent.keyDown(document, { key: 'c', ctrlKey: true });

      expect(mockCancelStreaming).toHaveBeenCalledTimes(1);
    });

    it('calls cancelStreaming when Cmd+C is pressed on Mac', () => {
      renderStreamControls();

      fireEvent.keyDown(document, { key: 'c', metaKey: true });

      expect(mockCancelStreaming).toHaveBeenCalledTimes(1);
    });

    it('calls pauseStreaming when Space is pressed', () => {
      renderStreamControls();

      fireEvent.keyDown(document, { key: ' ', preventDefault: jest.fn() });

      expect(mockPauseStreaming).toHaveBeenCalledTimes(1);
    });

    it('prevents default behavior for keyboard shortcuts', () => {
      renderStreamControls();

      // Spy on preventDefault to verify it's called
      const preventDefaultSpy = jest.fn();
      const mockEvent1 = new KeyboardEvent('keydown', { key: 'c', ctrlKey: true });
      mockEvent1.preventDefault = preventDefaultSpy;

      document.dispatchEvent(mockEvent1);
      expect(preventDefaultSpy).toHaveBeenCalled();

      const preventDefaultSpy2 = jest.fn();
      const mockEvent2 = new KeyboardEvent('keydown', { key: ' ' });
      mockEvent2.preventDefault = preventDefaultSpy2;

      document.dispatchEvent(mockEvent2);
      expect(preventDefaultSpy2).toHaveBeenCalled();
    });

    it('does not respond to keyboard shortcuts when not streaming', () => {
      renderStreamControls({ isStreaming: false });

      fireEvent.keyDown(document, { key: 'c', ctrlKey: true });
      fireEvent.keyDown(document, { key: ' ' });

      expect(mockCancelStreaming).not.toHaveBeenCalled();
      expect(mockPauseStreaming).not.toHaveBeenCalled();
    });

    it('ignores other key combinations', () => {
      renderStreamControls();

      fireEvent.keyDown(document, { key: 'a', ctrlKey: true });
      fireEvent.keyDown(document, { key: 'Enter' });
      fireEvent.keyDown(document, { key: 'c' }); // C without Ctrl

      expect(mockCancelStreaming).not.toHaveBeenCalled();
      expect(mockPauseStreaming).not.toHaveBeenCalled();
    });
  });

  describe('Props', () => {
    it('applies custom className', () => {
      renderStreamControls({ className: 'custom-class' });

      const toolbar = screen.getByRole('toolbar');
      expect(toolbar).toHaveClass('custom-class');
    });

    it('hides keyboard hints when showKeyboardHints is false', () => {
      renderStreamControls({ showKeyboardHints: false });

      expect(screen.queryByText('Space')).not.toBeInTheDocument();
      expect(screen.queryByText('Ctrl+C')).not.toBeInTheDocument();
      expect(screen.queryByTestId('keyboard-icon')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      renderStreamControls();

      const toolbar = screen.getByRole('toolbar');
      expect(toolbar).toHaveAttribute('aria-label', 'Streaming controls');
    });

    it('buttons have proper ARIA labels and titles', () => {
      renderStreamControls();

      const pauseButton = screen.getByLabelText('Pause streaming');
      const resumeButton = screen.getByLabelText('Resume streaming');
      const cancelButton = screen.getByLabelText('Cancel streaming');

      expect(pauseButton).toHaveAttribute('title', 'Pause streaming (Space)');
      expect(resumeButton).toHaveAttribute('title', 'Resume streaming');
      expect(cancelButton).toHaveAttribute('title', 'Cancel streaming (Ctrl+C)');
    });

    it('buttons have focus management', () => {
      renderStreamControls();

      const pauseButton = screen.getByLabelText('Pause streaming');
      const resumeButton = screen.getByLabelText('Resume streaming');
      const cancelButton = screen.getByLabelText('Cancel streaming');

      // Check focus ring classes
      expect(pauseButton).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
      expect(resumeButton).toHaveClass('focus:ring-2', 'focus:ring-green-500');
      expect(cancelButton).toHaveClass('focus:ring-2', 'focus:ring-red-500');
    });

    it('keyboard shortcuts are visually indicated', () => {
      renderStreamControls();

      // Check for kbd elements
      const kbdElements = document.querySelectorAll('kbd');
      expect(kbdElements).toHaveLength(2);
      expect(kbdElements[0]).toHaveTextContent('Space');
      expect(kbdElements[1]).toHaveTextContent('Ctrl+C');
    });
  });

  describe('Styling', () => {
    it('applies correct base classes', () => {
      renderStreamControls();

      const toolbar = screen.getByRole('toolbar');
      expect(toolbar).toHaveClass(
        'flex',
        'items-center',
        'gap-2',
        'p-3',
        'bg-white',
        'dark:bg-gray-800',
        'rounded-lg',
        'border',
        'border-gray-200',
        'dark:border-gray-700',
        'shadow-sm'
      );
    });

    it('buttons have correct color schemes', () => {
      renderStreamControls();

      const pauseButton = screen.getByLabelText('Pause streaming');
      const resumeButton = screen.getByLabelText('Resume streaming');
      const cancelButton = screen.getByLabelText('Cancel streaming');

      expect(pauseButton).toHaveClass('bg-blue-500', 'hover:bg-blue-600');
      expect(resumeButton).toHaveClass('bg-green-500', 'hover:bg-green-600');
      expect(cancelButton).toHaveClass('bg-red-500', 'hover:bg-red-600');
    });

    it('uses dark mode compatible colors', () => {
      renderStreamControls();

      const toolbar = screen.getByRole('toolbar');
      expect(toolbar).toHaveClass('dark:bg-gray-800', 'dark:border-gray-700');
    });
  });

  describe('Icons', () => {
    it('renders correct icons for each button', () => {
      renderStreamControls();

      // Check for Lucide icons by their class names
      expect(document.querySelector('.lucide-pause')).toBeInTheDocument();
      expect(document.querySelector('.lucide-play')).toBeInTheDocument();
      expect(document.querySelector('.lucide-square')).toBeInTheDocument();
      expect(document.querySelector('.lucide-keyboard')).toBeInTheDocument();
    });
  });

  describe('Status Indicator', () => {
    it('shows streaming active status with animated indicator', () => {
      renderStreamControls();

      expect(screen.getByText('Streaming active')).toBeInTheDocument();

      const statusDot = document.querySelector('.w-2.h-2.bg-green-500.animate-pulse');
      expect(statusDot).toBeInTheDocument();
    });
  });

  describe('Event Listener Cleanup', () => {
    it('removes event listeners on unmount', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      const { unmount } = renderStreamControls();

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid button clicks', () => {
      renderStreamControls();

      const pauseButton = screen.getByLabelText('Pause streaming');

      // Click multiple times rapidly
      fireEvent.click(pauseButton);
      fireEvent.click(pauseButton);
      fireEvent.click(pauseButton);

      expect(mockPauseStreaming).toHaveBeenCalledTimes(3);
    });

    it('handles keyboard shortcut spam', () => {
      renderStreamControls();

      // Press Ctrl+C multiple times
      for (let i = 0; i < 5; i++) {
        fireEvent.keyDown(document, { key: 'c', ctrlKey: true });
      }

      expect(mockCancelStreaming).toHaveBeenCalledTimes(5);
    });
  });
});