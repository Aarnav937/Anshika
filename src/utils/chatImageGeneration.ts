/**
 * Chat Image Generation Utility
 * Handles image generation triggered from chat commands
 */

import { getGeminiImageService } from '../services/image/geminiImageService';
import { imageStorageService } from '../services/image/imageStorageService';
import type { Message } from '../types';

/**
 * Generate an image from a chat command
 */
export async function generateImageInChat(
  prompt: string,
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void,
  setLoading: (loading: boolean) => void,
  currentMode: 'online' | 'offline'
): Promise<void> {
  console.log('🎨 Generating image in chat:', prompt);
  
  setLoading(true);
  
  // Add a status message
  addMessage({
    content: `🎨 **Generating Image**\n\nPrompt: "${prompt}"\n\nPlease wait while I create your image...`,
    role: 'assistant',
    mode: currentMode,
  });

  try {
    // Start generation
    const geminiService = getGeminiImageService();
    await geminiService.initialize();

    // Generate the image
    const result = await geminiService.generateImage({
      prompt,
      aspectRatio: '1:1',
      quality: 'standard',
    });

    console.log('✅ Image generated successfully in chat');

    // Save to storage
    await imageStorageService.saveImage(result);

    // Create a download URL that will work
    const imageUrl = result.url;
    
    // Add success message with embedded image
    const imageMarkdown = `
🎉 **Image Generated Successfully!**

**Prompt:** ${prompt}

![Generated Image](${imageUrl})

**Details:**
- Generation Time: ${result.metadata.generationTime.toFixed(2)}s
- Model: ${result.metadata.model}
- Size: ${(result.blob.size / 1024 / 1024).toFixed(2)} MB
- Aspect Ratio: ${result.metadata.parameters?.aspectRatio || '1:1'}

**Actions:**
- Type \`/imagine [new prompt]\` to generate another image
- Check the Gallery tab to view all your generated images
- Download or favorite images from the Gallery

*Image has been saved to your Gallery automatically.*
`.trim();

    addMessage({
      content: imageMarkdown,
      role: 'assistant',
      mode: currentMode,
    });

  } catch (error) {
    console.error('❌ Image generation failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    addMessage({
      content: `❌ **Image Generation Failed**\n\nError: ${errorMessage}\n\nPlease try again or check the Image Generation tab for more options.`,
      role: 'assistant',
      mode: currentMode,
    });
  } finally {
    setLoading(false);
  }
}

/**
 * Detect if a message is asking for image generation
 */
export function detectImageIntent(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  // Explicit commands
  if (lowerMessage.startsWith('/imagine')) return true;
  if (lowerMessage.startsWith('/generate')) return true;
  if (lowerMessage.startsWith('/draw')) return true;
  if (lowerMessage.startsWith('/create')) return true;
  
  // Natural language patterns
  const imagePatterns = [
    /generate (?:an? )?image of/i,
    /create (?:an? )?image of/i,
    /draw (?:an? )?(?:image of|picture of)?/i,
    /make (?:an? )?image of/i,
    /show me (?:an? )?(?:image|picture) of/i,
    /can you (?:generate|create|make|draw) (?:an? )?image/i,
    /i want (?:an? )?image of/i,
    /generate (?:a )?picture of/i,
  ];
  
  return imagePatterns.some(pattern => pattern.test(message));
}

/**
 * Extract the image prompt from natural language
 */
export function extractImagePrompt(message: string): string | null {
  const lowerMessage = message.toLowerCase();
  
  // Handle explicit commands
  if (lowerMessage.startsWith('/imagine ')) return message.substring(9).trim();
  if (lowerMessage.startsWith('/generate ')) return message.substring(10).trim();
  if (lowerMessage.startsWith('/draw ')) return message.substring(6).trim();
  if (lowerMessage.startsWith('/create ')) return message.substring(8).trim();
  
  // Extract from natural language
  const patterns = [
    /generate (?:an? )?image of (.+)/i,
    /create (?:an? )?image of (.+)/i,
    /draw (?:an? )?(?:image of |picture of )?(.+)/i,
    /make (?:an? )?image of (.+)/i,
    /show me (?:an? )?(?:image|picture) of (.+)/i,
    /can you (?:generate|create|make|draw) (?:an? )?image of (.+)/i,
    /i want (?:an? )?image of (.+)/i,
    /generate (?:a )?picture of (.+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}
