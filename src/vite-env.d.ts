/// <reference types="vite/client" />

// Buffer polyfill for browser environment
declare global {
  var Buffer: any;
}

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string
  readonly VITE_WEATHERAPI_KEY: string
  readonly VITE_GOOGLE_SEARCH_API_KEY: string
  readonly VITE_GOOGLE_SEARCH_ENGINE_ID: string
  readonly GEMINI_MODEL: string
  readonly SKYNET_ENVIRONMENT: string
  readonly LOG_LEVEL: string
  readonly DEBUG: string
  readonly CACHE_TTL: string
  readonly MAX_CONCURRENT_REQUESTS: string

  readonly ENABLE_AUDIO: string
  readonly ENABLE_DISPLAY_CONTROL: string
  readonly ENABLE_POWER_MANAGEMENT: string
  readonly ENABLE_SMART_AUTOMATION: string
  readonly ENABLE_WEB_SCRAPING: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
