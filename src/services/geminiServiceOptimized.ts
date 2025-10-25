import axios from 'axios';

// API Key from environment
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

// Base URLs for Gemini API
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1/models';

// OPTIMIZED: Pre-defined models to avoid API calls for model selection
const KNOWN_MODELS = {
  flash: 'gemini-1.5-flash',
  pro: 'gemini-1.5-pro',
  fallback: 'gemini-1.5-flash'
};

// FAST Model selection without API calls - MAJOR SPEED IMPROVEMENT
function selectGeminiModelFast(message: string): { url: string; modelName: string } {
  const wordCount = message.trim().split(/\s+/).length;
  const isPro = wordCount > 1000 || 
                message.toLowerCase().includes('use pro') ||
                message.toLowerCase().includes('pro model') ||
                message.toLowerCase().includes('complex') ||
                message.toLowerCase().includes('detailed analysis');
  
  const modelName = isPro ? KNOWN_MODELS.pro : KNOWN_MODELS.flash;
  const url = `${GEMINI_BASE_URL}/${modelName}:generateContent`;
  
  console.log(`⚡ Fast model selection: ${modelName} (${wordCount} words, ${isPro ? 'Pro' : 'Flash'} mode)`);
  return { url, modelName };
}

// OPTIMIZED Gemini Message function - Removes all bottlenecks
export async function sendGeminiMessageOptimized(
  message: string,
  addMessage: (message: { content: string; role: 'assistant'; mode: 'online' }) => void,
  updateMessage: (content: string) => void,
  temperature: number = 0.7,
  _webSearchEnabled: boolean = false,
  signal?: AbortSignal
): Promise<void> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Please check your environment variables.');
  }

  // FAST model selection (no API call needed)
  const startTime = performance.now();
  const { url: GEMINI_API_URL, modelName } = selectGeminiModelFast(message);
  const modelSelectionTime = performance.now() - startTime;
  
  console.log('🔑 API Key configured: Yes');
  console.log('🤖 Using model:', modelName);
  console.log('🌐 Endpoint:', GEMINI_API_URL);
  console.log(`⚡ Model selection: ${modelSelectionTime.toFixed(1)}ms`);

  try {
    let fullResponse = '';

    // OPTIMIZED request body with speed optimizations
    const requestBody: any = {
      contents: [{
        parts: [{
          text: message
        }]
      }],
      generationConfig: {
        temperature: temperature,
        // Speed optimizations
        maxOutputTokens: message.length > 500 ? 2048 : 1024, // Limit for speed
        candidateCount: 1, // Single response only
        stopSequences: [], // No stop sequences for speed
      }
    };

    // Tools temporarily disabled for maximum speed
    console.log('🚫 Tools disabled for speed optimization');

    const networkStartTime = performance.now();

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal,
      // Speed optimizations
      keepalive: false, // Disable keep-alive for faster response
    });

    const networkTime = performance.now() - networkStartTime;
    console.log(`🌐 Network request: ${networkTime.toFixed(1)}ms`);

    if (!response.ok) {
      let errorMessage = `Gemini API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error?.message) {
          errorMessage += ` - ${errorData.error.message}`;
        }
      } catch (e) {
        // Ignore JSON parse errors for error response
      }
      
      // Add helpful suggestions based on status code
      if (response.status === 404) {
        errorMessage += '\n💡 Suggestion: The model endpoint might be incorrect or the model is not available.';
      } else if (response.status === 403) {
        errorMessage += '\n💡 Suggestion: Check your API key permissions and billing status.';
      } else if (response.status === 503) {
        errorMessage += '\n💡 Suggestion: Gemini service is temporarily unavailable. Try again in a few moments.';
      } else if (response.status === 429) {
        errorMessage += '\n💡 Suggestion: Rate limit exceeded. Please wait before making more requests.';
      } else if (response.status === 400) {
        errorMessage += '\n💡 Suggestion: Request format issue. Using optimized request format.';
      }
      
      throw new Error(errorMessage);
    }

    const parseStartTime = performance.now();
    const responseData = await response.json();
    const parseTime = performance.now() - parseStartTime;
    console.log(`📄 Response parsing: ${parseTime.toFixed(1)}ms`);

    // Simplified response handling for speed
    const text = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      fullResponse = text;
      updateMessage(fullResponse);
    }

    const totalTime = performance.now() - startTime;
    const wordCount = fullResponse.split(/\s+/).length;
    const wordsPerSecond = wordCount / (totalTime / 1000);
    
    console.log(`📊 PERFORMANCE SUMMARY: Total: ${totalTime.toFixed(1)}ms, Speed: ${wordsPerSecond.toFixed(1)} words/sec, Words: ${wordCount}`);

    // No tool calls in optimized version for maximum speed
    addMessage({
      content: fullResponse,
      role: 'assistant',
      mode: 'online',
    });

  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Gemini API error: ${error.response?.data?.error?.message || error.message}`);
    }
    throw error;
  }
}

