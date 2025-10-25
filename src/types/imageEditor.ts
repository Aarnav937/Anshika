export interface EditorImage {
  id: string;
  originalUrl: string;
  originalBlob?: Blob | null;
  width: number;
  height: number;
  aspectRatio?: string;
}

export interface BrushSettings {
  size: number;
  opacity?: number;
}

export type ToolType = 'brush' | 'eraser' | 'move' | 'lasso';

export interface ToolsState {
  currentTool: ToolType;
  brush: BrushSettings;
  eraser: BrushSettings;
}

export interface EditorState {
  canUndo: boolean;
  canRedo: boolean;
  isDrawing: boolean;
}

export interface InpaintingProgress {
  progress: number;
  message?: string;
}

export interface InpaintingResult {
  success: boolean;
  imageBlob?: Blob;
  imageUrl?: string;
  error?: string;
}

export const INPAINTING_PRESETS = [
  {
    name: 'Subtle',
    description: 'Small touch-ups',
    brushSize: 12,
    strength: 0.4,
    negativePrompt: '',
    icon: '🪄',
  },
  {
    name: 'Bold',
    description: 'Strong edits',
    brushSize: 40,
    strength: 0.9,
    negativePrompt: '',
    icon: '✨',
  },
] as const;
