// src/config/liveModeConfig.ts

export const CONNECTION_CONFIG = {
  reconnect: {
    maxAttempts: 5,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    exponentialBackoff: true
  },
  timeout: {
    connection: 10000, // 10 seconds
    message: 30000 // 30 seconds
  },
  heartbeat: {
    interval: 30000, // 30 seconds
    timeout: 5000 // 5 seconds
  }
};

export const DEBUG_CONFIG = {
  enabled: process.env.NODE_ENV === 'development',
  logLevels: {
    connection: true,
    messages: true,
    errors: true,
    performance: false
  }
};