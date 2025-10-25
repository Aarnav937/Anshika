import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast } from '../components/Toast';

export interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  duration?: number;
  onUndo?: () => void;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastItem['type'], options?: {
    duration?: number;
    onUndo?: () => void;
  }) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastItem['type'] = 'info', options?: {
    duration?: number;
    onUndo?: () => void;
  }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast: ToastItem = {
      id,
      message,
      type,
      duration: options?.duration,
      onUndo: options?.onUndo,
    };

    setToasts(prev => [...prev, toast]);

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const value: ToastContextType = {
    toasts,
    showToast,
    removeToast,
    clearAllToasts,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onUndo={toast.onUndo}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};