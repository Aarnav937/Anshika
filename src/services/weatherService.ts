import { secureStorage } from './secureStorageService';

interface WeatherData {
  location: {
    name: string;
    country: string;
    localtime: string;
  };
  current: {
    temp_c: number;
    temp_f: number;
    condition: {
      text: string;
      icon: string;
    };
    humidity: number;
    wind_kph: number;
    wind_dir: string;
    feelslike_c: number;
    feelslike_f: number;
    uv: number;
  };
  forecast?: {
    forecastday: Array<{
      date: string;
      day: {
        maxtemp_c: number;
        maxtemp_f: number;
        mintemp_c: number;
        mintemp_f: number;
        condition: {
          text: string;
          icon: string;
        };
        daily_chance_of_rain: number;
      };
    }>;
  };
}

interface WeatherAPIResponse {
  location: WeatherData['location'];
  current: WeatherData['current'];
  forecast?: WeatherData['forecast'];
  error?: {
    message: string;
  };
}

export async function getCurrentWeather(location: string): Promise<string> {
  // Load API key from secure storage or .env fallback
  let apiKey = await secureStorage.getApiKey('VITE_WEATHERAPI_KEY');
  
  if (!apiKey) {
    // Fallback to .env file
    apiKey = import.meta.env.VITE_WEATHERAPI_KEY;
  }

  if (!apiKey) {
    return "⚠️ Weather API key not configured. Please add VITE_WEATHERAPI_KEY to .env file or Settings → 🔑 API Keys.";
  }

  try {
    const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(location)}&aqi=no`;

    const response = await fetch(url);
    const data: WeatherAPIResponse = await response.json();

    if (!response.ok) {
      return `❌ Weather lookup failed: ${data.error?.message || 'Unknown error'}`;
    }

    const { location: loc, current } = data;

    return `🌤️ **Current Weather in ${loc.name}, ${loc.country}**

**Temperature:** ${current.temp_c}°C (${current.temp_f}°F)
**Feels like:** ${current.feelslike_c}°C (${current.feelslike_f}°F)
**Condition:** ${current.condition.text}
**Humidity:** ${current.humidity}%
**Wind:** ${current.wind_kph} km/h ${current.wind_dir}
**UV Index:** ${current.uv}
**Local Time:** ${loc.localtime}

*Last updated: ${new Date().toLocaleString()}*`;
  } catch (error) {
    console.error('Weather error:', error);
    return `❌ Failed to get weather data: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

export async function getWeatherForecast(location: string, days: number = 3): Promise<string> {
  // Load API key from secure storage or .env fallback
  let apiKey = await secureStorage.getApiKey('VITE_WEATHERAPI_KEY');
  
  if (!apiKey) {
    // Fallback to .env file
    apiKey = import.meta.env.VITE_WEATHERAPI_KEY;
  }

  if (!apiKey) {
    return "⚠️ Weather API key not configured. Please add VITE_WEATHERAPI_KEY to .env file or Settings → 🔑 API Keys.";
  }

  try {
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(location)}&days=${days}&aqi=no`;

    const response = await fetch(url);
    const data: WeatherAPIResponse = await response.json();

    if (!response.ok) {
      return `❌ Weather forecast failed: ${data.error?.message || 'Unknown error'}`;
    }

    const { location: loc, current, forecast } = data;

    let result = `🌤️ **${days}-Day Weather Forecast for ${loc.name}, ${loc.country}**\n\n`;
    result += `**Current:** ${current.condition.text}, ${current.temp_c}°C\n\n`;

    if (forecast?.forecastday) {
      forecast.forecastday.forEach((day) => {
        const date = new Date(day.date).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
        result += `**${date}:**\n`;
        result += `${day.day.condition.text}\n`;
        result += `High: ${day.day.maxtemp_c}°C | Low: ${day.day.mintemp_c}°C\n`;
        result += `Rain chance: ${day.day.daily_chance_of_rain}%\n\n`;
      });
    }

    result += `*Forecast data provided by WeatherAPI.com*\n`;
    result += `*Last updated: ${new Date().toLocaleString()}*`;

    return result;
  } catch (error) {
    console.error('Weather forecast error:', error);
    return `❌ Failed to get weather forecast: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}
