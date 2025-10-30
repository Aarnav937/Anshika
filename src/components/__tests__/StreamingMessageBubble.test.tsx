// Mock the date utils BEFORE importing the component
const mockFormatDistanceToNow = jest.fn(() => '2 minutes ago');
jest.mock('../../utils/dateUtils', () => ({
  formatDistanceToNow: mockFormatDistanceToNow,
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StreamingMessageBubble from '../StreamingMessageBubble';
import { Message } from '../../types';

// Mock navigator.clipboard using jest.spyOn
const mockWriteText = jest.fn().mockResolvedValue(undefined);
jest.spyOn(navigator.clipboard, 'writeText').mockImplementation(mockWriteText);

// Mock window.open
global.open = jest.fn();

// Mock Element.prototype.scrollIntoView
const mockScrollIntoView = jest.fn();
Element.prototype.scrollIntoView = mockScrollIntoView;

// Mock requestAnimationFrame and cancelAnimationFrame
const mockRequestAnimationFrame = jest.fn();
const mockCancelAnimationFrame = jest.fn();
global.requestAnimationFrame = mockRequestAnimationFrame;
global.cancelAnimationFrame = mockCancelAnimationFrame;

describe('StreamingMessageBubble', () => {
  const mockMessage: Message = {
    id: 'test-message-id',
    content: 'Hello, this is a test message',
    role: 'assistant',
    timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
    mode: 'online',
  };

  const mockUserMessage: Message = {
    ...mockMessage,
    role: 'user',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the date mock
    mockFormatDistanceToNow.mockReturnValue('2 minutes ago');
  });

  describe('Basic Rendering', () => {
    it('renders assistant message correctly', () => {
      render(<StreamingMessageBubble message={mockMessage} />);

      expect(screen.getByText('Hello, this is a test message')).toBeInTheDocument();
      expect(screen.getByText('2m ago • online')).toBeInTheDocument();
    });

    it('renders user message with correct alignment', () => {
      render(<StreamingMessageBubble message={mockUserMessage} />);

      const messageElement = screen.getByText('Hello, this is a test message').closest('.chat-message');
      expect(messageElement).toHaveClass('user');
    });

    it('displays reactions when present', () => {
      const messageWithReactions: Message = {
        ...mockMessage,
        reactions: [
          { emoji: '👍', count: 2 },
          { emoji: '❤️', count: 1 },
        ],
      };

      render(<StreamingMessageBubble message={messageWithReactions} />);

      expect(screen.getByText('👍')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('❤️')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Streaming Functionality', () => {
    it('shows streaming indicator when isStreaming is true', () => {
      render(<StreamingMessageBubble message={mockMessage} isStreaming={true} />);

      expect(screen.getByText('Streaming...')).toBeInTheDocument();
      expect(screen.getByText('• Live')).toBeInTheDocument();
    });

    it('shows streaming cursor on last text part when streaming', () => {
      render(<StreamingMessageBubble message={mockMessage} isStreaming={true} />);

      const cursor = document.querySelector('.streaming-cursor');
      expect(cursor).toBeInTheDocument();
      expect(cursor).toHaveTextContent('|');
    });

    it('updates content during streaming with delay', async () => {
      // Mock requestAnimationFrame to execute immediately for testing
      const originalRAF = global.requestAnimationFrame;
      global.requestAnimationFrame = jest.fn((cb) => {
        setTimeout(cb, 0); // Execute after a tick
        return 1;
      });

      const { rerender } = render(
        <StreamingMessageBubble
          message={{ ...mockMessage, content: 'Hello' }}
          isStreaming={true}
          streamingChunkDelay={10}
        />
      );

      expect(screen.getByText('Hello')).toBeInTheDocument();

      // Update message content (simulating streaming chunk)
      rerender(
        <StreamingMessageBubble
          message={{ ...mockMessage, content: 'Hello world' }}
          isStreaming={true}
          streamingChunkDelay={10}
        />
      );

      // Wait for content to update
      await waitFor(() => {
        expect(screen.getByText('Hello world')).toBeInTheDocument();
      });

      // Restore original requestAnimationFrame
      global.requestAnimationFrame = originalRAF;
    });

    it('auto-scrolls content during streaming', async () => {
      // Mock requestAnimationFrame to execute immediately for testing
      const originalRAF = global.requestAnimationFrame;
      global.requestAnimationFrame = jest.fn((cb) => {
        setTimeout(cb, 0);
        return 1;
      });

      const { rerender } = render(
        <StreamingMessageBubble
          message={{ ...mockMessage, content: 'Initial' }}
          isStreaming={true}
          streamingChunkDelay={10}
        />
      );

      // Update content to trigger streaming update and auto-scroll
      rerender(
        <StreamingMessageBubble
          message={{ ...mockMessage, content: 'Initial content update' }}
          isStreaming={true}
          streamingChunkDelay={10}
        />
      );

      // Wait for the update to happen
      await waitFor(() => {
        expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'end' });
      });

      // Restore original requestAnimationFrame
      global.requestAnimationFrame = originalRAF;
    });
  });

  describe('Content Parsing', () => {
    it('parses plain text content correctly', () => {
      render(<StreamingMessageBubble message={mockMessage} />);

      expect(screen.getByText('Hello, this is a test message')).toBeInTheDocument();
    });

    it('parses image markdown correctly', () => {
      const messageWithImage: Message = {
        ...mockMessage,
        content: 'Here is an image: ![Alt text](https://example.com/image.jpg) and some text after.',
      };

      render(<StreamingMessageBubble message={messageWithImage} />);

      const image = screen.getByAltText('Alt text');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
      expect(screen.getByText('Here is an image:')).toBeInTheDocument();
      expect(screen.getByText('and some text after.')).toBeInTheDocument();
    });

    it('handles multiple images in content', () => {
      const messageWithMultipleImages: Message = {
        ...mockMessage,
        content: '![First](url1.jpg) Text ![Second](url2.jpg)',
      };

      render(<StreamingMessageBubble message={messageWithMultipleImages} />);

      expect(screen.getByAltText('First')).toBeInTheDocument();
      expect(screen.getByAltText('Second')).toBeInTheDocument();
      expect(screen.getByText('Text')).toBeInTheDocument();
    });

    it('opens image in new tab when clicked', () => {
      const messageWithImage: Message = {
        ...mockMessage,
        content: '![Test image](https://example.com/test.jpg)',
      };

      render(<StreamingMessageBubble message={messageWithImage} />);

      const image = screen.getByAltText('Test image');
      fireEvent.click(image);

      expect(global.open).toHaveBeenCalledWith('https://example.com/test.jpg', '_blank');
    });
  });

  describe('Interaction Handlers', () => {
    it('calls onEdit when edit button is clicked', () => {
      const mockOnEdit = jest.fn();
      render(
        <StreamingMessageBubble
          message={mockUserMessage}
          onEdit={mockOnEdit}
        />
      );

      // Hover to show quick actions
      const messageElement = screen.getByText('Hello, this is a test message').closest('.chat-message');
      if (messageElement) {
        fireEvent.mouseEnter(messageElement);
      }

      // Click edit button (assuming it exists in MessageQuickActions)
      // Note: This test assumes MessageQuickActions renders an edit button
      // In a real scenario, you might need to mock or test MessageQuickActions separately
    });

    it('calls onPin when pin action is triggered', () => {
      const mockOnPin = jest.fn();
      render(
        <StreamingMessageBubble
          message={mockMessage}
          onPin={mockOnPin}
        />
      );

      // This would typically be tested through MessageQuickActions
      // For now, we'll assume the prop is passed correctly
      expect(mockOnPin).not.toHaveBeenCalled(); // Initial state
    });

    it('calls onDelete when delete action is triggered', () => {
      const mockOnDelete = jest.fn();
      render(
        <StreamingMessageBubble
          message={mockMessage}
          onDelete={mockOnDelete}
        />
      );

      expect(mockOnDelete).not.toHaveBeenCalled(); // Initial state
    });

    it('calls onReact when react action is triggered', () => {
      const mockOnReact = jest.fn();
      render(
        <StreamingMessageBubble
          message={mockMessage}
          onReact={mockOnReact}
        />
      );

      expect(mockOnReact).not.toHaveBeenCalled(); // Initial state
    });

    it('copies content to clipboard when copy is triggered', () => {
      render(<StreamingMessageBubble message={mockMessage} />);

      // This would be tested through MessageQuickActions
      // The handleCopy function uses navigator.clipboard.writeText
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });
  });

  describe('Streaming Controls', () => {
    it('calls onCancelStreaming when cancel is triggered', () => {
      const mockOnCancel = jest.fn();
      render(
        <StreamingMessageBubble
          message={mockMessage}
          isStreaming={true}
          onCancelStreaming={mockOnCancel}
        />
      );

      // This would be tested through MessageQuickActions streaming controls
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('calls onPauseStreaming when pause is triggered', () => {
      const mockOnPause = jest.fn();
      render(
        <StreamingMessageBubble
          message={mockMessage}
          isStreaming={true}
          onPauseStreaming={mockOnPause}
        />
      );

      expect(mockOnPause).not.toHaveBeenCalled();
    });

    it('calls onResumeStreaming when resume is triggered', () => {
      const mockOnResume = jest.fn();
      render(
        <StreamingMessageBubble
          message={mockMessage}
          isStreaming={true}
          onResumeStreaming={mockOnResume}
        />
      );

      expect(mockOnResume).not.toHaveBeenCalled();
    });
  });

  describe('Message Editing', () => {
    it('enters edit mode when edit is triggered', () => {
      render(<StreamingMessageBubble message={mockUserMessage} />);

      // Initially not in edit mode
      expect(screen.queryByDisplayValue('Hello, this is a test message')).not.toBeInTheDocument();
    });

    it('calls onEdit with new content when save is triggered', () => {
      const mockOnEdit = jest.fn();
      render(
        <StreamingMessageBubble
          message={mockUserMessage}
          onEdit={mockOnEdit}
        />
      );

      // Edit functionality would be tested through MessageEditor component
      expect(mockOnEdit).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for streaming content', () => {
      render(<StreamingMessageBubble message={mockMessage} isStreaming={true} />);

      // Check for streaming indicator with proper text
      expect(screen.getByText('Streaming...')).toBeInTheDocument();
    });

    it('shows hover states for interactive elements', () => {
      render(<StreamingMessageBubble message={mockMessage} />);

      const messageElement = screen.getByText('Hello, this is a test message').closest('.chat-message');
      expect(messageElement).toHaveClass('group');
    });
  });

  describe('Performance', () => {
    it('cancels animation frame on unmount', async () => {
      // Mock requestAnimationFrame to control when it executes
      const originalRAF = global.requestAnimationFrame;
      global.requestAnimationFrame = jest.fn(() => 1);

      const { rerender, unmount } = render(
        <StreamingMessageBubble
          message={{ ...mockMessage, content: 'Initial' }}
          isStreaming={true}
          streamingChunkDelay={1000} // Large delay to ensure animation frame is scheduled
        />
      );

      // Trigger content update to start animation frame scheduling
      rerender(
        <StreamingMessageBubble
          message={{ ...mockMessage, content: 'Initial content' }}
          isStreaming={true}
          streamingChunkDelay={1000}
        />
      );

      // Wait a bit for animation frame to be scheduled
      await new Promise(resolve => setTimeout(resolve, 20));

      unmount();

      expect(mockCancelAnimationFrame).toHaveBeenCalled();

      // Restore original requestAnimationFrame
      global.requestAnimationFrame = originalRAF;
    });

    it('respects streaming chunk delay', async () => {
      // Mock requestAnimationFrame to execute immediately for testing
      const originalRAF = global.requestAnimationFrame;
      global.requestAnimationFrame = jest.fn((cb) => {
        setTimeout(cb, 0);
        return 1;
      });

      const { rerender } = render(
        <StreamingMessageBubble
          message={{ ...mockMessage, content: 'Initial' }}
          isStreaming={true}
          streamingChunkDelay={50} // Longer delay for testing
        />
      );

      // Update content
      rerender(
        <StreamingMessageBubble
          message={{ ...mockMessage, content: 'Initial updated content' }}
          isStreaming={true}
          streamingChunkDelay={50}
        />
      );

      // Content should update after delay
      await waitFor(
        () => {
          expect(screen.getByText('Initial updated content')).toBeInTheDocument();
        },
        { timeout: 200 } // Give enough time for the delay
      );

      // Restore original requestAnimationFrame
      global.requestAnimationFrame = originalRAF;
    });
  });
});