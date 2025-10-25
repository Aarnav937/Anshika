import { HardwareCapabilities, GPUMemoryInfo } from '../types';

/**
 * Hardware detection utilities for GPU capabilities
 */
export class HardwareDetector {
  /**
   * Detect GPU capabilities
   */
  static async detectGPUCapabilities(): Promise<HardwareCapabilities> {
    // For web environment, return basic capabilities
    // In a real implementation, this would use WebGL or WebGPU APIs
    return {
      gpuModel: 'WebGL Renderer',
      vramTotal: 1024, // 1GB default
      vramAvailable: 512,
      recommendedModels: ['gemini-2.5-flash'],
      supportsLocalGeneration: false
    };
  }

  /**
   * Get GPU memory information
   */
  static async getGPUMemoryInfo(): Promise<GPUMemoryInfo> {
    return {
      total: 1024,
      available: 512,
      used: 512,
      percentage: 50
    };
  }

  /**
   * Optimize parameters for hardware
   */
  static async optimizeParametersForHardware(parameters: any): Promise<any> {
    // Return parameters as-is for web environment
    return parameters;
  }
}

export const hardwareDetector = HardwareDetector;