/**
 * PromptInput Component
 * Text input for image generation prompts
 */

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onEnhance?: () => void;
  disabled?: boolean;
  maxLength?: number;
}

export function PromptInput({
  value,
  onChange,
  onEnhance,
  disabled = false,
  maxLength = 1000
}: PromptInputProps) {
  return (
    <div className="w-full mb-4">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        maxLength={maxLength}
        placeholder="Describe the image you want to generate... (e.g., 'A cute cat sitting on a windowsill')"
        className="w-full px-3 py-3 border-2 border-gray-300 rounded-lg resize-vertical transition-colors duration-200 focus:outline-none focus:border-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-800"
        rows={4}
      />
      
      <div className="flex justify-between items-center mt-2">
        <span className="text-sm text-gray-600">
          {value.length} / {maxLength}
        </span>
        
        {onEnhance && (
          <button
            onClick={onEnhance}
            disabled={disabled || !value.trim()}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            title="Enhance prompt with AI"
          >
            ✨ Enhance
          </button>
        )}
      </div>
    </div>
  );
}
