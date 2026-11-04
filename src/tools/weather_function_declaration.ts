
import type { FunctionDeclaration } from "@google/genai";

export const weatherFunctionDeclaration: FunctionDeclaration = {
    name: "getWeatherForecastForCity",
    description:
        "A custom weather tool developed for this application. " +
        "Get current weather conditions and a 7-day weather forecast for a city."
        + "using the Open-Meteo Weather API. " +
        "City coordinates are retrieved using Open-Meteo Geocoding API.",

    parametersJsonSchema: {
        type: "object",
        properties: {
            city: {
                type: "string",
                description: "The name of the city to get weather information for."
            }
        },
        required: ["city"]
    }
};