// Speed test function that can be called from console
export async function runGeminiSpeedTest(): Promise<void> {
  console.log('🚀 Running Gemini Speed Test...');
  
  const tests = [
    { name: 'Short-1', msg: 'Hi' },
    { name: 'Short-2', msg: 'What is 2+2?' },
    { name: 'Short-3', msg: 'Hello world' },
    { name: 'Short-4', msg: 'Tell me a joke' },
    { name: 'Short-5', msg: 'Name one planet' },
    { name: 'Long-1', msg: 'Provide a comprehensive detailed analysis of artificial intelligence development, including historical context, current state, major breakthroughs, key players, technological challenges, ethical considerations, future predictions, and potential societal impacts. Please include specific examples and cite recent developments.' },
    { name: 'Long-2', msg: 'Write a detailed science fiction story about space exploration that includes complex character development, scientific accuracy, plot twists, and explores themes of human nature, technology, and discovery. The story should be compelling and well-structured.' },
    { name: 'Long-3', msg: 'Explain in great detail how quantum computing works, including the physics behind qubits, quantum entanglement, superposition, quantum gates, error correction, current hardware implementations, and practical applications.' },
    { name: 'Long-4', msg: 'Conduct a comprehensive business analysis of the renewable energy sector, including market trends, key players, financial performance, regulatory environment, technological innovations, and growth projections.' },
    { name: 'Long-5', msg: 'Create a detailed educational curriculum for teaching machine learning to beginners, including learning objectives, lesson plans, practical exercises, assessment methods, and progression from basic concepts to advanced topics.' }
  ];

  const results = [];

  for (const test of tests) {
    console.log(`\n🧪 Testing ${test.name}...`);
    const startTime = performance.now();
    
    try {
      let responseText = '';
      const mockAddMessage = (msg: any) => { responseText = msg.content; };
      const mockUpdateMessage = (content: string) => { responseText = content; };
      
      await sendGeminiMessageOptimized(
        test.msg,
        mockAddMessage,
        mockUpdateMessage,
        0.7,
        false
      );
      
      const duration = performance.now() - startTime;
      const wordCount = responseText.split(/\s+/).length;
      const wordsPerSecond = wordCount / (duration / 1000);
      
      results.push({
        name: test.name,
        duration: duration,
        wordCount: wordCount,
        wordsPerSecond: wordsPerSecond,
        success: true
      });
      
      console.log(`✅ ${test.name}: ${duration.toFixed(0)}ms (${wordsPerSecond.toFixed(1)} w/s)`);
      
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.push({
        name: test.name,
        duration: duration,
        error: errorMsg,
        success: false
      });
      console.log(`❌ ${test.name}: ${errorMsg} (${duration.toFixed(0)}ms)`);
    }
    
    // Small delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  const successful = results.filter(r => r.success);
  if (successful.length > 0) {
    const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
    const avgWordsPerSecond = successful.reduce((sum, r) => sum + (r.wordsPerSecond || 0), 0) / successful.length;
    
    console.log('\n📊 SPEED TEST RESULTS:');
    console.log(`✅ Successful: ${successful.length}/${results.length}`);
    console.log(`⏱️ Average Time: ${avgDuration.toFixed(0)}ms`);
    console.log(`🚀 Average Speed: ${avgWordsPerSecond.toFixed(1)} words/second`);
    console.log(`⚡ Fastest: ${Math.min(...successful.map(r => r.duration)).toFixed(0)}ms`);
    console.log(`🐌 Slowest: ${Math.max(...successful.map(r => r.duration)).toFixed(0)}ms`);
  }
  
  return;
}

// Keep the original function for compatibility but mark it as slow
export const sendGeminiMessage = sendGeminiMessageOptimized;