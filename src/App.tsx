import { useEffect, useState, Suspense, lazy } from 'react';
import { MessageSquare, Wifi, WifiOff, Type, Volume2, Key } from 'lucide-react';
import { useToast } from './contexts/ToastContext';
import ModeToggle from './components/ModeToggle';
import ModelSelector from './components/ModelSelector';
import TemperatureControl from './components/TemperatureControl';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import LeftSidebar, { TabState } from './components/LeftSidebar';
import { EnhancedStatusIndicator } from './components/EnhancedStatusIndicator';
import { ChatProvider, useChat } from './contexts/ChatContext';
import { ToastProvider } from './contexts/ToastContext';
import { TTSProvider, useTTS } from './contexts/TTSContext';
import { SpeechRecognitionProvider } from './contexts/SpeechRecognitionContext';
import { VoiceSettingsPanel } from './components/VoiceSettingsPanel';
import { ApiKeysPanel } from './components/ApiKeysPanel';
import { BreadcrumbNavigation, useBreadcrumbNavigation } from './components/BreadcrumbNavigation';
import { ContextualHelpTooltip } from './components/ContextualHelpTooltip';
import { preloadCommonModels } from './services/ollamaService';
import { setupFocusVisible, matchesShortcut } from './utils/accessibilityUtils';
import TypographySettings from './components/TypographySettings';
import PullToRefresh from './components/PullToRefresh';
import SwipeNavigation from './components/SwipeNavigation';

// Lazy-loaded components for code splitting
const ChatInterface = lazy(() => import('./components/ChatInterface'));
const DocumentWorkspace = lazy(() => import('./components/DocumentWorkspace'));
const ImageGenerationPanel = lazy(() => import('./components/ImageGeneration/ImageGenerationPanel').then(module => ({ default: module.ImageGenerationPanel })));

// Cosmic-themed loading components for code splitting
const ChatInterfaceSkeleton = () => (
  <div className="cosmic-skeleton space-y-4 p-4">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-full animate-pulse" />
      <div className="h-4 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded w-32 animate-pulse" />
    </div>
    <div className="space-y-3">
      <div className="h-12 bg-gradient-to-r from-gray-700/50 to-gray-600/50 rounded-lg animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 bg-gradient-to-r from-gray-700/30 to-gray-600/30 rounded animate-pulse" />
        <div className="h-4 bg-gradient-to-r from-gray-700/40 to-gray-600/40 rounded w-3/4 animate-pulse" />
      </div>
    </div>
    <div className="flex gap-2 mt-4">
      <div className="h-8 bg-gradient-to-r from-purple-500/20 to-pink-600/20 rounded w-20 animate-pulse" />
      <div className="h-8 bg-gradient-to-r from-blue-500/20 to-cyan-600/20 rounded w-16 animate-pulse" />
    </div>
  </div>
);

const DocumentWorkspaceSkeleton = () => (
  <div className="cosmic-skeleton space-y-6 p-6">
    <div className="flex items-center justify-between mb-6">
      <div className="h-6 bg-gradient-to-r from-green-500/20 to-emerald-600/20 rounded w-48 animate-pulse" />
      <div className="h-8 bg-gradient-to-r from-purple-500/20 to-pink-600/20 rounded w-24 animate-pulse" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="h-4 bg-gradient-to-r from-gray-700/30 to-gray-600/30 rounded w-full animate-pulse" />
        <div className="h-32 bg-gradient-to-r from-gray-700/20 to-gray-600/20 rounded-lg animate-pulse" />
      </div>
      <div className="space-y-4">
        <div className="h-4 bg-gradient-to-r from-gray-700/30 to-gray-600/30 rounded w-3/4 animate-pulse" />
        <div className="h-24 bg-gradient-to-r from-gray-700/20 to-gray-600/20 rounded-lg animate-pulse" />
      </div>
    </div>
  </div>
);

const ImageGenerationSkeleton = () => (
  <div className="cosmic-skeleton space-y-6 p-6">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 bg-gradient-to-r from-pink-500/20 to-purple-600/20 rounded-full animate-pulse" />
      <div className="h-6 bg-gradient-to-r from-pink-500/20 to-purple-600/20 rounded w-40 animate-pulse" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="h-10 bg-gradient-to-r from-gray-700/30 to-gray-600/30 rounded-lg animate-pulse" />
        <div className="h-32 bg-gradient-to-r from-gray-700/20 to-gray-600/20 rounded-lg animate-pulse" />
        <div className="h-12 bg-gradient-to-r from-purple-500/20 to-pink-600/20 rounded-lg animate-pulse" />
      </div>
      <div className="space-y-4">
        <div className="h-48 bg-gradient-to-r from-gray-700/20 to-gray-600/20 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-8 bg-gradient-to-r from-blue-500/20 to-cyan-600/20 rounded animate-pulse" />
          <div className="h-8 bg-gradient-to-r from-green-500/20 to-emerald-600/20 rounded animate-pulse" />
        </div>
      </div>
    </div>
  </div>
);

