import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StreamingIndicator } from '../StreamingIndicator';

describe('StreamingIndicator', () => {
  describe('Default Props', () => {
    it('renders with default props', () => {
      render(<StreamingIndicator />);

      const messages = screen.getAllByText('Anshika is thinking...');
      expect(messages).toHaveLength(2); // One visible, one screen reader
      expect(messages[0]).toBeVisible();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has correct accessibility attributes by default', () => {
      render(<StreamingIndicator />);

      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveAttribute('aria-live', 'polite');
      expect(statusElement).toHaveAttribute('aria-label', 'Anshika is thinking...');
    });

    it('includes screen reader only text', () => {
      render(<StreamingIndicator />);

      const srOnlyText = screen.getAllByText('Anshika is thinking...')[1]; // Second element is screen reader
      expect(srOnlyText).toHaveClass('sr-only');
      expect(srOnlyText).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('renders custom message', () => {
      render(<StreamingIndicator message="Custom thinking message..." />);

      const messages = screen.getAllByText('Custom thinking message...');
      expect(messages).toHaveLength(2); // One visible, one screen reader
      expect(messages[0]).toBeVisible();
      expect(messages[1]).toHaveClass('sr-only');
    });

    it('applies custom className', () => {
      render(<StreamingIndicator className="custom-class" />);

      const container = screen.getByRole('status');
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('Size Variants', () => {
    it('renders small size correctly', () => {
      render(<StreamingIndicator size="sm" />);

      const container = screen.getByRole('status');
      expect(container).toHaveClass('text-xs');
    });

    it('renders medium size correctly', () => {
      render(<StreamingIndicator size="md" />);

      const container = screen.getByRole('status');
      expect(container).toHaveClass('text-sm');
    });

    it('renders large size correctly', () => {
      render(<StreamingIndicator size="lg" />);

      const container = screen.getByRole('status');
      expect(container).toHaveClass('text-base');
    });
  });

  describe('Animation Variants', () => {
    describe('Dots Variant (Default)', () => {
      it('renders dots animation correctly', () => {
        render(<StreamingIndicator variant="dots" />);

        // Check for three bouncing dots
        const dots = document.querySelectorAll('[aria-hidden="true"] .w-2');
        expect(dots).toHaveLength(3);

        // Check that message is displayed (get all instances)
        const messages = screen.getAllByText('Anshika is thinking...');
        expect(messages).toHaveLength(2);
        expect(messages[0]).toBeVisible();
      });

      it('applies correct animation delays to dots', () => {
        render(<StreamingIndicator variant="dots" />);

        const dots = document.querySelectorAll('[aria-hidden="true"] .w-2');
        expect(dots[0]).toHaveStyle({ animationDelay: '0ms' });
        expect(dots[1]).toHaveStyle({ animationDelay: '150ms' });
        expect(dots[2]).toHaveStyle({ animationDelay: '300ms' });
      });
    });

    describe('Pulse Variant', () => {
      it('renders pulse animation correctly', () => {
        render(<StreamingIndicator variant="pulse" />);

        // Check for pulse dot
        const pulseDot = document.querySelector('.w-3');
        expect(pulseDot).toBeInTheDocument();
        expect(pulseDot).toHaveClass('animate-pulse');

        // Check for "Generating response..." text
        expect(screen.getByText('Generating response...')).toBeInTheDocument();

        // Should not show the default message separately (only screen reader version)
        const messages = screen.getAllByText('Anshika is thinking...');
        expect(messages).toHaveLength(1); // Only screen reader
        expect(messages[0]).toHaveClass('sr-only');
      });
    });

    describe('Wave Variant', () => {
      it('renders wave animation correctly', () => {
        render(<StreamingIndicator variant="wave" />);

        // Check for 5 wave bars
        const waveBars = document.querySelectorAll('[aria-hidden="true"] .w-1');
        expect(waveBars).toHaveLength(5);

        // Check that each bar has animation
        waveBars.forEach((bar, index) => {
          expect(bar).toHaveClass('animate-pulse');
          expect(bar).toHaveStyle({ animationDelay: `${index * 100}ms` });
          expect(bar).toHaveStyle({ animationDuration: '1.5s' });
        });

        // Check that message is displayed
        const messages = screen.getAllByText('Anshika is thinking...');
        expect(messages).toHaveLength(2);
        expect(messages[0]).toBeVisible();
      });

      it('wave bars have varying heights', () => {
        render(<StreamingIndicator variant="wave" />);

        const waveBars = document.querySelectorAll('[aria-hidden="true"] .w-1');
        const heights = Array.from(waveBars).map(bar =>
          parseInt((bar as HTMLElement).style.height)
        );

        // Heights should vary (not all the same)
        const uniqueHeights = new Set(heights);
        expect(uniqueHeights.size).toBeGreaterThan(1);
      });
    });

    describe('Typing Variant', () => {
      it('renders typing animation correctly', () => {
        render(<StreamingIndicator variant="typing" />);

        // Check for typing bars with different heights
        const typingBars = document.querySelectorAll('[aria-hidden="true"] .w-1');
        expect(typingBars).toHaveLength(5);

        // Check animation delays
        expect(typingBars[0]).toHaveStyle({ animationDelay: '0ms' });
        expect(typingBars[1]).toHaveStyle({ animationDelay: '100ms' });
        expect(typingBars[2]).toHaveStyle({ animationDelay: '200ms' });
        expect(typingBars[3]).toHaveStyle({ animationDelay: '300ms' });
        expect(typingBars[4]).toHaveStyle({ animationDelay: '400ms' });

        // Check for "Typing..." text
        expect(screen.getByText('Typing...')).toBeInTheDocument();

        // Should not show the default message separately (only screen reader)
        const messages = screen.getAllByText('Anshika is thinking...');
        expect(messages).toHaveLength(1); // Only screen reader
        expect(messages[0]).toHaveClass('sr-only');
      });

      it('typing bars have varying heights', () => {
        render(<StreamingIndicator variant="typing" />);

        const typingBars = document.querySelectorAll('[aria-hidden="true"] .w-1');
        const heightClasses = Array.from(typingBars).map(bar =>
          Array.from(bar.classList).find(cls => cls.startsWith('h-'))
        );

        // Should have height classes: h-4, h-6, h-3, h-5, h-4
        expect(heightClasses).toEqual(['h-4', 'h-6', 'h-3', 'h-5', 'h-4']);
      });
    });
  });

  describe('Accessibility', () => {
    it('has aria-live attribute for screen readers', () => {
      render(<StreamingIndicator />);

      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    });

    it('has aria-label matching the message', () => {
      const customMessage = 'Custom accessibility message';
      render(<StreamingIndicator message={customMessage} />);

      expect(screen.getByRole('status')).toHaveAttribute('aria-label', customMessage);
    });

    it('includes screen reader only text for all variants', () => {
      const variants: Array<'dots' | 'pulse' | 'wave' | 'typing'> = ['dots', 'pulse', 'wave', 'typing'];

      variants.forEach(variant => {
        const { container } = render(<StreamingIndicator variant={variant} message="Test message" />);
        const srOnlyElement = container.querySelector('.sr-only');
        expect(srOnlyElement).toBeInTheDocument();
        expect(srOnlyElement).toHaveTextContent('Test message');
      });
    });

    it('marks decorative elements as aria-hidden', () => {
      render(<StreamingIndicator />);

      const decorativeElements = document.querySelectorAll('[aria-hidden="true"]');
      expect(decorativeElements.length).toBeGreaterThan(0);
    });
  });

  describe('Styling', () => {
    it('applies correct base classes', () => {
      render(<StreamingIndicator />);

      const container = screen.getByRole('status');
      expect(container).toHaveClass('flex', 'items-center', 'gap-3');
    });

    it('applies purple color scheme consistently', () => {
      render(<StreamingIndicator variant="dots" />);

      // Check dots have purple background
      const dots = document.querySelectorAll('.bg-purple-500');
      expect(dots.length).toBeGreaterThan(0);

      // Check text has purple color
      const purpleText = document.querySelector('.text-purple-600');
      expect(purpleText).toBeInTheDocument();
    });

    it('uses dark mode compatible colors', () => {
      render(<StreamingIndicator />);

      // Check for dark mode classes
      const darkModeText = document.querySelector('.dark\\:text-purple-400');
      expect(darkModeText).toBeInTheDocument();
    });
  });

  describe('Animation Performance', () => {
    it('uses CSS animations instead of JavaScript', () => {
      render(<StreamingIndicator variant="dots" />);

      const animatedElements = document.querySelectorAll('.animate-bounce');
      expect(animatedElements.length).toBe(3);

      // Ensure no setTimeout or setInterval usage (would indicate JS animations)
      // This is more of a code review check, but we can verify CSS classes are used
      animatedElements.forEach(element => {
        expect(element).toHaveClass('animate-bounce');
      });
    });

    it('has optimized animation timings', () => {
      render(<StreamingIndicator variant="wave" />);

      const waveBars = document.querySelectorAll('.animate-pulse');
      waveBars.forEach((bar, index) => {
        const expectedDelay = index * 100;
        expect(bar).toHaveStyle({ animationDelay: `${expectedDelay}ms` });
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty message gracefully', () => {
      render(<StreamingIndicator message="" />);

      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveAttribute('aria-label', '');
    });

    it('handles very long messages', () => {
      const longMessage = 'A'.repeat(1000);
      render(<StreamingIndicator message={longMessage} />);

      expect(screen.getByRole('status')).toHaveAttribute('aria-label', longMessage);
    });

    it('maintains functionality with additional className', () => {
      render(<StreamingIndicator className="test-class another-class" />);

      const container = screen.getByRole('status');
      expect(container).toHaveClass('test-class', 'another-class');
      expect(container).toHaveClass('flex', 'items-center', 'gap-3'); // Base classes still present
    });
  });
});