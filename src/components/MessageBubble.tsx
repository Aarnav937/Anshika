import React, { useState } from 'react';
import { Message } from '../types';
import { formatDistanceToNow } from '../utils/dateUtils';
import { MessageQuickActions } from './MessageQuickActions';
import MessageEditor from './MessageEditor';

interface MessageBubbleProps {
  message: Message;
  onEdit?: (id: string, newContent: string) => void;
  onPin?: (id: string) => void;
  onDelete?: (id: string) => void;
  onReact?: (id: string, emoji: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onEdit,
  onPin,
  onDelete,
  onReact,
}) => {
  const isUser = message.role === 'user';
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Parse content for images
  type ContentPart = 
    | { type: 'text', content: string }
    | { type: 'image', content: string, alt: string };

  const parseContent = (content: string): ContentPart[] => {
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
  };

  const contentParts = parseContent(message.content);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  const handleSaveEdit = (newContent: string) => {
    if (onEdit) {
      onEdit(message.id, newContent);
    }
    setIsEditing(false);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} message-bubble`}>
      <div
        className={`chat-message ${isUser ? 'user' : 'assistant'} max-w-[75%] group relative interactive-element state-transition`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Quick Actions - Show on hover */}
        {isHovered && !isEditing && (onEdit || onPin || onDelete || onReact) && (
          <MessageQuickActions
            role={message.role}
            isPinned={message.isPinned}
            onEdit={isUser ? () => setIsEditing(true) : undefined}
            onPin={() => onPin?.(message.id)}
            onCopy={handleCopy}
            onDelete={() => onDelete?.(message.id)}
            onReact={(emoji) => onReact?.(message.id, emoji)}
          />
        )}

        {/* Message Content or Editor */}
        {isEditing ? (
          <MessageEditor
            initialContent={message.content}
            onSave={handleSaveEdit}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <div className="leading-relaxed">
            {/* Display uploaded images for user messages */}
            {isUser && message.images && message.images.length > 0 && (
              <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {message.images.map((imageData: any, index: number) => (
                  <div key={index} className="relative">
                    <img
                      src={imageData.preview || imageData.file}
                      alt={`Uploaded image ${index + 1}`}
                      className="rounded-lg w-full h-auto max-h-48 object-cover shadow-md hover:shadow-lg interactive-element cursor-pointer scale-transition"
                      onClick={() => {
                        // Create a modal or lightbox view
                        const modal = document.createElement('div');
                        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
                        modal.innerHTML = `
                          <div class="max-w-4xl max-h-screen p-4">
                            <img src="${imageData.preview || imageData.file}" alt="Full size image" class="max-w-full max-h-full object-contain rounded-lg" />
                            <button class="absolute top-4 right-4 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600" onclick="this.parentElement.parentElement.remove()">×</button>
                          </div>
                        `;
                        modal.onclick = (e) => {
                          if (e.target === modal) modal.remove();
                        };
                        document.body.appendChild(modal);
                      }}
                      style={{ maxHeight: '200px', objectFit: 'cover' }}
                    />
                    <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                      {imageData.file?.name || `Image ${index + 1}`}
                    </div>
                  </div>
                ))}
              </div>
            )}

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
          </span>
          
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;