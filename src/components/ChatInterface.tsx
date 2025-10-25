import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Search } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { useTTS } from '../contexts/TTSContext';
import MessageBubble from './MessageBubble';
import { sendGeminiMessage } from '../services/geminiService';
import { sendOllamaMessage } from '../services/ollamaService';
import CommandAutocomplete from './CommandAutocomplete';
import { CommandParser } from '../services/commandParser';
import { CommandExecutor } from '../services/commandExecutor';
import { useIntentDetection } from '../hooks/useIntentDetection';
import IntentSuggestion from './IntentSuggestion';
import { PinnedMessages } from './PinnedMessages';
import { EditPreview } from './EditPreview';
import { Toast } from './Toast';
import { ChatInterfaceSkeleton } from './LoadingSkeleton';
import { enhancedErrorService } from '../services/enhancedErrorService';

const ChatInterface: React.FC = () => {
  const {
    messages,
    addMessage,
    clearMessages,
    currentMode,
    isLoading,
    setLoading,
    selectedModel,
    onlineTemperature,
    offlineTemperature,
    webSearchEnabled,
    setWebSearchEnabled,
    updateMessage,
    editMessage,
    pinMessage,
    deleteMessage,
    addReaction,
  } = useChat();
  const { speak, autoSpeakEnabled } = useTTS();
  const [input, setInput] = useState('');
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Command system state
  const [showCommandAutocomplete, setShowCommandAutocomplete] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Edit preview state
  const [showEditPreview, setShowEditPreview] = useState(false);
  const [editPreviewData, setEditPreviewData] = useState<{
    oldResponse: string;
    newResponse: string;
    isGenerating: boolean;
    editedMessageId: string;
    oldResponseId: string;
  } | null>(null);

  // Toast state
  const [toast, setToast] = useState<{
    message: string;
    type: 'info' | 'success' | 'error';
    onUndo?: () => void;
  } | null>(null);

  // Undo state
  const [undoStack, setUndoStack] = useState<Array<{
    messageId: string;
    oldContent: string;
    oldResponseId: string;
    oldResponseContent: string;
  }>>([]);

  // Intent detection system (Task 3.2)
  const conversationHistory = messages.slice(-5).map(m => m.content);
  const intentDetection = useIntentDetection({
    enabled: true,
    conversationHistory,
  });

  // Command autocomplete detection
  useEffect(() => {
    const trimmedInput = input.trim();
    
    // Show autocomplete if input starts with /
    if (trimmedInput.startsWith('/') && !trimmedInput.includes('\n')) {
      setShowCommandAutocomplete(true);
    } else {
      setShowCommandAutocomplete(false);
    }
  }, [input]);

  // Keyboard shortcuts
  useEffect(() => {
    // @ts-expect-error - Reserved for future keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle keyboard shortcuts here if needed
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const updateStreamingMessage = (content: string) => {
    setStreamingMessage(content);
    scrollToBottom();
  };

  const finalizeStreamingMessage = () => {
    setStreamingMessage(null);
  };

  const cancelCurrentRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
      finalizeStreamingMessage();
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (messageText?: string) => {
    const messageToSend = messageText || input.trim();
    if (!messageToSend || isLoading) return;

    console.log('📨 Sending message, webSearchEnabled:', webSearchEnabled, 'mode:', currentMode);

    // Cancel any ongoing request
    cancelCurrentRequest();

    const userMessage = messageToSend;
    setInput('');
    setShowCommandAutocomplete(false); // Hide autocomplete

    // SLASH COMMAND SYSTEM: Check if message is a slash command
    if (userMessage.trim().startsWith('/')) {
      console.log('🎯 Processing slash command:', userMessage);
      
      try {
        const parsed = CommandParser.parse(userMessage);
        console.log('✅ Parsed command:', parsed);

        if (!parsed.isValid) {
          // Show error message for invalid command
          addMessage({ 
            content: `❌ Invalid command: ${parsed.errors?.join(', ') || 'Unknown error'}`, 
            role: 'assistant', 
            mode: currentMode 
          });
          return;
        }

        // Execute command - for /help and /clear, this handles everything
        // For other commands, it returns a natural language query to send to AI
        const result = await CommandExecutor.execute(parsed, addMessage, updateMessage, {
          clearMessages,
        });
        
        // If command was handled directly (help, clear), stop here
        if (result.success && (parsed.command === 'help' || parsed.command === 'clear')) {
          return;
        }
        
        // For other commands, use the returned natural language string
        const naturalLanguage = (result as any).naturalLanguage;
        if (!naturalLanguage) {
          addMessage({ 
            content: `❌ Failed to convert command to natural language`, 
            role: 'assistant', 
            mode: currentMode 
          });
          return;
        }
        
        console.log('✅ Command converted to natural language:', naturalLanguage);
        
        // Add the natural language as user message
        addMessage({ 
          content: naturalLanguage, 
          role: 'user', 
          mode: currentMode 
        });
        
        // Continue to AI processing with the converted message
        setLoading(true);
        abortControllerRef.current = new AbortController();
        
        try {
          if (currentMode === 'online') {
            const wrappedAddMessage = (message: { content: string; role: 'assistant'; mode: 'online' }) => {
              finalizeStreamingMessage();
              addMessage(message);
              // Speak the AI response
              if (autoSpeakEnabled) {
                speak(message.content).catch(err => console.error('TTS error:', err));
              }
            };
            await sendGeminiMessage(naturalLanguage, wrappedAddMessage, updateStreamingMessage, onlineTemperature, webSearchEnabled, abortControllerRef.current?.signal);
          } else {
            const wrappedOfflineAddMessage = (message: { content: string; role: 'assistant'; mode: 'offline' }) => {
              addMessage(message);
              // Speak the AI response
              if (autoSpeakEnabled) {
                speak(message.content).catch(err => console.error('TTS error:', err));
              }
            };
            await sendOllamaMessage(naturalLanguage, wrappedOfflineAddMessage, selectedModel, offlineTemperature);
          }
        } catch (error) {
          console.error('Error processing command via AI:', error);

          // Create enhanced error for better error handling
          const enhancedError = enhancedErrorService.createError(
            'API_RATE_LIMIT',
            error instanceof Error ? error.message : 'Unknown error occurred',
            {
              component: 'ChatInterface',
              action: 'processCommand',
              metadata: { command: parsed.command }
            },
            error instanceof Error ? error : undefined
          );

          const errorMessage = {
            content: `❌ ${enhancedError.title}: ${enhancedError.message}`,
            role: 'assistant' as const,
            mode: currentMode,
          };
          addMessage(errorMessage);
        } finally {
          setLoading(false);
          abortControllerRef.current = null;
        }
        return;
      } catch (error) {
        console.error('❌ Command execution error:', error);

        // Create enhanced error for command execution failures
        const enhancedError = enhancedErrorService.createError(
          'VALIDATION_INPUT_TOO_LONG',
          error instanceof Error ? error.message : 'Command execution failed',
          {
            component: 'ChatInterface',
            action: 'executeCommand',
            metadata: { command: userMessage }
          },
          error instanceof Error ? error : undefined
        );

        addMessage({
          content: `❌ ${enhancedError.title}: ${enhancedError.message}`,
          role: 'assistant',
          mode: currentMode
        });
        return;
      }
    } else {
      // NATURAL LANGUAGE INTENT DETECTION (Task 3.2)
      // Detect if user's natural language can be converted to a command
      const detectedIntent = intentDetection.detectIntent(userMessage);
      console.log('🧠 Intent detection result:', detectedIntent);

      // High confidence: Auto-execute as command
      if (intentDetection.shouldAutoExecuteIntent && intentDetection.commandToExecute) {
        console.log('✨ Auto-executing detected command:', intentDetection.commandToExecute);
        
        // Execute the detected command automatically
        handleSendMessage(intentDetection.commandToExecute);
        intentDetection.clearIntent();
        return;
      }
      
      // Medium confidence: Show suggestion (will be rendered in UI below)
      // The suggestion stays active until user accepts/dismisses it
      
      // Regular message - add it to chat
      addMessage({ content: userMessage, role: 'user', mode: currentMode });
    }

    setLoading(true);

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    // IMAGE GENERATION: /imagine command (LEGACY - kept for backwards compatibility)
    if (userMessage.toLowerCase().startsWith('/imagine ')) {
      const imagePrompt = userMessage.substring(9).trim(); // Remove "/imagine "
      console.log('🎨 IMAGE GENERATION COMMAND:', imagePrompt);
      
      // Import and use image generation
      const { generateImageInChat } = await import('../utils/chatImageGeneration');
      await generateImageInChat(imagePrompt, addMessage, setLoading, currentMode);
      return;
    }

    // DIRECT TOOL TEST: Bypass AI for testing
    if (userMessage.toLowerCase().startsWith('direct_tool ')) {
      const toolCommand = userMessage.substring(12).trim(); // Remove "direct_tool "
      console.log('🧪 DIRECT TOOL TEST:', toolCommand);
      setLoading(true);

      try {
        let result = '';
        if (toolCommand === 'date') {
          const { getDateInfo } = await import('../services/timeDateService');
          result = getDateInfo();
        } else if (toolCommand === 'time') {
          const { getCurrentTime } = await import('../services/timeDateService');
          result = getCurrentTime();
        } else if (toolCommand.startsWith('weather ')) {
          const { getCurrentWeather } = await import('../services/weatherService');
          const location = toolCommand.substring(8);
          result = await getCurrentWeather(location);
        } else if (toolCommand.startsWith('search ')) {
          const { performWebSearch } = await import('../services/webSearchService');
          const query = toolCommand.substring(7);
          result = await performWebSearch(query);
        } else if (toolCommand.startsWith('create_task ')) {
          const { createTask } = await import('../services/taskService');
          const title = toolCommand.substring(12);
          result = createTask(title);
        } else if (toolCommand === 'list_tasks') {
          const { listTasks } = await import('../services/taskService');
          result = listTasks();
        } else if (toolCommand.startsWith('delete_task ')) {
          const { deleteTask } = await import('../services/taskService');
          const taskId = toolCommand.substring(12);
          result = deleteTask(taskId);
        } else if (toolCommand.startsWith('toggle_task ')) {
          const { toggleTaskStatus } = await import('../services/taskService');
          const taskId = toolCommand.substring(12);
          result = toggleTaskStatus(taskId);
        }

        addMessage({
          content: `**Direct Tool Result:**\n${result}`,
          role: 'assistant',
          mode: currentMode,
        });
        setLoading(false);
        return;
      } catch (error) {
        addMessage({
          content: `❌ Direct tool failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          role: 'assistant',
          mode: currentMode,
        });
        setLoading(false);
        return;
      }
    }

    try {
      if (currentMode === 'online') {
        const wrappedAddMessage = (message: { content: string; role: 'assistant'; mode: 'online' }) => {
          finalizeStreamingMessage();
          addMessage(message);
          // Speak the AI response
          if (autoSpeakEnabled) {
            speak(message.content).catch(err => console.error('TTS error:', err));
          }
        };
        await sendGeminiMessage(userMessage, wrappedAddMessage, updateStreamingMessage, onlineTemperature, webSearchEnabled, abortControllerRef.current?.signal);
      } else {
        const wrappedOfflineAddMessage = (message: { content: string; role: 'assistant'; mode: 'offline' }) => {
          addMessage(message);
          // Speak the AI response
          if (autoSpeakEnabled) {
            speak(message.content).catch(err => console.error('TTS error:', err));
          }
        };
        await sendOllamaMessage(userMessage, wrappedOfflineAddMessage, selectedModel, offlineTemperature);
      }
    } catch (error) {
      console.error('Error sending message:', error);

      // Create enhanced error for message sending failures
      const errorCode = !navigator.onLine ? 'NETWORK_OFFLINE' : 'API_RATE_LIMIT';
      const enhancedError = enhancedErrorService.createError(
        errorCode,
        error instanceof Error ? error.message : 'Failed to send message',
        {
          component: 'ChatInterface',
          action: 'sendMessage',
          metadata: {
            mode: currentMode,
            messageLength: userMessage.length,
            hasNetwork: navigator.onLine
          }
        },
        error instanceof Error ? error : undefined
      );

      const errorMessage = {
        content: `❌ ${enhancedError.title}: ${enhancedError.message}`,
        role: 'assistant' as const,
        mode: currentMode,
      };
      addMessage(errorMessage);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendClick = () => {
    handleSendMessage();
  };

  const handleEditMessage = async (id: string, newContent: string) => {
    // Find the edited message and any AI responses that came after it
    const messageIndex = messages.findIndex(m => m.id === id);
    if (messageIndex === -1) return;

    const oldMessage = messages[messageIndex];
    let oldResponseId = '';
    let oldResponseContent = '';

    // Find and store the AI's old response
    if (messageIndex + 1 < messages.length && messages[messageIndex + 1].role === 'assistant') {
      oldResponseId = messages[messageIndex + 1].id;
      oldResponseContent = messages[messageIndex + 1].content;
    }

    // Update the message content with edit (preserving context)
    editMessage(id, newContent);

    // Save to undo stack
    setUndoStack(prev => [...prev, {
      messageId: id,
      oldContent: oldMessage.content,
      oldResponseId,
      oldResponseContent,
    }]);

    // Show preview modal with old response
    setEditPreviewData({
      oldResponse: oldResponseContent || 'No previous response',
      newResponse: '',
      isGenerating: true,
      editedMessageId: id,
      oldResponseId,
    });
    setShowEditPreview(true);

    // Delete the AI's old response
    if (oldResponseId) {
      deleteMessage(oldResponseId);
    }

    // Generate new response
    try {
      setLoading(true);
      abortControllerRef.current = new AbortController();
      
      const wrappedUpdateStreaming = (content: string) => {
        setEditPreviewData(prev => prev ? { ...prev, newResponse: content } : null);
      };

      if (currentMode === 'online') {
        const wrappedAddMessage = (message: { content: string; role: 'assistant'; mode: 'online' }) => {
          setEditPreviewData(prev => prev ? { ...prev, newResponse: message.content, isGenerating: false } : null);
          // Speak the regenerated AI response
          if (autoSpeakEnabled) {
            speak(message.content).catch(err => console.error('TTS error:', err));
          }
        };
        await sendGeminiMessage(newContent, wrappedAddMessage, wrappedUpdateStreaming, onlineTemperature, webSearchEnabled, abortControllerRef.current?.signal);
      } else {
        const wrappedOfflineAddMessage = (message: { content: string; role: 'assistant'; mode: 'offline' }) => {
          setEditPreviewData(prev => prev ? { ...prev, newResponse: message.content, isGenerating: false } : null);
          // Speak the regenerated AI response
          if (autoSpeakEnabled) {
            speak(message.content).catch(err => console.error('TTS error:', err));
          }
        };
        await sendOllamaMessage(newContent, wrappedOfflineAddMessage, selectedModel, offlineTemperature);
      }
    } catch (error) {
      console.error('Error generating new response:', error);
      setEditPreviewData(prev => prev ? { ...prev, newResponse: `Error: ${error instanceof Error ? error.message : 'Failed to generate response'}`, isGenerating: false } : null);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleConfirmEdit = () => {
    if (!editPreviewData) return;

    // Add the new AI response to the chat
    if (editPreviewData.newResponse && !editPreviewData.isGenerating) {
      addMessage({
        content: editPreviewData.newResponse,
        role: 'assistant',
        mode: currentMode,
      });

      // Voice functionality removed
    }

    // Close preview
    setShowEditPreview(false);

    // Show success toast with undo
    setToast({
      message: 'AI updated - 1 new result',
      type: 'success',
      onUndo: handleUndoEdit,
    });

    setEditPreviewData(null);
  };

  const handleCancelEdit = () => {
    if (!editPreviewData) return;

    // Restore old message and response
    const lastUndo = undoStack[undoStack.length - 1];
    if (lastUndo) {
      editMessage(lastUndo.messageId, lastUndo.oldContent);
      if (lastUndo.oldResponseId && lastUndo.oldResponseContent) {
        addMessage({
          content: lastUndo.oldResponseContent,
          role: 'assistant',
          mode: currentMode,
        });
      }
      setUndoStack(prev => prev.slice(0, -1));
    }

    setShowEditPreview(false);
    setEditPreviewData(null);
  };

  const handleUndoEdit = () => {
    const lastUndo = undoStack[undoStack.length - 1];
    if (!lastUndo) return;

    // Restore old content
    editMessage(lastUndo.messageId, lastUndo.oldContent);

    // Delete new AI response and restore old one
    const currentMessages = messages;
    const editedIndex = currentMessages.findIndex(m => m.id === lastUndo.messageId);
    if (editedIndex !== -1 && editedIndex + 1 < currentMessages.length) {
      deleteMessage(currentMessages[editedIndex + 1].id);
    }

    if (lastUndo.oldResponseId && lastUndo.oldResponseContent) {
      addMessage({
        content: lastUndo.oldResponseContent,
        role: 'assistant',
        mode: currentMode,
      });
    }

    setUndoStack(prev => prev.slice(0, -1));
    setToast({
      message: 'Edit undone',
      type: 'info',
    });
  };

  // Show skeleton while initially loading
  if (isLoading && messages.length === 0) {
    return <ChatInterfaceSkeleton />;
  }

  return (
    <div className="max-w-4xl mx-auto chat-container">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700 card-hover state-transition">
        {/* Header Section with Mode Toggle */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
          <div className="flex items-center justify-between">
            {/* Left side - Mode info */}
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Mode: <span className="font-medium text-purple-600 dark:text-purple-400">{currentMode}</span>
              </div>
              {currentMode === 'online' && (
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  webSearchEnabled
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}>
                  {webSearchEnabled ? '🔍 Tools Enabled' : '🔍 Tools Disabled'}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Pinned Messages Section */}
        <PinnedMessages
          messages={messages}
          onUnpin={(id) => pinMessage(id)}
          onMessageClick={(id) => {
            const element = document.getElementById(`message-${id}`);
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        />

        {/* Messages Area */}
        <div className="h-96 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {messages.length === 0 && !streamingMessage ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <p className="text-lg mb-2">Welcome to A.N.S.H.I.K.A.!</p>
                <p className="text-sm">
                  Switch between online (Gemini) and offline (Ollama) modes above.
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div key={message.id} id={`message-${message.id}`}>
                  <MessageBubble
                    message={message}
                    onEdit={handleEditMessage}
                    onPin={pinMessage}
                    onDelete={deleteMessage}
                    onReact={addReaction}
                  />
                </div>
              ))}
              {streamingMessage && (
                <div className="flex justify-start message-bubble">
                  <div className="chat-message assistant max-w-[75%]">
                    <div className="whitespace-pre-wrap break-words leading-relaxed">
                      {streamingMessage}
                      <span className="animate-pulse text-gray-400">▊</span>
                    </div>
                    <div className="text-xs mt-3 opacity-60 text-gray-500">
                      AI is typing... • {currentMode}
                    </div>
                  </div>
                </div>
              )}
              {isLoading && !streamingMessage && currentMode === 'offline' && (
                <div className="flex justify-start message-bubble">
                  <div className="chat-message assistant max-w-[75%]">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-500">AI is thinking...</span>
                    </div>
                    <div className="text-xs mt-3 opacity-60 text-gray-500">
                      Processing with {selectedModel} • {currentMode}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
          {/* Intent Suggestion (Task 3.2) */}
          {intentDetection.shouldShowSuggestionUI && intentDetection.currentIntent && (
            <IntentSuggestion
              intent={intentDetection.currentIntent}
              onAccept={() => {
                const command = intentDetection.commandToExecute;
                if (command) {
                  setInput(command);
                  intentDetection.clearIntent();
                  // Auto-send the command
                  setTimeout(() => handleSendMessage(command), 100);
                }
              }}
              onDismiss={() => {
                intentDetection.clearIntent();
              }}
            />
          )}
          
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              {/* Command Autocomplete */}
              <CommandAutocomplete
                inputValue={input}
                isVisible={showCommandAutocomplete}
                onSelectCommand={(commandText) => {
                  setInput(commandText + ' ');
                  setShowCommandAutocomplete(false);
                  inputRef.current?.focus();
                }}
                onClose={() => setShowCommandAutocomplete(false)}
              />
              
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Type your message... (using ${currentMode} mode) • Type / for commands`}
                className="w-full resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 state-transition shadow-sm hover:shadow-md focus-ring interactive-element input-mobile tap-highlight"
                rows={1}
                disabled={isLoading}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>

            <div className="flex gap-2">
              {currentMode === 'online' && (
                <button
                  onClick={() => {
                    const newState = !webSearchEnabled;
                    console.log('🔘 Toggle clicked, changing from', webSearchEnabled, 'to', newState);
                    setWebSearchEnabled(newState);
                    // Force re-render check
                    setTimeout(() => console.log('🔄 State after toggle:', newState), 0);
                  }}
                  className={`btn-press ripple interactive-element focus-ring touch-target touch-target-mobile flex items-center justify-center w-11 h-11 rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 tap-highlight no-select ${
                    webSearchEnabled
                      ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white focus:ring-green-500 border-2 border-green-400'
                      : 'bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white focus:ring-gray-400 border-2 border-gray-300'
                  }`}
                  title={webSearchEnabled ? '🔍 Tools Enabled - Click to disable' : '🔍 Tools Disabled - Click to enable'}
                >
                  <Search className="w-4 h-4" />
                </button>
              )}

              {/* Voice functionality removed */}

              <button
                onClick={handleSendClick}
                disabled={!input.trim() || isLoading}
                className="btn-press ripple interactive-element focus-ring touch-target touch-target-mobile flex items-center justify-center w-11 h-11 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:hover:scale-100 tap-highlight no-select"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>

              {isLoading && (
                <button
                  onClick={cancelCurrentRequest}
                  className="btn-press ripple interactive-element focus-ring touch-target touch-target-mobile flex items-center justify-center w-11 h-11 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 tap-highlight no-select"
                  title="Cancel current request"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {messages.length > 0 && (
                <button
                  onClick={clearMessages}
                  className="btn-press ripple interactive-element focus-ring touch-target touch-target-mobile flex items-center justify-center w-11 h-11 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 tap-highlight no-select"
                  title="Clear chat history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Preview Modal */}
      {showEditPreview && editPreviewData && (
        <EditPreview
          oldResponse={editPreviewData.oldResponse}
          newResponse={editPreviewData.newResponse}
          isGenerating={editPreviewData.isGenerating}
          onConfirm={handleConfirmEdit}
          onCancel={handleCancelEdit}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onUndo={toast.onUndo}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default ChatInterface;
