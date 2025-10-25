import React from 'react';
import type { BrushSettings, ToolType } from '../../types/imageEditor';

interface BrushToolbarProps {
  currentTool: ToolType;
  brush: BrushSettings;
  canUndo: boolean;
  canRedo: boolean;
  onToolChange: (tool: ToolType) => void;
  onBrushChange: (brush: BrushSettings) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onReset: () => void;
}

export const BrushToolbar: React.FC<BrushToolbarProps> = ({ currentTool, brush }) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm text-gray-300">Tool: {currentTool}</div>
      <div className="text-sm text-gray-300">Brush size: {brush.size}</div>
    </div>
  );
};

export default BrushToolbar;
