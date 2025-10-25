interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

interface GoogleSearchResponse {
  items?: SearchResult[];
  error?: {
    message: string;
  };
}

export async function performWebSearch(query: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GOOGLE_SEARCH_API_KEY;
  const searchEngineId = import.meta.env.VITE_GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !searchEngineId) {
    return "⚠️ Web search is not configured. Please add VITE_GOOGLE_SEARCH_API_KEY and VITE_GOOGLE_SEARCH_ENGINE_ID to your environment variables.";
  }

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=5`;

    const response = await fetch(url);
    const data: GoogleSearchResponse = await response.json();

    if (!response.ok) {
      return `❌ Search failed: ${data.error?.message || 'Unknown error'}`;
    }

    if (!data.items || data.items.length === 0) {
      return `🔍 No search results found for "${query}". Try different keywords.`;
    }

    // Format the search results
    let result = `🔍 **Search Results for "${query}"**\n\n`;

    data.items.forEach((item, index) => {
      result += `**${index + 1}. ${item.title}**\n`;
      result += `${item.snippet}\n`;
      result += `📎 ${item.link}\n\n`;
    });

    result += `💡 *Tip: Always verify information from web sources as they can change over time.*`;

    return result;
  } catch (error) {
    console.error('Web search error:', error);
    return `❌ Failed to perform web search: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}
