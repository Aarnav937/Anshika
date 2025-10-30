import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Global error handler to catch translations error
window.addEventListener('error', (event) => {
  if (event.message.includes('translations') || event.error?.message?.includes('translations')) {
    console.warn('🔧 Caught translations error:', event.error);
    // Prevent the error from propagating
    event.preventDefault();
  }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('translations')) {
    console.warn('🔧 Caught translations promise rejection:', event.reason);
    // Prevent the error from propagating
    event.preventDefault();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
