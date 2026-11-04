import type { Tool } from "./tool_registry.js";
import { getWeatherForecastForCity } from "./weather_tools.js";

export const weatherTool: Tool = {
    name: "getWeatherForecastForCity",

    description: "Get weather forecast information by city name.",

    execute: async (args) => {
        return await getWeatherForecastForCity(args.city);
    }
};