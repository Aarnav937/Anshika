import React from 'react';
import { ChatMode } from '../types';

interface ModeToggleProps {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onModeChange }) => {
  const handleClick = () => {
    const newMode = mode === 'online' ? 'offline' : 'online';
    onModeChange(newMode);
  };

  return (
    <button
      onClick={handleClick}
      className="mode-toggle"
      data-state={mode === 'online' ? 'checked' : 'unchecked'}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          mode === 'online' ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
};

export default ModeToggle;
