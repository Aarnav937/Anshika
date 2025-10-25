import React from 'react';
import { useChat } from '../contexts/ChatContext';

const TemperatureControl: React.FC = () => {
  const { currentMode, onlineTemperature, offlineTemperature, setOnlineTemperature, setOfflineTemperature } = useChat();

  const temperature = currentMode === 'online' ? onlineTemperature : offlineTemperature;
  const setTemperature = currentMode === 'online' ? setOnlineTemperature : setOfflineTemperature;

  const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setTemperature(value);
  };

  const getTemperatureLabel = (temp: number) => {
    if (temp <= 0.3) return 'Conservative';
    if (temp <= 0.6) return 'Balanced';
    if (temp <= 0.8) return 'Creative';
    return 'Very Creative';
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
      <div className="flex items-center gap-3">
        <span className="text-base lg:text-lg font-semibold text-purple-100 dark:text-purple-100">
          Temperature:
        </span>
        <span className="text-base lg:text-lg font-mono bg-purple-900/30 dark:bg-purple-800/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-purple-400/30 text-purple-100 shadow-lg">
          {temperature.toFixed(1)}
        </span>
      </div>

      <div className="flex items-center gap-4 flex-1 max-w-md">
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={temperature}
          onChange={handleTemperatureChange}
          className="flex-1 h-3 bg-purple-900/30 dark:bg-purple-800/40 rounded-lg appearance-none cursor-pointer slider border border-purple-400/30 hover:bg-purple-800/50"
        />
        <span className="text-sm lg:text-base text-purple-200 dark:text-purple-200 min-w-[100px] font-medium">
          {getTemperatureLabel(temperature)}
        </span>
      </div>
    </div>
  );
};

export default TemperatureControl;