function AppContent() {
  const { currentMode, setMode, isLoading, selectedModel } = useChat();
  const { autoSpeakEnabled, ttsState } = useTTS();
  const [activeTab, setActiveTab] = useState<TabState>({ mainTab: 'chat', subTab: null });
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showTypographySettings, setShowTypographySettings] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState(false);
  const { breadcrumbs } = useBreadcrumbNavigation();
  const { showToast } = useToast();

  // Setup focus-visible for keyboard navigation
  useEffect(() => {
    setupFocusVisible();
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show keyboard shortcuts (Ctrl/Cmd + /)
      if (matchesShortcut(e, { key: '/', ctrl: true })) {
        e.preventDefault();
        setShowShortcuts(true);
      }

      // Show keyboard shortcuts (? key alone)
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        const target = e.target as HTMLElement;
        // Don't trigger if typing in an input
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setShowShortcuts(true);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Error toast integration
  useEffect(() => {
    const handleErrorToast = (event: CustomEvent) => {
      const { error, title, type } = event.detail;
      showToast(title || error?.message || 'An error occurred', type || 'error');
    };

    window.addEventListener('show-error-toast', handleErrorToast as EventListener);
    return () => window.removeEventListener('show-error-toast', handleErrorToast as EventListener);
  }, [showToast]);

  // Pre-load models on app startup
  useEffect(() => {
    const initializeModels = async () => {
      try {
        await preloadCommonModels();
      } catch (error) {
        console.warn('Model pre-loading failed:', error);
      }
    };

    // Delay pre-loading to not block initial render
    const timer = setTimeout(initializeModels, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen cosmic-bg relative overflow-hidden">
      {/* Nebula overlay for cosmic atmosphere */}
      <div className="nebula-overlay"></div>

      {/* Screen Reader Live Regions */}
      <div
        id="aria-live-polite"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <div
        id="aria-live-assertive"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {/* Typography Settings Modal */}
      <TypographySettings
        isOpen={showTypographySettings}
        onClose={() => setShowTypographySettings(false)}
      />

      {/* Left Sidebar */}
      <LeftSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="z-50"
      />

      <div className="lg:ml-72 md:ml-64 sm:ml-56 xs:ml-52 min-h-screen">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 lg:py-8">
      {/* Breadcrumb Navigation */}
      <div className="mb-4 lg:mb-6">
        <BreadcrumbNavigation
          items={breadcrumbs}
          onNavigate={(item) => {
            // Handle breadcrumb navigation
            console.log('Navigate to:', item);
          }}
          className="mb-4"
        />
      </div>

      {/* Header */}
      <div className="text-center mb-6 lg:mb-8">
          <div className="flex items-center justify-center gap-2 lg:gap-3 mb-3 lg:mb-4">
            <div className="p-2 lg:p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl lg:rounded-2xl shadow-lg">
              <MessageSquare className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                A.N.S.H.I.K.A.
              </h1>
              <p className="text-xs lg:text-sm text-gray-300 dark:text-gray-300 mt-1">
                Powered by Gemini & Ollama
              </p>
            </div>
          </div>
          <p className="text-sm lg:text-base text-gray-600 dark:text-gray-300 max-w-2xl mx-auto px-4">
            Switch between online (Gemini) and offline (Ollama) modes for seamless AI conversations
          </p>

          {/* Typography Settings Button */}
          <div className="flex items-center justify-center mt-4">
            <button
              onClick={() => setShowTypographySettings(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 touch-target"
              title="Typography Settings"
            >
              <Type className="w-3 h-3" />
              Typography
            </button>
          </div>

        </div>

        {/* Mode Controls */}
         <div className="max-w-5xl mx-auto mb-6 lg:mb-8">
           <div className="bg-purple-900/10 dark:bg-purple-900/20 backdrop-blur-2xl rounded-2xl lg:rounded-3xl shadow-2xl border border-purple-400/20 dark:border-purple-300/30 p-6 lg:p-8 card-hover state-transition">
             <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
               <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
                 <div className="flex items-center gap-4">
                   <span className="text-base lg:text-lg font-semibold text-gray-100 dark:text-gray-100">
                     Mode:
                   </span>
                   <div className="flex items-center gap-3 bg-purple-900/20 dark:bg-purple-800/30 backdrop-blur-md px-4 py-2 rounded-full border border-purple-400/30 shadow-lg">
                     {currentMode === 'online' ? (
                       <Wifi className="w-5 h-5 text-green-400" />
                     ) : (
                       <WifiOff className="w-5 h-5 text-orange-400" />
                     )}
                     <span className="text-base lg:text-lg font-semibold capitalize text-purple-100 dark:text-purple-100">
                       {currentMode}
                     </span>
                     <ContextualHelpTooltip
                       title="AI Mode Selection"
                       content="Switch between online (Gemini) and offline (Ollama) modes. Online mode requires internet, offline works locally."
                       variant="cosmic"
                       size="sm"
                     />
                   </div>
                 </div>
                 <div className="flex items-center gap-4">
                   <ModeToggle
                     mode={currentMode}
                     onModeChange={setMode}
                   />
                   
                   {/* API Keys Button */}
                   <button
                     onClick={() => setShowApiKeys(true)}
                     className="relative p-3 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 border border-green-400/30 transition-all duration-300 group"
                     title="API Keys Settings"
                   >
                     <Key className="w-5 h-5 text-green-300" />
                   </button>
                   
                   {/* Voice Settings Button (Combined TTS + STT) */}
                   <button
                     onClick={() => setShowVoiceSettings(true)}
                     className="relative p-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-400/30 transition-all duration-300 group"
                     title="Voice Settings (Text-to-Speech & Speech-to-Text)"
                   >
                     <Volume2 className={`w-5 h-5 transition-colors ${ttsState.isSpeaking ? 'text-purple-400 animate-pulse' : 'text-purple-300'}`} />
                     {ttsState.isSpeaking && (
                       <span className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full animate-ping" />
                     )}
                     {autoSpeakEnabled && (
                       <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                     )}
                   </button>
                 </div>
               </div>

               {currentMode === 'offline' && (
                 <div className="xl:flex-shrink-0">
                   <ModelSelector />
                 </div>
               )}
             </div>

            <div className="border-t border-purple-400/20 dark:border-purple-300/30 pt-6 mt-6">
              <TemperatureControl />
            </div>

            {/* Enhanced Status Indicator */}
            <div className="mt-8 flex items-center justify-center">
              <EnhancedStatusIndicator
                mode={currentMode}
                isLoading={isLoading}
                modelName={selectedModel}
              />
            </div>
          </div>
        </div>

        {/* Tab Content with Mobile Gestures */}
        <SwipeNavigation
          currentTab={activeTab.mainTab}
          tabs={['chat', 'document-intelligence', 'image-generation']}
          onTabChange={(tab) => setActiveTab({ mainTab: tab as any, subTab: null })}
          enableSwipe={true}
          swipeThreshold={80}
        >
          <PullToRefresh
            onRefresh={async () => {
              // Refresh current tab content
              if (activeTab.mainTab === 'chat') {
                // Refresh chat - could reload messages or clear cache
                showToast('Chat refreshed', 'success');
              } else if (activeTab.mainTab === 'document-intelligence') {
                // Refresh document intelligence
                showToast('Documents refreshed', 'success');
              } else if (activeTab.mainTab === 'image-generation') {
                // Refresh image generation
                showToast('Gallery refreshed', 'success');
              }
            }}
            threshold={80}
          >
            <div className="transition-all duration-300 ease-in-out">
              {activeTab.mainTab === 'chat' && (
                <div className="animate-fade-in">
                  <Suspense fallback={<ChatInterfaceSkeleton />}>
                    <ChatInterface />
                  </Suspense>
                </div>
              )}

              {activeTab.mainTab === 'document-intelligence' && (
                <div className="animate-fade-in">
                  <div className="max-w-4xl mx-auto mb-4 lg:mb-6">
                    <div className="bg-gray-900/60 dark:bg-gray-900/80 backdrop-blur-md rounded-xl lg:rounded-2xl shadow-2xl border border-purple-500/20 dark:border-purple-400/30 p-4 lg:p-6 card-hover state-transition">
                      <Suspense fallback={<DocumentWorkspaceSkeleton />}>
                        {/* All document intelligence tabs use DocumentWorkspace for now */}
                        <DocumentWorkspace />
                      </Suspense>
                    </div>
                  </div>
                </div>
              )}

              {activeTab.mainTab === 'image-generation' && (
                <div className="animate-fade-in">
                  <Suspense fallback={<ImageGenerationSkeleton />}>
                    <ImageGenerationPanel 
                      initialTab={
                        activeTab.subTab === 'generate' || 
                        activeTab.subTab === 'transform' || 
                        activeTab.subTab === 'batch' || 
                        activeTab.subTab === 'gallery' || 
                        activeTab.subTab === 'history' 
                          ? activeTab.subTab 
                          : 'generate'
                      } 
                    />
                  </Suspense>
                </div>
              )}
            </div>
          </PullToRefresh>
        </SwipeNavigation>
        </div>
      </div>

      {/* API Keys Panel */}
      <ApiKeysPanel
        isOpen={showApiKeys}
        onClose={() => setShowApiKeys(false)}
      />

      {/* Voice Settings Panel (Combined TTS + STT) */}
      <VoiceSettingsPanel
        isOpen={showVoiceSettings}
        onClose={() => setShowVoiceSettings(false)}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      {/* Typography Settings */}
      <TypographySettings
        isOpen={showTypographySettings}
        onClose={() => setShowTypographySettings(false)}
      />
    </div>
  );
}

function App() {
  return (
    <ChatProvider>
      <ToastProvider>
        <TTSProvider>
          <SpeechRecognitionProvider>
            <AppContent />
          </SpeechRecognitionProvider>
        </TTSProvider>
      </ToastProvider>
    </ChatProvider>
  );
}

export default App;
