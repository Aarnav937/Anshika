import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock IndexedDB for tests
import 'fake-indexeddb/auto';

// Make vitest globals available as jest for compatibility
(global as any).jest = {
  fn: vi.fn,
  mock: vi.mock,
  spyOn: vi.spyOn,
  clearAllMocks: vi.clearAllMocks,
  resetAllMocks: vi.resetAllMocks,
  restoreAllMocks: vi.restoreAllMocks,
};

// Also make jest available globally
(global as any).jest = (global as any).jest;

// Mock Web APIs that might not be available in test environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock ResizeObserver
(global as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
(global as any).IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock Speech Recognition API
Object.defineProperty(window, 'SpeechRecognition', {
  writable: true,
  value: class SpeechRecognition {
    continuous = false;
    interimResults = false;
    lang = '';
    start() {}
    stop() {}
    abort() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {}
  },
});

Object.defineProperty(window, 'webkitSpeechRecognition', {
  writable: true,
  value: (window as any).SpeechRecognition,
});

// Mock Speech Synthesis API
Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: {
    speak: () => {},
    cancel: () => {},
    pause: () => {},
    resume: () => {},
    getVoices: () => [],
    pending: false,
    speaking: false,
    paused: false,
  },
});

// Mock WebSocket
(global as any).WebSocket = class WebSocket {
  constructor() {
    (this as any).readyState = 1; // OPEN
  }
  send() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {}
};

// Mock File API
Object.defineProperty(window, 'File', {
  writable: true,
  value: class File {
    constructor(bits: any[], _filename: string, options = {}) {
      return new Blob(bits, options) as any;
    }
  },
});

Object.defineProperty(window, 'FileReader', {
  writable: true,
  value: class FileReader {
    readAsDataURL() {
      setTimeout(() => {
        (this as any).onload?.({ target: { result: 'data:image/png;base64,test' } });
      }, 0);
    }
    readAsText() {
      setTimeout(() => {
        (this as any).onload?.({ target: { result: 'test content' } });
      }, 0);
    }
    readAsArrayBuffer() {
      setTimeout(() => {
        (this as any).onload?.({ target: { result: new ArrayBuffer(0) } });
      }, 0);
    }
  },
});

// Mock URL.createObjectURL
Object.defineProperty(window.URL, 'createObjectURL', {
  writable: true,
  value: () => 'blob:test',
});

Object.defineProperty(window.URL, 'revokeObjectURL', {
  writable: true,
  value: () => {},
});

// Mock localStorage
const localStorageMock = {
  getItem: () => null,
  setItem: () => null,
  removeItem: () => null,
  clear: () => null,
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: () => null,
  setItem: () => null,
  removeItem: () => null,
  clear: () => null,
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: async () => {},
    readText: async () => '',
  },
});

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: async () => ({}),
    enumerateDevices: async () => [],
  },
});

// Mock canvas
const mockCanvasContext = {
  fillRect: () => {},
  clearRect: () => {},
  getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  putImageData: () => {},
  createImageData: () => ({}),
  setTransform: () => {},
  drawImage: () => {},
  save: () => {},
  restore: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  closePath: () => {},
  stroke: () => {},
  fill: () => {},
  arc: () => {},
  fillText: () => {},
  measureText: () => ({ width: 0 }),
};

Object.defineProperty(window.HTMLCanvasElement.prototype, 'getContext', {
  value: () => mockCanvasContext,
});

Object.defineProperty(window.HTMLCanvasElement.prototype, 'toDataURL', {
  value: () => 'data:image/png;base64,test',
});

// Mock Audio API
(global as any).Audio = class Audio {
  constructor() {
    (this as any).volume = 1;
    (this as any).currentTime = 0;
    (this as any).duration = 0;
    (this as any).paused = true;
  }
  play() { return Promise.resolve(); }
  pause() {}
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {}
};

// Mock fetch for tests that need it
(global as any).fetch = () => Promise.resolve({
  ok: true,
  status: 200,
  json: () => Promise.resolve({}),
  text: () => Promise.resolve(''),
  blob: () => Promise.resolve(new Blob()),
} as any);

// Suppress console warnings during tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0]?.includes?.('ReactDOMTestUtils')) return;
  originalWarn(...args);
};