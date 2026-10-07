const form = document.querySelector("#search-form");
const searchInput = document.querySelector("#search");
const statusMessage = document.querySelector("#status");
const results = document.querySelector("#weather-results");
const unitButtons = document.querySelectorAll("[data-unit]");

const weatherLabels = {
    sunny: "Sunny",
    cloudy: "Cloudy",
    foggy: "Foggy",
    rainy: "Rainy",
    snowy: "Snowy",
    stormy: "Thunderstorms"
};

const weatherIcons = {
    sunny: "☀️",
    cloudy: "☁️",
    foggy: "🌫️",
    rainy: "🌧️",
    snowy: "❄️",
    stormy: "⛈️"
};

let currentWeather = null;
let currentUnit = "celsius";

function getWeatherMood(code, isDay) {
    if (code === 0) return isDay ? "sunny" : "cloudy";
    if (code === 1 || code === 2 || code === 3) return "cloudy";
    if (code === 45 || code === 48) return "foggy";
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rainy";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "snowy";
    if ([95, 96, 99].includes(code)) return "stormy";
    return "cloudy";
}

async function getJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Weather service returned ${response.status}. Please try again.`);
    }
    return response.json();
}

function displayTemperature(celsiusValue) {
    const value = currentUnit === "fahrenheit"
        ? (celsiusValue * 9 / 5) + 32
        : celsiusValue;
    return Math.round(value);
}

function renderWeather() {
    unitButtons.forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.unit === currentUnit));
    });
    if (!currentWeather) return;

    const { location, weather } = currentWeather;
    const mood = getWeatherMood(weather.weather_code, weather.is_day);
    const unit = currentUnit === "fahrenheit" ? "°F" : "°C";
    const date = new Date(`${weather.time.slice(0, 10)}T00:00:00Z`);
    const placeParts = [location.name, location.admin1, location.country].filter(Boolean);
    const uniquePlaceParts = placeParts.filter((part, index) => placeParts.indexOf(part) === index);

    document.body.dataset.theme = mood;
    document.querySelector("#city-name").textContent = uniquePlaceParts.join(", ");
    document.querySelector("#weather-date").textContent = new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "UTC"
    }).format(date);
    document.querySelector("#condition").textContent = weatherLabels[mood];
    const icon = document.querySelector("#condition-icon");
    icon.textContent = weatherIcons[mood];
    icon.setAttribute("aria-label", weatherLabels[mood]);
    document.querySelector("#temperature").textContent = displayTemperature(weather.temperature_2m);
    document.querySelector("#degree").textContent = unit;
    document.querySelector("#feels-like").textContent = displayTemperature(weather.apparent_temperature);
    document.querySelector("#feels-degree").textContent = unit;
    document.querySelector("#humidity").textContent = Math.round(weather.relative_humidity_2m);
    document.querySelector("#wind").textContent = Math.round(weather.wind_speed_10m);
    document.querySelector("#precipitation").textContent = Number(weather.precipitation).toFixed(1);

}

async function searchCity(city) {
    statusMessage.textContent = "Finding your forecast...";
    statusMessage.classList.add("is-loading");
    results.hidden = true;
    form.querySelector("button").disabled = true;

    try {
        const geocodingUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
        geocodingUrl.search = new URLSearchParams({
            name: city,
            count: "1",
            language: "en",
            format: "json"
        });
        const geocoding = await getJson(geocodingUrl);
        const location = geocoding.results?.[0];
        if (!location) {
            statusMessage.textContent = `We couldn't find "${city}". Try another city name.`;
            statusMessage.classList.remove("is-loading");
            return;
        }

        const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
        weatherUrl.search = new URLSearchParams({
            latitude: String(location.latitude),
            longitude: String(location.longitude),
            current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
            temperature_unit: "celsius",
            wind_speed_unit: "kmh",
            precipitation_unit: "mm",
            timezone: "auto"
        });
        const forecast = await getJson(weatherUrl);
        if (!forecast.current || !forecast.current.time) {
            throw new Error("The weather service returned incomplete data. Please try again.");
        }

        currentWeather = { location, weather: forecast.current };
        renderWeather();
        results.hidden = false;
        statusMessage.textContent = "";
    } catch (error) {
        statusMessage.textContent = error instanceof Error
            ? error.message
            : "We couldn't load the weather. Please try again.";
        document.body.dataset.theme = "default";
    } finally {
        statusMessage.classList.remove("is-loading");
        form.querySelector("button").disabled = false;
    }
}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    const city = searchInput.value.trim();
    if (city) searchCity(city);
});

unitButtons.forEach((button) => {
    button.addEventListener("click", () => {
        currentUnit = button.dataset.unit;
        renderWeather();
    });
});