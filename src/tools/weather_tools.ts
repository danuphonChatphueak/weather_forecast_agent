

interface LocationData {
    name: string;
    latitude: number;
    longitude: number;
    country: string;
}

interface GeocodingResult extends LocationData {
    admin1?: string;
    country_code?: string;
}

function normalizeName(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function getLocation(
    city: string
): Promise<LocationData> {

    const requestedCity = city.split(",")[0].trim();

    if (!requestedCity) {
        throw new Error("City name is required.");
    }

    const url = new URL(
        "https://geocoding-api.open-meteo.com/v1/search"
    );

    url.search = new URLSearchParams({
        name: city.trim(),
        count: "10",
        language: "en",
        format: "json"
    }).toString();

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Geocoding API error: ${response.status}`
        );
    }

    const data = await response.json();

    const results: GeocodingResult[] =
        Array.isArray(data.results) ? data.results : [];

    console.log("Geocoding Results:", results.map(place => ({
        name: place.name,
        country: place.country,
        admin1: place.admin1
    })));

    if (results.length === 0) {
        throw new Error(`Location "${city}" not found.`);
    }

    // Step 1: Find exact city-name matches
    const exactMatches = results.filter(place =>
        normalizeName(place.name) === normalizeName(requestedCity)
    );

    // Step 2: Find matching province/state names
    const regionMatches = results.filter(place =>
        normalizeName(place.admin1 ?? "") ===
        normalizeName(requestedCity)
    );

    let matches = exactMatches.length > 0
        ? exactMatches
        : regionMatches;

    // Step 3: Prefer a matching administrative center
    if (matches.length > 1 && exactMatches.length === 0) {
        const centerMatches = matches.filter(place =>
            normalizeName(place.name) ===
            normalizeName(`Mueang ${requestedCity}`)
        );

        if (centerMatches.length === 1) {
            matches = centerMatches;
        }
    }

    if (matches.length === 0) {
        throw new Error(
            `No matching location for "${city}". ` +
            "Please specify the city and country."
        );
    }

    if (matches.length > 1) {
        throw new Error(
            `Multiple locations match "${city}". ` +
            "Please specify the country or province."
        );
    }

    const result = matches[0];

    return {
        name: result.name,
        latitude: result.latitude,
        longitude: result.longitude,
        country: result.country
    };
}

export async function getWeatherForecast(
    latitude: number,
    longitude: number
) {
    const url = new URL("https://api.open-meteo.com/v1/forecast");

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

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.current || !data.daily) {
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
            weathercode: data.daily.weather_code[index],
            temperatureMax: data.daily.temperature_2m_max[index],
            temperatureMin: data.daily.temperature_2m_min[index],
            precipitationProbability:
                data.daily.precipitation_probability_max[index],
            precipitationSum: data.daily.precipitation_sum[index],
            windspeedMax: data.daily.wind_speed_10m_max[index]
        })
    );

    return {
        current,
        daily
    };
}

export async function getWeatherForecastForCity (city: string) {
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
