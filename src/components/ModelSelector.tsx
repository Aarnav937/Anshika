import React, { useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { getAvailableModels } from '../services/ollamaService';

const ModelSelector: React.FC = () => {
  const { selectedModel, setSelectedModel, setAvailableModels, availableModels } = useChat();

  useEffect(() => {
    const loadModels = async () => {
      try {
        const models = await getAvailableModels();
        if (models.length > 0) {
          setAvailableModels(models);
        }
      } catch (error) {
        console.error('Failed to load models:', error);
        // Keep default models if Ollama is not running
      }
    };

    loadModels();
  }, [setAvailableModels]);

  return (
    <div className="flex items-center gap-4">
      <label className="text-sm lg:text-base font-semibold text-purple-100 dark:text-purple-100">
        Model:
      </label>
      <div className="relative">
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="appearance-none bg-purple-900/20 dark:bg-purple-800/30 backdrop-blur-xl border border-purple-400/30 dark:border-purple-300/40 rounded-2xl px-6 py-3 pr-12 text-sm lg:text-base font-medium focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-300/50 shadow-xl hover:shadow-2xl transition-all duration-300 min-w-[200px] text-purple-100 dark:text-purple-100 hover:bg-purple-800/40 dark:hover:bg-purple-700/40"
        >
          {availableModels.map((model) => (
            <option key={model} value={model} className="bg-purple-900/80 dark:bg-purple-800/90 text-purple-100">
              {model}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-300 pointer-events-none" />
      </div>
    </div>
  );
};

export default ModelSelector;
