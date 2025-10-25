// Progress Tracking Service
// CRITICAL: Must work reliably - no freezing, accurate updates

import { GenerationProgress, GenerationStage, VRAMInfo } from '../../types/imageGeneration';

export type ProgressCallback = (progress: GenerationProgress) => void;

/**
 * Progress Tracker
 * Manages generation progress with smooth updates and VRAM monitoring
 */
export class ProgressTracker {
  private callbacks: Set<ProgressCallback> = new Set();
  private currentProgress: GenerationProgress;
  private updateInterval: NodeJS.Timeout | null = null;
  private lastUpdate: number = 0;
  private readonly MIN_UPDATE_INTERVAL = 500; // Update every 500ms minimum
  
  constructor() {
    this.currentProgress = {
      percentage: 0,
      stage: 'idle',
      message: 'Ready'
    };
  }
  
  /**
   * Subscribe to progress updates
   */
  onProgress(callback: ProgressCallback): () => void {
    this.callbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }
  
  /**
   * Update progress (throttled to prevent UI freezing)
   */
  updateProgress(progress: Partial<GenerationProgress>) {
    const now = Date.now();
    
    // Throttle updates to prevent overwhelming the UI
    if (now - this.lastUpdate < this.MIN_UPDATE_INTERVAL && progress.percentage !== 100) {
      return;
    }
    
    this.lastUpdate = now;
    
    // Merge with current progress
    this.currentProgress = {
      ...this.currentProgress,
      ...progress
    };
    
    // Ensure percentage is within bounds
    this.currentProgress.percentage = Math.max(0, Math.min(100, this.currentProgress.percentage));
    
    // Notify all subscribers
    this.notifySubscribers();
  }
  
  /**
   * Set stage with automatic message
   */
  setStage(stage: GenerationStage, percentage?: number) {
    const message = this.getStageMessage(stage);
    
    this.updateProgress({
      stage,
      message,
      ...(percentage !== undefined && { percentage })
    });
  }
  
  /**
   * Update step progress (for iterative generation)
   */
  updateStep(currentStep: number, totalSteps: number) {
    // Calculate percentage based on steps (20-90% range for generation)
    const stepPercentage = 20 + Math.floor(((currentStep / totalSteps) * 70));
    
    // Calculate estimated time remaining
    const estimatedTimeRemaining = Math.ceil((totalSteps - currentStep) * 0.5); // ~0.5s per step
    
    this.updateProgress({
      currentStep,
      totalSteps,
      percentage: stepPercentage,
      estimatedTimeRemaining
    });
  }
  
  /**
   * Update VRAM usage - removed (offline mode no longer supported)
   */
  updateVRAM(_vramInfo: VRAMInfo) {
    // VRAM tracking removed for offline generation
  }
  
  /**
   * Reset progress
   */
  reset() {
    this.currentProgress = {
      percentage: 0,
      stage: 'idle',
      message: 'Ready'
    };
    
    this.notifySubscribers();
    
    // Clear any update intervals
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  /**
   * Complete progress
   */
  complete() {
    this.updateProgress({
      percentage: 100,
      stage: 'complete',
      message: '✅ Generation complete!',
      estimatedTimeRemaining: 0
    });
  }
  
  /**
   * Set error state
   */
  error(message: string) {
    this.updateProgress({
      stage: 'error',
      message: `❌ ${message}`
    });
  }
  
  /**
   * Set cancelled state
   */
  cancel() {
    this.updateProgress({
      stage: 'cancelled',
      message: '🚫 Generation cancelled'
    });
  }
  
  /**
   * Get current progress
   */
  getProgress(): GenerationProgress {
    return { ...this.currentProgress };
  }
  
  /**
   * Notify all subscribers
   */
  private notifySubscribers() {
    this.callbacks.forEach(callback => {
      try {
        callback(this.getProgress());
      } catch (error) {
        console.error('❌ Progress callback error:', error);
      }
    });
  }
  
  /**
   * Get human-readable message for stage
   */
  private getStageMessage(stage: GenerationStage): string {
    switch (stage) {
      case 'idle':
        return 'Ready';
      case 'initializing':
        return '🔧 Initializing...';
      case 'processing_prompt':
        return '💭 Processing prompt...';
      case 'loading_model':
        return '📦 Loading model...';
      case 'generating':
        return '🎨 Generating image...';
      case 'finalizing':
        return '✨ Finalizing...';
      case 'complete':
        return '✅ Complete!';
      case 'error':
        return '❌ Error occurred';
      case 'cancelled':
        return '🚫 Cancelled';
      default:
        return 'Processing...';
    }
  }
  
  /**
   * Start simulated progress for online generation
   * (Gemini doesn't provide real-time progress)
   */
  startSimulatedProgress(estimatedDuration: number = 10000) {
    let elapsed = 0;
    const updateFrequency = 500; // Update every 500ms
    const totalSteps = Math.floor(estimatedDuration / updateFrequency);
    let currentStep = 0;
    
    // Initial stages
    this.setStage('initializing', 5);
    
    setTimeout(() => {
      this.setStage('processing_prompt', 15);
    }, 1000);
    
    setTimeout(() => {
      this.setStage('generating', 20);
      
      // Start incremental updates
      this.updateInterval = setInterval(() => {
        currentStep++;
        elapsed += updateFrequency;
        
        // Calculate smooth progress from 20% to 90%
        const progress = 20 + Math.floor(((currentStep / totalSteps) * 70));
        const timeRemaining = Math.ceil((estimatedDuration - elapsed) / 1000);
        
        this.updateProgress({
          percentage: Math.min(progress, 90),
          estimatedTimeRemaining: timeRemaining
        });
        
        // Stop at 90% - wait for actual completion
        if (progress >= 90) {
          if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
          }
          this.setStage('finalizing', 90);
        }
      }, updateFrequency);
      
    }, 2000);
  }
  
