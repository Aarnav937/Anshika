import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useMobileGestures, PinchGesture, TouchPoint } from '../hooks/useMobileGestures';

interface PinchToZoomProps {
  children: React.ReactNode;
  minScale?: number;
  maxScale?: number;
  className?: string;
  onZoom?: (scale: number, centerPoint: TouchPoint) => void;
  onReset?: () => void;
  showControls?: boolean;
  enableMomentum?: boolean;
}

export const PinchToZoom: React.FC<PinchToZoomProps> = ({
  children,
  minScale = 0.5,
  maxScale = 3,
  className = '',
  onZoom,
  onReset,
  showControls = true,
  enableMomentum = true
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScaleRef = useRef(1);

  // @ts-expect-error - Ref used internally by useMobileGestures hook
  const { ref } = useMobileGestures({
    onPinch: (gesture: PinchGesture) => {
      const newScale = Math.max(minScale, Math.min(maxScale, gesture.scale));
      setScale(newScale);
      lastScaleRef.current = newScale;
      setIsZooming(true);

      if (onZoom) {
        onZoom(newScale, gesture.centerPoint);
      }
    }
  }, {
    pinchThreshold: 0.05,
    enableHapticFeedback: true
  });

  // Handle zoom controls
  const handleZoomIn = () => {
    const newScale = Math.min(maxScale, scale + 0.25);
    setScale(newScale);
    lastScaleRef.current = newScale;

    if (onZoom) {
      onZoom(newScale, { x: 0, y: 0, timestamp: Date.now() });
    }
  };

  const handleZoomOut = () => {
    const newScale = Math.max(minScale, scale - 0.25);
    setScale(newScale);
    lastScaleRef.current = newScale;

    if (onZoom) {
      onZoom(newScale, { x: 0, y: 0, timestamp: Date.now() });
    }
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    lastScaleRef.current = 1;

    if (onReset) {
      onReset();
    }
  };

  // Auto-fit content when scale changes
  useEffect(() => {
    if (containerRef.current && scale <= 1) {
      const container = containerRef.current;
      const content = container.firstElementChild as HTMLElement;

      if (content) {
        const containerRect = container.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();

        // Center the content if it's smaller than container
        if (contentRect.width <= containerRect.width && contentRect.height <= containerRect.height) {
          setPosition({
            x: (containerRect.width - contentRect.width) / 2,
            y: (containerRect.height - contentRect.height) / 2
          });
        }
      }
    }
  }, [scale]);

  // Momentum scrolling for panning
  useEffect(() => {
    if (!enableMomentum || !containerRef.current) return;

    let isPanning = false;
    let lastPanPoint: TouchPoint | null = null;
    let velocityX = 0;
    let velocityY = 0;
    let animationId: number;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isPanning = true;
        lastPanPoint = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          timestamp: Date.now()
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPanning || !lastPanPoint || e.touches.length !== 1) return;

      const currentPoint = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        timestamp: Date.now()
      };

      const deltaX = currentPoint.x - lastPanPoint.x;
      const deltaY = currentPoint.y - lastPanPoint.y;
      const deltaTime = currentPoint.timestamp - lastPanPoint.timestamp;

      if (deltaTime > 0) {
        velocityX = deltaX / deltaTime;
        velocityY = deltaY / deltaTime;
      }

      setPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));

      lastPanPoint = currentPoint;
    };

    const handleTouchEnd = () => {
      isPanning = false;
      lastPanPoint = null;

      // Apply momentum
      if (Math.abs(velocityX) > 0.1 || Math.abs(velocityY) > 0.1) {
        const animate = () => {
          setPosition(prev => {
            const newX = prev.x + velocityX * 16;
            const newY = prev.y + velocityY * 16;

            // Apply friction
            velocityX *= 0.95;
            velocityY *= 0.95;

            // Stop animation when velocity is low
            if (Math.abs(velocityX) < 0.1 && Math.abs(velocityY) < 0.1) {
              return prev;
            }

            return { x: newX, y: newY };
          });

          if (Math.abs(velocityX) >= 0.1 || Math.abs(velocityY) >= 0.1) {
            animationId = requestAnimationFrame(animate);
          }
        };

        animationId = requestAnimationFrame(animate);
      }
    };

    const container = containerRef.current;
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [enableMomentum]);

  return (
    <div className={`pinch-to-zoom-container relative overflow-hidden ${className}`}>
      {/* Zoom Controls */}
      {showControls && (
        <div className="absolute top-4 right-4 z-10 flex gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-gray-200 dark:border-gray-700">
          <button
            onClick={handleZoomOut}
            disabled={scale <= minScale}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-target"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <div className="px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </div>

          <button
            onClick={handleZoomIn}
            disabled={scale >= maxScale}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-target"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={handleReset}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors touch-target"
            aria-label="Reset zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Zoomable Content */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing select-none"
        style={{
          transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
          transformOrigin: 'center center',
          transition: isZooming ? 'none' : 'transform 0.1s ease-out'
        }}
        onTransitionEnd={() => setIsZooming(false)}
      >
        {children}
      </div>

      {/* Scale Indicator */}
      {scale !== 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
          {Math.round(scale * 100)}%
        </div>
      )}
    </div>
  );
};

export default PinchToZoom;