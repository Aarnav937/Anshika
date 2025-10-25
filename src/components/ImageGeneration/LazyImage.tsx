import React, { useState, useRef, useEffect } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  blurDataURL,
  onLoad,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {/* Blur placeholder */}
      {(!isLoaded || !isInView) && (
        <div className="absolute inset-0 z-10">
          {blurDataURL ? (
            <img
              src={blurDataURL}
              alt=""
              className="w-full h-full object-cover filter blur-sm scale-110 animate-pulse"
              style={{
                background: 'linear-gradient(45deg, #f0f0f0, #e0e0e0)',
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-200/50 to-blue-200/50 animate-pulse cosmic-blur-placeholder" />
          )}
          {/* Cosmic loading animation */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="cosmic-loader">
              <div className="cosmic-orb"></div>
              <div className="cosmic-orb"></div>
              <div className="cosmic-orb"></div>
            </div>
          </div>
        </div>
      )}

      {/* Actual image */}
      {isInView && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-all duration-500 ${
            isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-500">
            <div className="text-2xl mb-2">🌌</div>
            <p className="text-sm">Failed to load image</p>
          </div>
        </div>
      )}

      <style>{`
        .cosmic-blur-placeholder {
          background: linear-gradient(45deg, #f0f0f0, #e0e0e0);
          background-size: 200% 200%;
          animation: cosmic-shimmer 2s ease-in-out infinite;
        }

        @keyframes cosmic-shimmer {
          0% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
          100% { background-position: 0% 0%; }
        }

        .cosmic-loader {
          display: flex;
          gap: 4px;
        }

        .cosmic-orb {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: linear-gradient(45deg, #8b5cf6, #3b82f6);
          animation: cosmic-orbit 1.5s ease-in-out infinite;
        }

        .cosmic-orb:nth-child(1) {
          animation-delay: 0s;
        }

        .cosmic-orb:nth-child(2) {
          animation-delay: 0.2s;
        }

        .cosmic-orb:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes cosmic-orbit {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
};