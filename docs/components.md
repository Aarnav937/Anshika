# Components Documentation

## Component Architecture

A.N.S.H.I.K.A. follows a component-based architecture with a hierarchical structure organized by atomic design principles.

## Core UI Components

### Button Components

#### BaseButton
```typescript
interface BaseButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

const BaseButton: React.FC<BaseButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  children
}) => {
  const baseClasses = "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-500",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-700 focus:ring-gray-500"
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg"
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <Spinner className="mr-2" />}
      {children}
    </button>
  );
};
```

#### IconButton
```typescript
interface IconButtonProps extends Omit<BaseButtonProps, 'children'> {
  icon: React.ComponentType<{ className?: string }>;
  'aria-label': string;
}

const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  'aria-label': ariaLabel,
  ...props
}) => (
  <BaseButton {...props} aria-label={ariaLabel}>
    <Icon className="w-5 h-5" />
  </BaseButton>
);
```

### Form Components

#### Input
```typescript
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
}

const Input: React.FC<InputProps> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  label
}) => (
  <div className="space-y-1">
    {label && (
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    )}
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      required={required}
      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        error ? 'border-red-500' : 'border-gray-300'
      } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
    />
    {error && (
      <p className="text-sm text-red-600">{error}</p>
    )}
  </div>
);
```

#### Textarea
```typescript
interface TextareaProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  maxLength?: number;
  error?: string;
  disabled?: boolean;
  label?: string;
}

const Textarea: React.FC<TextareaProps> = ({
  placeholder,
  value,
  onChange,
  rows = 4,
  maxLength,
  error,
  disabled = false,
  label
}) => (
  <div className="space-y-1">
    {label && (
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
    )}
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      maxLength={maxLength}
      disabled={disabled}
      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        error ? 'border-red-500' : 'border-gray-300'
      } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
    />
    {maxLength && (
      <div className="flex justify-between text-xs text-gray-500">
        <span>{error}</span>
        <span>{value.length}/{maxLength}</span>
      </div>
    )}
  </div>
);
```

### Layout Components

#### Container
```typescript
interface ContainerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  className?: string;
}

const Container: React.FC<ContainerProps> = ({
  size = 'lg',
  children,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-full'
  };

  return (
    <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${sizeClasses[size]} ${className}`}>
      {children}
    </div>
  );
};
```

#### Card
```typescript
interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({
  title,
  children,
  className = '',
  headerAction,
  footer
}) => (
  <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`}>
    {(title || headerAction) && (
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        {title && <h3 className="text-lg font-medium text-gray-900">{title}</h3>}
        {headerAction && <div>{headerAction}</div>}
      </div>
    )}
    <div className="px-6 py-4">
      {children}
    </div>
    {footer && (
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        {footer}
      </div>
    )}
  </div>
);
```

## Feature Components

### Chat Components

#### ChatInterface
Main chat interface component handling message display and input.

```typescript
interface ChatInterfaceProps {
  className?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ className }) => {
  const { messages, addMessage, isLoading } = useChat();
  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      content: inputValue,
      role: 'user' as const,
      mode: 'online' as const
    };

    addMessage(userMessage);
    setInputValue('');

    // Send to AI service
    try {
      await sendMessageToAI(inputValue);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <MessageList messages={messages} />
      <MessageInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSendMessage}
        disabled={isLoading}
      />
    </div>
  );
};
```

#### MessageBubble
Individual message display component.

```typescript
interface MessageBubbleProps {
  message: Message;
  isUser: boolean;
  showTimestamp?: boolean;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onPin?: (messageId: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isUser,
  showTimestamp = true,
  onEdit,
  onDelete,
  onPin
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const handleEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit?.(message.id, editContent);
    }
    setIsEditing(false);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isUser
          ? 'bg-blue-600 text-white'
          : 'bg-gray-200 text-gray-800'
      }`}>
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={setEditContent}
              rows={3}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleEdit}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="whitespace-pre-wrap">{message.content}</div>
            <div className="flex items-center justify-between mt-2 text-xs opacity-70">
              {showTimestamp && (
                <span>{format(message.timestamp, 'HH:mm')}</span>
              )}
              <div className="flex gap-1">
                {onEdit && (
                  <IconButton
                    icon={Edit}
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                    aria-label="Edit message"
                  />
                )}
                {onPin && (
                  <IconButton
                    icon={message.isPinned ? PinOff : Pin}
                    size="sm"
                    variant="ghost"
                    onClick={() => onPin(message.id)}
                    aria-label={message.isPinned ? "Unpin message" : "Pin message"}
                  />
                )}
                {onDelete && (
                  <IconButton
                    icon={Trash}
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(message.id)}
                    aria-label="Delete message"
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
```

### Document Components

#### DocumentUpload
File upload component with drag-and-drop support.

```typescript
interface DocumentUploadProps {
  onFileSelect: (files: File[]) => void;
  acceptedTypes?: string[];
  maxFiles?: number;
  maxSize?: number; // in bytes
  className?: string;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onFileSelect,
  acceptedTypes = ['.pdf', '.docx', '.txt'],
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB
  className
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file =>
      acceptedTypes.some(type => file.name.toLowerCase().endsWith(type)) &&
      file.size <= maxSize
    );

    if (validFiles.length > 0) {
      onFileSelect(validFiles.slice(0, maxFiles));
    }
  }, [acceptedTypes, maxFiles, maxSize, onFileSelect]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onFileSelect(files.slice(0, maxFiles));
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragOver
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
      } ${className}`}
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onClick={() => fileInputRef.current?.click()}
    >
      <Upload className="mx-auto h-12 w-12 text-gray-400" />
      <div className="mt-4">
        <p className="text-lg font-medium text-gray-900">
          Drop files here or click to upload
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Supports {acceptedTypes.join(', ')} up to {formatFileSize(maxSize)}
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
```

