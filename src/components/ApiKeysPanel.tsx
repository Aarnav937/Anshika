/**
 * 🔑 API Keys Settings Panel
 * ==========================
 * Secure UI for managing API keys with validation
 */

import React, { useState, useEffect } from 'react';
import { Key, Check, X, Eye, EyeOff, AlertCircle, Lock } from 'lucide-react';
import { secureStorage } from '../services/secureStorageService';
import { refreshApiKey } from '../services/geminiService';

interface ApiKeysPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface KeyStatus {
  exists: boolean;
  valid?: boolean;
  validating?: boolean;
  error?: string;
}

export const ApiKeysPanel: React.FC<ApiKeysPanelProps> = ({ isOpen, onClose }) => {
  const [geminiKey, setGeminiKey] = useState('');
  const [weatherKey, setWeatherKey] = useState('');
  const [googleSearchKey, setGoogleSearchKey] = useState('');
  const [googleSearchEngineId, setGoogleSearchEngineId] = useState('');

  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showWeatherKey, setShowWeatherKey] = useState(false);
  const [showSearchKey, setShowSearchKey] = useState(false);

  const [geminiStatus, setGeminiStatus] = useState<KeyStatus>({ exists: false });
  const [weatherStatus, setWeatherStatus] = useState<KeyStatus>({ exists: false });
  const [searchStatus, setSearchStatus] = useState<KeyStatus>({ exists: false });

  // Load existing keys on mount
  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    const keys = await secureStorage.getAllKeys();
    
    if (keys.VITE_GEMINI_API_KEY) {
      setGeminiKey(keys.VITE_GEMINI_API_KEY);
      setGeminiStatus({ exists: true, valid: true });
    }
    
    if (keys.VITE_WEATHERAPI_KEY) {
      setWeatherKey(keys.VITE_WEATHERAPI_KEY);
      setWeatherStatus({ exists: true, valid: true });
    }
    
    if (keys.VITE_GOOGLE_SEARCH_API_KEY) {
      setGoogleSearchKey(keys.VITE_GOOGLE_SEARCH_API_KEY);
    }
    
    if (keys.VITE_GOOGLE_SEARCH_ENGINE_ID) {
      setGoogleSearchEngineId(keys.VITE_GOOGLE_SEARCH_ENGINE_ID);
    }
    
    if (keys.VITE_GOOGLE_SEARCH_API_KEY && keys.VITE_GOOGLE_SEARCH_ENGINE_ID) {
      setSearchStatus({ exists: true, valid: true });
    }
  };

  const validateAndSaveGeminiKey = async () => {
    if (!geminiKey.trim()) return;

    setGeminiStatus({ exists: false, validating: true });
    const result = await secureStorage.validateGeminiKey(geminiKey);

    if (result.valid) {
      await secureStorage.saveApiKey('VITE_GEMINI_API_KEY', geminiKey);
      await refreshApiKey(); // Refresh geminiService API key
      setGeminiStatus({ exists: true, valid: true });
    } else {
      setGeminiStatus({ exists: false, valid: false, error: result.error });
    }
  };

  const validateAndSaveWeatherKey = async () => {
    if (!weatherKey.trim()) return;

    setWeatherStatus({ exists: false, validating: true });
    const result = await secureStorage.validateWeatherKey(weatherKey);

    if (result.valid) {
      await secureStorage.saveApiKey('VITE_WEATHERAPI_KEY', weatherKey);
      setWeatherStatus({ exists: true, valid: true });
    } else {
      setWeatherStatus({ exists: false, valid: false, error: result.error });
    }
  };

  const validateAndSaveSearchKeys = async () => {
    if (!googleSearchKey.trim() || !googleSearchEngineId.trim()) return;

    setSearchStatus({ exists: false, validating: true });
    const result = await secureStorage.validateGoogleSearchKey(googleSearchKey, googleSearchEngineId);

    if (result.valid) {
      await secureStorage.saveApiKey('VITE_GOOGLE_SEARCH_API_KEY', googleSearchKey);
      await secureStorage.saveApiKey('VITE_GOOGLE_SEARCH_ENGINE_ID', googleSearchEngineId);
      setSearchStatus({ exists: true, valid: true });
    } else {
      setSearchStatus({ exists: false, valid: false, error: result.error });
    }
  };

  const deleteGeminiKey = async () => {
    await secureStorage.deleteApiKey('VITE_GEMINI_API_KEY');
    setGeminiKey('');
    setGeminiStatus({ exists: false });
  };

  const deleteWeatherKey = async () => {
    await secureStorage.deleteApiKey('VITE_WEATHERAPI_KEY');
    setWeatherKey('');
    setWeatherStatus({ exists: false });
  };

  const deleteSearchKeys = async () => {
    await secureStorage.deleteApiKey('VITE_GOOGLE_SEARCH_API_KEY');
    await secureStorage.deleteApiKey('VITE_GOOGLE_SEARCH_ENGINE_ID');
    setGoogleSearchKey('');
    setGoogleSearchEngineId('');
    setSearchStatus({ exists: false });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-purple-400/30 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Lock className="w-6 h-6" />
            <h2 className="text-xl font-bold">🔐 Secure API Keys</h2>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-400/30 px-6 py-3">
          <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>All keys are encrypted and stored securely in your browser. They never leave your device.</span>
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Gemini API Key */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <Key className="w-5 h-5 text-purple-600" />
                  Gemini API Key
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Required for AI chat. Get it from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">Google AI Studio</a>
                </p>
              </div>
              {geminiStatus.valid && (
                <span className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                  <Check className="w-4 h-4" />
                  Valid
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  value={geminiKey}
                  onChange={(e) => {
                    setGeminiKey(e.target.value);
                    setGeminiStatus({ exists: false });
                  }}
                  placeholder="AIza..."
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-purple-500 focus:outline-none"
                />
                <button
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {showGeminiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              <button
                onClick={validateAndSaveGeminiKey}
                disabled={geminiStatus.validating || !geminiKey.trim()}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                {geminiStatus.validating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Save
                  </>
                )}
              </button>

              {geminiStatus.exists && (
                <button
                  onClick={deleteGeminiKey}
                  className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                  title="Delete key"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {geminiStatus.error && (
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <X className="w-4 h-4" />
                {geminiStatus.error}
              </p>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Weather API Key */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <Key className="w-5 h-5 text-blue-600" />
                  Weather API Key
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Optional. Get it from <a href="https://www.weatherapi.com/signup.aspx" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">WeatherAPI.com</a>
                </p>
              </div>
              {weatherStatus.valid && (
                <span className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                  <Check className="w-4 h-4" />
                  Valid
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showWeatherKey ? 'text' : 'password'}
                  value={weatherKey}
                  onChange={(e) => {
                    setWeatherKey(e.target.value);
                    setWeatherStatus({ exists: false });
                  }}
                  placeholder="Enter Weather API key..."
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={() => setShowWeatherKey(!showWeatherKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {showWeatherKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              <button
                onClick={validateAndSaveWeatherKey}
                disabled={weatherStatus.validating || !weatherKey.trim()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                {weatherStatus.validating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Save
                  </>
                )}
              </button>

              {weatherStatus.exists && (
                <button
                  onClick={deleteWeatherKey}
                  className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                  title="Delete key"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {weatherStatus.error && (
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <X className="w-4 h-4" />
                {weatherStatus.error}
              </p>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Google Search API */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <Key className="w-5 h-5 text-green-600" />
                  Google Search API
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Optional. Get API key from <a href="https://console.developers.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">Google Console</a>
                </p>
              </div>
              {searchStatus.valid && (
                <span className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                  <Check className="w-4 h-4" />
                  Valid
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showSearchKey ? 'text' : 'password'}
                  value={googleSearchKey}
                  onChange={(e) => {
                    setGoogleSearchKey(e.target.value);
                    setSearchStatus({ exists: false });
                  }}
                  placeholder="Google API Key..."
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-green-500 focus:outline-none"
                />
                <button
                  onClick={() => setShowSearchKey(!showSearchKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {showSearchKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <input
                type="text"
                value={googleSearchEngineId}
                onChange={(e) => {
                  setGoogleSearchEngineId(e.target.value);
                  setSearchStatus({ exists: false });
                }}
                placeholder="Search Engine ID..."
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-green-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={validateAndSaveSearchKeys}
                disabled={searchStatus.validating || !googleSearchKey.trim() || !googleSearchEngineId.trim()}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {searchStatus.validating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Save Both
                  </>
                )}
              </button>

              {searchStatus.exists && (
                <button
                  onClick={deleteSearchKeys}
                  className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                  title="Delete keys"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {searchStatus.error && (
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <X className="w-4 h-4" />
                {searchStatus.error}
              </p>
            )}
          </div>

          {/* Security Info */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Security Notes
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Keys are encrypted using AES-256-GCM encryption</li>
              <li>• Stored locally in your browser only</li>
              <li>• Never sent to any server except official APIs</li>
              <li>• Automatically validated before saving</li>
              <li>• You can delete keys anytime</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
