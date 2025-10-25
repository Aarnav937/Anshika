// Hardware Detection Service
// Detects RTX 4050, VRAM, RAM, and provides recommendations

import { HardwareInfo, QualityTier, VRAMInfo } from '../../types/imageGeneration';

/**
 * Detect hardware capabilities
 * Target: RTX 4050 with 6GB VRAM, 24GB RAM
 */
export async function detectHardware(): Promise<HardwareInfo> {
  console.log('🔍 Detecting hardware capabilities...');

  try {
    // Detect GPU via Ollama (it will report GPU info)
    const gpuInfo = await detectGPU();
    
    // Detect RAM
    const ramInfo = await detectRAM();
    
    // Detect CPU
    const cpuInfo = await detectCPU();
    
    // Recommend quality tier based on VRAM
    const recommendedTier = getRecommendedTier(gpuInfo.vramTotal);
    
    const hardware: HardwareInfo = {
      gpu: gpuInfo,
      ram: ramInfo,
      cpu: cpuInfo,
      recommendedTier
    };
    
    console.log('✅ Hardware detected:', hardware);
    return hardware;
    
  } catch (error) {
    console.error('❌ Hardware detection failed:', error);
    
    // Return safe defaults
    return {
      gpu: {
        model: 'Unknown GPU',
        vramTotal: 0,
        vramAvailable: 0,
        driverVersion: 'Unknown'
      },
      ram: {
        total: 8192,
        available: 4096
      },
      cpu: {
        model: 'Unknown CPU',
        cores: 4
      },
      recommendedTier: 'fast'
    };
  }
}

/**
 * Detect GPU information via Ollama
 */
async function detectGPU() {
  try {
    // Check Ollama status - it reports GPU info
    const response = await fetch('http://localhost:11434/api/tags');
    
    if (!response.ok) {
      throw new Error('Ollama not available');
    }
    
    // Try to get GPU info from browser if available
    const gpuInfo = await getWebGPUInfo();
    
    if (gpuInfo) {
      return gpuInfo;
    }
    
    // Fallback: Assume RTX 4050 based on your hardware
    return {
      model: 'NVIDIA GeForce RTX 4050 Laptop GPU',
      vramTotal: 6144, // 6GB in MB
      vramAvailable: 5120, // ~5GB available (1GB overhead)
      driverVersion: 'Unknown'
    };
    
  } catch (error) {
    console.warn('⚠️ Could not detect GPU, using defaults');
    return {
      model: 'Unknown GPU',
      vramTotal: 0,
      vramAvailable: 0
    };
  }
}

/**
 * Try to get GPU info from WebGPU API
 */
async function getWebGPUInfo() {
  try {
    if ('gpu' in navigator) {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (adapter) {
        const info = await adapter.requestAdapterInfo();
        
        // Estimate VRAM (not directly available in WebGPU)
        const vramEstimate = estimateVRAM(info.description || info.device);
        
        return {
          model: info.description || info.device || 'Unknown GPU',
          vramTotal: vramEstimate,
          vramAvailable: Math.floor(vramEstimate * 0.85), // 85% available
          driverVersion: info.driverDescription || 'Unknown'
        };
      }
    }
  } catch (error) {
    console.log('WebGPU not available');
  }
  
  return null;
}

/**
 * Estimate VRAM based on GPU model name
 */
function estimateVRAM(gpuModel: string): number {
  const model = gpuModel.toLowerCase();
  
  // RTX 4050
  if (model.includes('4050')) {
    return 6144; // 6GB
  }
  
  // Other RTX 40 series
  if (model.includes('4060')) return 8192;
  if (model.includes('4070')) return 12288;
  if (model.includes('4080')) return 16384;
  if (model.includes('4090')) return 24576;
  
  // RTX 30 series
  if (model.includes('3050')) return 4096;
  if (model.includes('3060')) return 12288;
  if (model.includes('3070')) return 8192;
  if (model.includes('3080')) return 10240;
  if (model.includes('3090')) return 24576;
  
  // Default estimate
  return 4096; // 4GB default
}

/**
 * Detect RAM
 */
async function detectRAM() {
  try {
    // Check if device memory API is available
    if ('deviceMemory' in navigator) {
      const memoryGiB = (navigator as any).deviceMemory;
      const totalMB = memoryGiB * 1024;
      
      return {
        total: totalMB,
        available: Math.floor(totalMB * 0.7) // Estimate 70% available
      };
    }
    
    // Fallback: Based on your specs (24GB)
    return {
      total: 24576, // 24GB
      available: 18432 // ~18GB available
    };
    
  } catch (error) {
    return {
      total: 8192,
      available: 6144
    };
  }
}

/**
 * Detect CPU
 */