#### DocumentViewer
Document display component with pagination and search.

```typescript
interface DocumentViewerProps {
  document: Document;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  searchQuery?: string;
  onSearch?: (query: string) => void;
  className?: string;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  currentPage = 1,
  onPageChange,
  searchQuery = '',
  onSearch,
  className
}) => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  useEffect(() => {
    if (searchQuery) {
      // Find and highlight search terms
      const foundHighlights = findHighlights(document.content, searchQuery);
      setHighlights(foundHighlights);
    } else {
      setHighlights([]);
    }
  }, [searchQuery, document.content]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Search Bar */}
      <div className="flex items-center gap-4 p-4 border-b">
        <Search className="w-5 h-5 text-gray-400" />
        <Input
          placeholder="Search in document..."
          value={searchQuery}
          onChange={onSearch || (() => {})}
          className="flex-1"
        />
        {highlights.length > 0 && (
          <span className="text-sm text-gray-500">
            {highlights.length} matches
          </span>
        )}
      </div>

      {/* Document Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto">
          <DocumentContent
            content={document.content}
            highlights={highlights}
            currentPage={currentPage}
          />
        </div>
      </div>

      {/* Pagination */}
      {document.pageCount && document.pageCount > 1 && (
        <div className="flex items-center justify-center gap-2 p-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange?.(currentPage - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <span className="text-sm text-gray-600">
            Page {currentPage} of {document.pageCount}
          </span>

          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage >= document.pageCount}
            onClick={() => onPageChange?.(currentPage + 1)}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
```

### Image Generation Components

#### ImageGenerationPanel
Main image generation interface.

```typescript
interface ImageGenerationPanelProps {
  initialTab?: 'generate' | 'transform' | 'batch' | 'gallery' | 'history';
  className?: string;
}

const ImageGenerationPanel: React.FC<ImageGenerationPanelProps> = ({
  initialTab = 'generate',
  className
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  const tabs = [
    { id: 'generate', label: 'Generate', icon: Sparkles },
    { id: 'transform', label: 'Transform', icon: Wand2 },
    { id: 'batch', label: 'Batch', icon: Layers },
    { id: 'gallery', label: 'Gallery', icon: Image },
    { id: 'history', label: 'History', icon: History }
  ];

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'generate' && (
          <ImageGenerator onGenerate={(image) => setGeneratedImages(prev => [image, ...prev])} />
        )}
        {activeTab === 'transform' && (
          <ImageTransformer onTransform={(image) => setGeneratedImages(prev => [image, ...prev])} />
        )}
        {activeTab === 'batch' && (
          <BatchGenerator onBatchComplete={(images) => setGeneratedImages(prev => [...images, ...prev])} />
        )}
        {activeTab === 'gallery' && (
          <ImageGallery images={generatedImages} />
        )}
        {activeTab === 'history' && (
          <GenerationHistory />
        )}
      </div>
    </div>
  );
};
```

