import React from 'react';
import type { BrushSettings, ToolType } from '../../types/imageEditor';

interface DrawingCanvasProps {
  imageUrl: string;
  width: number;
  height: number;
  brush: BrushSettings;
  tool: ToolType;
  onMaskChange?: (maskPercent: number) => void;
  onDrawingStateChange?: (isDrawing: boolean) => void;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ imageUrl }) => {
  // Minimal placeholder canvas for TypeScript and runtime
  return (
    <div className="w-full h-full flex items-center justify-center">
      <img src={imageUrl} alt="Canvas" className="max-w-full max-h-full object-contain" />
    </div>
  );
};

export default DrawingCanvas;