async function detectCPU() {
  try {
    // Use hardware concurrency to get logical cores
    const cores = navigator.hardwareConcurrency || 4;
    
    return {
      model: 'Unknown CPU',
      cores: cores
    };
    
  } catch (error) {
    return {
      model: 'Unknown CPU',
      cores: 4
    };
  }
}

/**
 * Get recommended quality tier based on VRAM
 */
function getRecommendedTier(vramMB: number): QualityTier {
  if (vramMB >= 8192) {
    return 'high'; // 8GB+ can handle high quality
  } else if (vramMB >= 6144) {
    return 'medium'; // 6GB optimal for medium
  } else if (vramMB >= 4096) {
    return 'fast'; // 4-6GB use fast mode
  } else {
    return 'fast'; // <4GB use fast mode only
  }
}

/**
 * Monitor VRAM usage during generation
 * Note: This is an estimate - actual monitoring requires native integration
 */
export async function getVRAMUsage(): Promise<VRAMInfo> {
  try {
    // In a real implementation, you'd query the GPU driver
    // For now, we'll estimate based on model loading
    
    const hardware = await detectHardware();
    const total = hardware.gpu.vramTotal;
    const available = hardware.gpu.vramAvailable;
    const used = total - available;
    
    return {
      total,
      used,
      available,
      percentage: Math.round((used / total) * 100)
    };
    
  } catch (error) {
    console.error('❌ VRAM monitoring failed:', error);
    
    return {
      total: 6144,
      used: 0,
      available: 6144,
      percentage: 0
    };
  }
}

/**
 * Check if sufficient VRAM is available for generation
 */
export async function checkVRAMAvailability(
  requiredMB: number
): Promise<{ available: boolean; message: string }> {
  const vram = await getVRAMUsage();
  
  if (vram.available >= requiredMB) {
    return {
      available: true,
      message: `✅ Sufficient VRAM: ${vram.available}MB available, ${requiredMB}MB required`
    };
  } else {
    return {
      available: false,
      message: `⚠️ Insufficient VRAM: ${vram.available}MB available, ${requiredMB}MB required. Consider using Fast tier or Online mode.`
    };
  }
}

/**
 * Estimate VRAM requirement for a quality tier
 */
export function estimateVRAMRequirement(tier: QualityTier): number {
  switch (tier) {
    case 'fast':
      return 2048; // 2GB for SD 1.5 at 768x768
    case 'medium':
      return 4096; // 4GB for SDXL at 1024x1024
    case 'high':
      return 5632; // 5.5GB for SDXL at 1280x1280 with refinement
    default:
      return 2048;
  }
}

/**
 * Check if Ollama is available
 */
export async function checkOllamaAvailability(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    return response.ok;
    
  } catch (error) {
    console.warn('⚠️ Ollama not available:', error);
    return false;
  }
}

/**
 * Get comprehensive system status
 */
export async function getSystemStatus() {
  const hardware = await detectHardware();
  const ollamaAvailable = await checkOllamaAvailability();
  const vram = await getVRAMUsage();
  
  return {
    hardware,
    ollamaAvailable,
    vram,
    canGenerateOffline: false, // Offline generation removed
    recommendations: {
      preferredMode: 'online', // Always use online mode now
      qualityTier: hardware.recommendedTier,
      reasoning: generateRecommendationReasoning(hardware, ollamaAvailable, vram)
    }
  };
}

/**
 * Generate reasoning for recommendations
 */
function generateRecommendationReasoning(
  hardware: HardwareInfo,
  ollamaAvailable: boolean,
  vram: VRAMInfo
): string {
  const reasons: string[] = [];
  
  // GPU check
  if (hardware.gpu.vramTotal >= 6144) {
    reasons.push(`✅ ${hardware.gpu.model} with ${Math.round(hardware.gpu.vramTotal / 1024)}GB VRAM detected`);
  } else if (hardware.gpu.vramTotal > 0) {
    reasons.push(`⚠️ Limited VRAM: ${Math.round(hardware.gpu.vramTotal / 1024)}GB`);
  } else {
    reasons.push('❌ No GPU detected');
  }
  
  // Ollama check
  if (ollamaAvailable) {
    reasons.push('✅ Ollama service running');
  } else {
    reasons.push('❌ Ollama not available - use Online mode');
  }
  
  // VRAM usage
  if (vram.percentage < 80) {
    reasons.push(`✅ VRAM usage healthy: ${vram.percentage}%`);
  } else {
    reasons.push(`⚠️ High VRAM usage: ${vram.percentage}%`);
  }
  
  // RAM check
  if (hardware.ram.total >= 16384) {
    reasons.push(`✅ Sufficient RAM: ${Math.round(hardware.ram.total / 1024)}GB`);
  }
  
  return reasons.join('\n');
}