#### PromptInput
Advanced prompt input with suggestions and enhancement.

```typescript
interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onEnhance?: () => void;
  placeholder?: string;
  maxLength?: number;
  suggestions?: string[];
  className?: string;
}

const PromptInput: React.FC<PromptInputProps> = ({
  value,
  onChange,
  onEnhance,
  placeholder = "Describe the image you want to generate...",
  maxLength = 1000,
  suggestions = [],
  className
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative">
        <Textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={4}
          className="pr-12"
        />

        {onEnhance && (
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-2 right-2"
            onClick={onEnhance}
            title="Enhance prompt with AI"
          >
            <Sparkles className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Character Count */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>{value.length}/{maxLength} characters</span>
        {suggestions.length > 0 && (
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="text-blue-600 hover:text-blue-800"
          >
            {showSuggestions ? 'Hide' : 'Show'} suggestions
          </button>
        )}
      </div>

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="border rounded-md p-2 max-h-32 overflow-y-auto">
          <div className="text-xs text-gray-600 mb-2">Suggested prompts:</div>
          <div className="space-y-1">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="block w-full text-left text-sm p-2 rounded hover:bg-gray-100 truncate"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

## Layout Components

### Sidebar Components

#### LeftSidebar
Main navigation sidebar with tab management.

```typescript
interface TabState {
  mainTab: 'chat' | 'document-intelligence' | 'image-generation';
  subTab?: string;
}

interface LeftSidebarProps {
  activeTab: TabState;
  onTabChange: (tab: TabState) => void;
  className?: string;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeTab,
  onTabChange,
  className
}) => {
  const tabs = [
    {
      id: 'chat',
      label: 'Chat',
      icon: MessageSquare,
      description: 'AI Conversations'
    },
    {
      id: 'document-intelligence',
      label: 'Documents',
      icon: FileText,
      description: 'Document Analysis'
    },
    {
      id: 'image-generation',
      label: 'Images',
      icon: Image,
      description: 'AI Image Generation'
    }
  ];

  return (
    <div className={`w-64 bg-white border-r border-gray-200 flex flex-col ${className}`}>
      {/* Logo */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">A.N.S.H.I.K.A.</h1>
            <p className="text-xs text-gray-500">AI Assistant</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab.mainTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange({ mainTab: tab.id as any, subTab: undefined })}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                <div>
                  <div className="font-medium">{tab.label}</div>
                  <div className="text-xs text-gray-500">{tab.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          Powered by Gemini & Ollama
        </div>
      </div>
    </div>
  );
};
```

### Modal Components

#### Modal
Base modal component with backdrop and animations.

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className
}) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative bg-white rounded-lg shadow-xl max-h-[90vh] overflow-hidden ${sizeClasses[size]} ${className}`}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
```

## Utility Components

### Loading Components

#### Spinner
Loading spinner with different sizes.

```typescript
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <svg
      className={`animate-spin text-gray-600 ${sizeClasses[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};
```

#### Skeleton
Content placeholder for loading states.

```typescript
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
}

const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  className = '',
  variant = 'text'
}) => {
  const baseClasses = "animate-pulse bg-gray-200";

  const variantClasses = {
    text: "h-4 rounded",
    rectangular: "rounded",
    circular: "rounded-full"
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};
```

### Error Components

#### ErrorBoundary
React error boundary component.

```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallback?: React.ComponentType<{ error: Error }> }>,
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} />;
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
    <div className="flex items-center gap-2">
      <AlertTriangle className="w-5 h-5 text-red-600" />
      <h3 className="text-red-800 font-medium">Something went wrong</h3>
    </div>
    <p className="text-red-700 mt-2">{error.message}</p>
    <button
      onClick={() => window.location.reload()}
      className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Reload Page
    </button>
  </div>
);
```

#### ErrorDisplay
Error message display component.

```typescript
interface ErrorDisplayProps {
  error: Error | string;
  onRetry?: () => void;
  className?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  className
}) => {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <div className={`p-4 border border-red-200 rounded-lg bg-red-50 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-red-800 font-medium">Error</h3>
          <p className="text-red-700 mt-1">{errorMessage}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
```

---

*Last updated: October 30, 2025*</content>
<parameter name="filePath">c:\Users\Aarnav\Desktop\Anshika\docs\components.md