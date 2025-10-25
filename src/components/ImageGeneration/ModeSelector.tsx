/**
 * ModeSelector Component
 * Select between online, offline, and smart modes
 */

import { GenerationMode } from '../../types/imageGeneration';

interface ModeSelectorProps {
  currentMode: GenerationMode;
  onModeChange: (mode: GenerationMode) => void;
  disabled?: boolean;
}

export function ModeSelector({
  currentMode,
  onModeChange,
  disabled = false
}: ModeSelectorProps) {
  const modes: Array<{ value: GenerationMode; label: string; icon: string; description: string }> = [
    {
      value: 'online',
      label: 'Online',
      icon: '🌐',
      description: 'Fast, cloud-based generation with Gemini'
    },
    {
      value: 'smart',
      label: 'Smart',
      icon: '🤖',
      description: 'AI chooses the best mode automatically'
    }
  ];

  return (
    <div className="mb-6">
      <label className="block font-semibold mb-2 text-gray-800">Generation Mode:</label>
      
      <div className="flex gap-3">
        {modes.map((mode) => {
          const isActive = currentMode === mode.value;
          const isModeDisabled = disabled;
          
          return (
            <button
              key={mode.value}
              onClick={() => onModeChange(mode.value)}
              disabled={isModeDisabled}
              className={`
                flex-1 px-4 py-3 rounded-lg border-2 transition-all duration-200
                flex flex-col items-center gap-1
                ${isActive 
                  ? 'border-purple-500 bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg' 
                  : 'border-gray-300 bg-white text-gray-800 hover:border-purple-500 hover:shadow-md hover:-translate-y-0.5'
                }
                ${isModeDisabled ? 'opacity-40 cursor-not-allowed hover:transform-none hover:border-gray-300 hover:shadow-none' : 'cursor-pointer'}
              `}
              title={mode.description}
            >
              <span className="text-2xl">{mode.icon}</span>
              <span className="text-sm font-medium">{mode.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