  /**
   * Stop simulated progress
   */
  stopSimulatedProgress() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  /**
   * Start real-time progress tracking for offline generation
   */
  startRealtimeProgress(totalSteps: number) {
    console.log(`🎨 Starting real-time progress tracking for ${totalSteps} steps`);
    
    this.setStage('initializing', 5);
    
    setTimeout(() => {
      this.setStage('processing_prompt', 10);
    }, 500);
    
    setTimeout(() => {
      this.setStage('loading_model', 15);
    }, 1000);
    
    setTimeout(() => {
      this.setStage('generating', 20);
      // From here, updateStep() will be called by the generator
    }, 1500);
  }
}

// Singleton instance
let progressTrackerInstance: ProgressTracker | null = null;

/**
 * Get or create progress tracker instance
 */
export function getProgressTracker(): ProgressTracker {
  if (!progressTrackerInstance) {
    progressTrackerInstance = new ProgressTracker();
  }
  return progressTrackerInstance;
}

/**
 * Create a new progress tracker (for multiple simultaneous generations)
 */
export function createProgressTracker(): ProgressTracker {
  return new ProgressTracker();
}

/**
 * Helper: Create progress simulator for testing
 */
export function simulateProgress(
  onProgress: ProgressCallback,
  duration: number = 10000
) {
  const tracker = createProgressTracker();
  const unsubscribe = tracker.onProgress(onProgress);
  
  tracker.startSimulatedProgress(duration);
  
  // Auto-complete after duration
  setTimeout(() => {
    tracker.complete();
    
    // Auto-cleanup after 1 second
    setTimeout(() => {
      unsubscribe();
    }, 1000);
  }, duration);
  
  return {
    tracker,
    cancel: () => {
      tracker.cancel();
      tracker.stopSimulatedProgress();
      unsubscribe();
    }
  };
}

/**
 * Helper: Format time remaining
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds < 1) {
    return 'Less than 1 second';
  } else if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  } else {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (remainingSeconds === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      return `${minutes}m ${remainingSeconds}s`;
    }
  }
}

/**
 * Helper: Format VRAM usage
 */
export function formatVRAM(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  } else {
    return `${mb} MB`;
  }
}

/**
 * Helper: Get progress color based on percentage
 */
export function getProgressColor(percentage: number): string {
  if (percentage < 25) return '#3b82f6'; // blue
  if (percentage < 50) return '#8b5cf6'; // purple
  if (percentage < 75) return '#ec4899'; // pink
  if (percentage < 100) return '#f59e0b'; // amber
  return '#10b981'; // green
}

/**
 * Helper: Get stage icon
 */
export function getStageIcon(stage: GenerationStage): string {
  switch (stage) {
    case 'idle': return '⏸️';
    case 'initializing': return '🔧';
    case 'processing_prompt': return '💭';
    case 'loading_model': return '📦';
    case 'generating': return '🎨';
    case 'finalizing': return '✨';
    case 'complete': return '✅';
    case 'error': return '❌';
    case 'cancelled': return '🚫';
    default: return '⏳';
  }
}
