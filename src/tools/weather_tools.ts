
import { fetchOpenMeteoJson } from "../service/connect_pool.js";

interface LocationData {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
}

interface GeocodingResponse {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
  }>;
}

interface WeatherApiResponse {
  current?: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
  };

  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
  };
}

export async function getLocation(
  city: string
): Promise<LocationData> {

  const url = new URL(
    "https://geocoding-api.open-meteo.com/v1/search"
  );

  url.search = new URLSearchParams({
    name: city,
    count: "1",
    language: "en",
    format: "json"
  }).toString();

  const data = await fetchOpenMeteoJson<GeocodingResponse>(url);


const result = data.results?.[0];

if (result === undefined) {
  throw new Error(`Location "${city}" not found.`);
}

return {
  name: result.name,
  latitude: result.latitude,
  longitude: result.longitude,
  country: result.country ?? "Unknown"
};
}

export async function getWeatherForecast(
  latitude: number,
  longitude: number
) {

  const url = new URL(
    "https://api.open-meteo.com/v1/forecast"
  );

  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),

    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m"
    ].join(","),

    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
      "precipitation_sum",
      "wind_speed_10m_max"
    ].join(","),

    forecast_days: "7",
    timezone: "auto"
  }).toString();

  const data = await fetchOpenMeteoJson<WeatherApiResponse>(url);

  if (
    !data.current ||
    !data.daily ||
    !Array.isArray(data.daily.time)
  ) {
    throw new Error("Weather API returned incomplete data.");
  }

  const current = {
    temperature: data.current.temperature_2m,
    humidity: data.current.relative_humidity_2m,
    apparentTemperature: data.current.apparent_temperature,
    precipitation: data.current.precipitation,
    weathercode: data.current.weather_code,
    windspeed: data.current.wind_speed_10m,
    winddirection: data.current.wind_direction_10m,
    time: data.current.time
  };

  const daily = data.daily.time.map(
    (date: string, index: number) => ({
      date,
      weathercode: data.daily!.weather_code[index],
      temperatureMax: data.daily!.temperature_2m_max[index],
      temperatureMin: data.daily!.temperature_2m_min[index],
      precipitationProbability:
        data.daily!.precipitation_probability_max[index],
      precipitationSum: data.daily!.precipitation_sum[index],
      windspeedMax: data.daily!.wind_speed_10m_max[index]
    })
  );

  return {
    current,
    daily
  };
}

export async function getWeatherForecastForCity(
  city: string
) {

  if (!city || !city.trim()) {
    throw new Error("City name is required.");
  }

  const location = await getLocation(city.trim());

  const weather = await getWeatherForecast(
    location.latitude,
    location.longitude
  );

  return {
    location,
    weather
  };
}
