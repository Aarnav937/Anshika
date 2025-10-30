import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Message } from '../types';
import { formatDistanceToNow } from '../utils/dateUtils';
import { MessageQuickActions } from './MessageQuickActions';
import MessageEditor from './MessageEditor';

interface StreamingMessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  streamingChunkDelay?: number;
  onEdit?: (id: string, newContent: string) => void;
  onPin?: (id: string) => void;
  onDelete?: (id: string) => void;
  onReact?: (id: string, emoji: string) => void;
  onCancelStreaming?: () => void;
  onPauseStreaming?: () => void;
  onResumeStreaming?: () => void;
}

const StreamingMessageBubble: React.FC<StreamingMessageBubbleProps> = ({
  message,
  isStreaming = false,
  streamingChunkDelay = 50,
  onEdit,
  onPin,
  onDelete,
  onReact,
  onCancelStreaming,
  onPauseStreaming,
  onResumeStreaming,
}) => {
  const isUser = message.role === 'user';
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [displayedContent, setDisplayedContent] = useState(message.content);
  const [isContentStreaming, setIsContentStreaming] = useState(isStreaming);
  const contentRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const lastUpdateRef = useRef<number>(Date.now());

  // Handle content updates during streaming
  useEffect(() => {
    if (isStreaming && message.content !== displayedContent) {
      const updateContent = () => {
        const now = Date.now();
        const timeSinceLastUpdate = now - lastUpdateRef.current;

        if (timeSinceLastUpdate >= streamingChunkDelay) {
          setDisplayedContent(message.content);
          lastUpdateRef.current = now;

          // Auto-scroll to bottom if content is streaming
          if (contentRef.current) {
            contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
        } else {
          // Schedule next update
          animationFrameRef.current = requestAnimationFrame(updateContent);
        }
      };

      updateContent();
    } else {
      setDisplayedContent(message.content);
      setIsContentStreaming(isStreaming);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [message.content, isStreaming, streamingChunkDelay, displayedContent]);

  // Parse content for images and handle streaming text
  type ContentPart =
    | { type: 'text', content: string }
    | { type: 'image', content: string, alt: string };

  const parseContent = useCallback((content: string): ContentPart[] => {
    const parts: ContentPart[] = [];
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let lastIndex = 0;
    let match;

    while ((match = imageRegex.exec(content)) !== null) {
      // Add text before image
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.substring(lastIndex, match.index)
        });
      }

      // Add image
      parts.push({
        type: 'image',
        content: match[2], // URL
        alt: match[1] || 'Generated image' // Alt text
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex)
      });
    }

    return parts.length > 0 ? parts : [{ type: 'text', content }];
  }, []);

  const contentParts = parseContent(displayedContent);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(displayedContent);
  }, [displayedContent]);

  const handleSaveEdit = useCallback((newContent: string) => {
    if (onEdit) {
      onEdit(message.id, newContent);
    }
    setIsEditing(false);
  }, [onEdit, message.id]);

  // Streaming controls
  const handleCancelStreaming = useCallback(() => {
    onCancelStreaming?.();
  }, [onCancelStreaming]);

  const handlePauseStreaming = useCallback(() => {
    onPauseStreaming?.();
  }, [onPauseStreaming]);

  const handleResumeStreaming = useCallback(() => {
    onResumeStreaming?.();
  }, [onResumeStreaming]);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} message-bubble`}>
      <div
        className={`chat-message ${isUser ? 'user' : 'assistant'} max-w-[75%] group relative interactive-element state-transition ${
          isContentStreaming ? 'streaming-message' : ''
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Streaming Indicator */}
        {isContentStreaming && (
          <div className="streaming-indicator">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <span className="text-xs text-blue-400 font-medium">Streaming...</span>
            </div>
          </div>
        )}

        {/* Quick Actions - Show on hover */}
        {isHovered && !isEditing && (onEdit || onPin || onDelete || onReact || isContentStreaming) && (
          <MessageQuickActions
            role={message.role}
            isPinned={message.isPinned}
            onEdit={isUser ? () => setIsEditing(true) : undefined}
            onPin={() => onPin?.(message.id)}
            onCopy={handleCopy}
            onDelete={() => onDelete?.(message.id)}
            onReact={(emoji) => onReact?.(message.id, emoji)}
            streamingControls={isContentStreaming ? {
              onCancel: handleCancelStreaming,
              onPause: handlePauseStreaming,
              onResume: handleResumeStreaming,
            } : undefined}
          />
        )}

        {/* Message Content or Editor */}
        {isEditing ? (
          <MessageEditor
            initialContent={displayedContent}
            onSave={handleSaveEdit}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <div ref={contentRef} className="leading-relaxed">
            {contentParts.map((part, index) => {
              if (part.type === 'image') {
                return (
                  <div key={index} className="my-3">
                    <img
                      src={part.content}
                      alt={part.alt}
                      className="rounded-lg max-w-full h-auto shadow-lg hover:shadow-xl interactive-element cursor-pointer scale-transition"
                      onClick={() => window.open(part.content, '_blank')}
                      style={{ maxHeight: '400px', objectFit: 'contain' }}
                    />
                  </div>
                );
              }
              return (
                <div key={index} className="whitespace-pre-wrap break-words">
                  {part.content}
                  {/* Streaming cursor */}
                  {isContentStreaming && index === contentParts.length - 1 && part.type === 'text' && (
                    <span className="streaming-cursor animate-pulse">|</span>
                  )}
                </div>
              );
            })}

            {/* Reactions Display */}
            {message.reactions && message.reactions.length > 0 && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {message.reactions.map((reaction, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 bg-gray-700/50 rounded-full px-2 py-1 text-sm"
                  >
                    <span>{reaction.emoji}</span>
                    <span className="text-xs text-gray-400">{reaction.count}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={`text-xs mt-3 opacity-60 flex items-center justify-between ${
          isUser ? 'text-blue-100' : 'text-gray-500'
        }`}>
          <span>
            {formatDistanceToNow(message.timestamp)} • {message.mode}
            {isContentStreaming && <span className="ml-2 text-blue-400">• Live</span>}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StreamingMessageBubble;