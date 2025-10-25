import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  onUndo?: () => void;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  onUndo,
  onClose,
  duration = 5000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    info: 'bg-gradient-to-r from-blue-600 to-purple-600',
    success: 'bg-gradient-to-r from-green-600 to-emerald-600',
    error: 'bg-gradient-to-r from-red-600 to-pink-600',
    warning: 'bg-gradient-to-r from-yellow-500 to-orange-500',
  }[type];

  return (
    <div className={`fixed bottom-4 right-4 ${bgColor} text-white rounded-xl shadow-2xl p-4 flex items-center gap-3 max-w-md z-50 animate-slide-up backdrop-blur-sm border border-white/20`}>
      {/* Icon */}
      <div className="flex-shrink-0">
        {type === 'success' && (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )}
        {type === 'info' && (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )}
        {type === 'error' && (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )}
        {type === 'warning' && (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      {/* Message */}
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
      </div>

      {/* Undo Button */}
      {onUndo && (
        <button
          onClick={() => {
            onUndo();
            onClose();
          }}
          className="flex-shrink-0 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 text-sm font-medium backdrop-blur-sm border border-white/30 hover:border-white/50"
        >
          Undo
        </button>
      )}

      {/* Close Button */}
      <button
        onClick={onClose}
        className="flex-shrink-0 hover:bg-white/20 rounded-lg p-1 transition-all duration-200 backdrop-blur-sm border border-white/20 hover:border-white/40"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
