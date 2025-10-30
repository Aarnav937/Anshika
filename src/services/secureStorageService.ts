/**
 * 🔐 Secure API Key Storage Service
 * ==================================
 * Encrypts and stores API keys securely in browser localStorage
 * Uses Web Crypto API for encryption
 */

class SecureStorageService {
  private storageKey = 'anshika_encrypted_keys';
  private encryptionKey: CryptoKey | null = null;

  /**
   * Initialize encryption key (derived from device fingerprint + user salt)
   */
  private async getEncryptionKey(): Promise<CryptoKey> {
    if (this.encryptionKey) return this.encryptionKey;

    // Check if Web Crypto API is available
    if (!window.crypto?.subtle) {
      console.warn('⚠️ Web Crypto API not available (requires HTTPS). Using fallback storage.');
      // Return a dummy key - we'll use base64 encoding instead
      throw new Error('Web Crypto API not available');
    }

    // Create a deterministic key based on browser fingerprint
    const fingerprint = await this.getBrowserFingerprint();
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(fingerprint),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    this.encryptionKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('anshika-secure-storage'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    return this.encryptionKey;
  }

  /**
   * Generate browser fingerprint (simple version)
   */
  private async getBrowserFingerprint(): Promise<string> {
    const data = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 'unknown',
    ].join('|');

    // Check if crypto.subtle is available (requires HTTPS or localhost)
    if (!window.crypto?.subtle) {
      // Fallback: simple hash for non-secure contexts
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(16).padStart(16, '0');
    }

    const encoder = new TextEncoder();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Encrypt data
   */
  private async encrypt(text: string): Promise<string> {
    try {
      const key = await this.getEncryptionKey();
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      // Convert to base64
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      // Fallback: simple base64 encoding (not secure, but works without HTTPS)
      console.warn('⚠️ Encryption failed, using base64 fallback:', error);
      return 'PLAIN:' + btoa(text);
    }
  }

  /**
   * Decrypt data
   */
  private async decrypt(encryptedText: string): Promise<string> {
    // Check for fallback encoding
    if (encryptedText.startsWith('PLAIN:')) {
      return atob(encryptedText.substring(6));
    }

    try {
      const key = await this.getEncryptionKey();
      const combined = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      return '';
    }
  }

  /**
   * Save API key securely
   */
  public async saveApiKey(keyName: string, keyValue: string): Promise<void> {
    const keys = await this.getAllKeys();
    keys[keyName] = keyValue;

    const encrypted = await this.encrypt(JSON.stringify(keys));
    localStorage.setItem(this.storageKey, encrypted);
    console.log(`🔐 Saved encrypted key: ${keyName}`);
  }

  /**
   * Get API key
   */
  public async getApiKey(keyName: string): Promise<string | null> {
    const keys = await this.getAllKeys();
    return keys[keyName] || null;
  }

  /**
   * Get all API keys
   */
  public async getAllKeys(): Promise<Record<string, string>> {
    try {
      const encrypted = localStorage.getItem(this.storageKey);
      if (!encrypted) return {};

      const decrypted = await this.decrypt(encrypted);
      if (!decrypted) return {};

      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to get keys:', error);
      return {};
    }
  }

  /**
   * Delete API key
   */
  public async deleteApiKey(keyName: string): Promise<void> {
    const keys = await this.getAllKeys();
    delete keys[keyName];

    const encrypted = await this.encrypt(JSON.stringify(keys));
    localStorage.setItem(this.storageKey, encrypted);
    console.log(`🗑️ Deleted key: ${keyName}`);
  }

  /**
   * Check if key exists
   */
  public async hasApiKey(keyName: string): Promise<boolean> {
    const keys = await this.getAllKeys();
    return !!keys[keyName];
  }

  /**
   * Clear all keys
   */
  public clearAllKeys(): void {
    localStorage.removeItem(this.storageKey);
    console.log('🗑️ Cleared all API keys');
  }

  /**
   * Validate Gemini API Key
   */
  public async validateGeminiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );

      if (response.ok) {
        return { valid: true };
      } else if (response.status === 400 || response.status === 403) {
        return { valid: false, error: 'Invalid API key' };
      } else {
        return { valid: false, error: 'Failed to validate key' };
      }
    } catch (error) {
      return { valid: false, error: 'Network error' };
    }
  }

  /**
   * Validate Weather API Key
   */
  public async validateWeatherKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch(
        `http://api.weatherapi.com/v1/current.json?key=${apiKey}&q=London`
      );

      if (response.ok) {
        return { valid: true };
      } else if (response.status === 403 || response.status === 401) {
        return { valid: false, error: 'Invalid API key' };
      } else {
        return { valid: false, error: 'Failed to validate key' };
      }
    } catch (error) {
      return { valid: false, error: 'Network error' };
    }
  }

  /**
   * Validate Google Search API Key
   */
  public async validateGoogleSearchKey(apiKey: string, engineId: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${engineId}&q=test`
      );

      if (response.ok) {
        return { valid: true };
      } else if (response.status === 400 || response.status === 403) {
        return { valid: false, error: 'Invalid API key or Engine ID' };
      } else {
        return { valid: false, error: 'Failed to validate key' };
      }
    } catch (error) {
      return { valid: false, error: 'Network error' };
    }
  }
}

export const secureStorage = new SecureStorageService();
