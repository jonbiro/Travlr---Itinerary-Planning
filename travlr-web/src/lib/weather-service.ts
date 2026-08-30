// Weather service for fetching live forecasts from OpenWeatherMap.

export interface WeatherDay {
    date: Date
    tempHigh: number
    tempLow: number
    condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'partly-cloudy'
    humidity: number
    precipitation: number // percentage
    windSpeed: number // km/h
    icon: string
}

export interface WeatherForecast {
    location: string
    current: {
        temp: number
        condition: string
        humidity: number
        windSpeed: number
    }
    daily: WeatherDay[]
}

export type WeatherErrorCode =
    | 'WEATHER_NOT_CONFIGURED'
    | 'INVALID_LOCATION'
    | 'LOCATION_NOT_FOUND'
    | 'WEATHER_PROVIDER_ERROR'
    | 'WEATHER_PROVIDER_RESPONSE_INVALID'

export class WeatherServiceError extends Error {
    readonly code: WeatherErrorCode
    readonly status: 400 | 404 | 502 | 503

    constructor(
        code: WeatherErrorCode,
        status: 400 | 404 | 502 | 503,
        message: string,
        options?: { cause?: unknown },
    ) {
        super(message, options)
        this.name = 'WeatherServiceError'
        this.code = code
        this.status = status
    }
}

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value)
}

function providerError(message: string, options?: { cause?: unknown }) {
    return new WeatherServiceError('WEATHER_PROVIDER_ERROR', 502, message, options)
}

function invalidProviderResponse(options?: { cause?: unknown }) {
    return new WeatherServiceError(
        'WEATHER_PROVIDER_RESPONSE_INVALID',
        502,
        'The weather provider returned an invalid response. Please try again later.',
        options,
    )
}

async function fetchProviderJson(url: string): Promise<unknown> {
    let response: Response

    try {
        response = await fetch(url, {
            signal: AbortSignal.timeout(10_000),
        })
    } catch (error) {
        throw providerError('The weather provider is unavailable right now. Please try again later.', { cause: error })
    }

    let data: unknown
    try {
        data = await response.json()
    } catch (error) {
        throw invalidProviderResponse({ cause: error })
    }

    if (!response.ok) {
        throw providerError('The weather provider could not fulfill the request. Please try again later.')
    }

    return data
}

export function getWeatherIcon(condition: string): string {
    const icons: Record<string, string> = {
        sunny: '☀️',
        cloudy: '☁️',
        rainy: '🌧️',
        stormy: '⛈️',
        snowy: '❄️',
        'partly-cloudy': '⛅',
    }
    return icons[condition] || '🌤️'
}

export async function getWeatherForecast(location: string): Promise<WeatherForecast> {
    const apiKey = process.env.OPENWEATHERMAP_API_KEY?.trim()

    if (!apiKey) {
        throw new WeatherServiceError(
            'WEATHER_NOT_CONFIGURED',
            503,
            'Weather forecasts are not configured. Add OPENWEATHERMAP_API_KEY to enable them.',
        )
    }

    const normalizedLocation = location.trim()
    if (!normalizedLocation) {
        throw new WeatherServiceError('INVALID_LOCATION', 400, 'A location is required to load weather.')
    }

    // First get coordinates from the location name.
    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(normalizedLocation)}&limit=1&appid=${apiKey}`
    const geoData = await fetchProviderJson(geoUrl)

    if (!Array.isArray(geoData)) {
        throw invalidProviderResponse()
    }

    const firstLocation = geoData[0]
    if (firstLocation === undefined) {
        throw new WeatherServiceError(
            'LOCATION_NOT_FOUND',
            404,
            `No weather location was found for “${normalizedLocation}”.`,
        )
    }

    if (
        !isRecord(firstLocation)
        || !isFiniteNumber(firstLocation.lat)
        || !isFiniteNumber(firstLocation.lon)
    ) {
        throw invalidProviderResponse()
    }

    const { lat, lon } = firstLocation

    // Get the available daily forecast (up to ten days, depending on the plan).
    const forecastUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,alerts&units=metric&appid=${apiKey}`
    const forecastData = await fetchProviderJson(forecastUrl)

    try {
        if (!isRecord(forecastData) || !isRecord(forecastData.current) || !Array.isArray(forecastData.daily)) {
            throw invalidProviderResponse()
        }

        const current = parseCurrentWeather(forecastData.current)
        const daily = forecastData.daily.slice(0, 10).map(parseWeatherDay)

        if (daily.length === 0) {
            throw invalidProviderResponse()
        }

        return {
            location: normalizedLocation,
            current,
            daily,
        }
    } catch (error) {
        if (error instanceof WeatherServiceError) throw error
        throw invalidProviderResponse({ cause: error })
    }
}

function parseCurrentWeather(value: JsonRecord): WeatherForecast['current'] {
    const weather = value.weather
    const firstWeather = Array.isArray(weather) ? weather[0] : undefined

    if (
        !isFiniteNumber(value.temp)
        || !isFiniteNumber(value.humidity)
        || !isFiniteNumber(value.wind_speed)
        || !isRecord(firstWeather)
        || typeof firstWeather.main !== 'string'
    ) {
        throw invalidProviderResponse()
    }

    return {
        temp: Math.round(value.temp),
        condition: mapOpenWeatherCondition(firstWeather.main),
        humidity: value.humidity,
        windSpeed: Math.round(value.wind_speed * 3.6),
    }
}

function parseWeatherDay(value: unknown): WeatherDay {
    if (!isRecord(value)) throw invalidProviderResponse()

    const weather = value.weather
    const firstWeather = Array.isArray(weather) ? weather[0] : undefined
    if (
        !isFiniteNumber(value.dt)
        || !isRecord(value.temp)
        || !isFiniteNumber(value.temp.max)
        || !isFiniteNumber(value.temp.min)
        || !isRecord(firstWeather)
        || typeof firstWeather.main !== 'string'
        || !isFiniteNumber(value.humidity)
        || !isFiniteNumber(value.wind_speed)
    ) {
        throw invalidProviderResponse()
    }

    const condition = mapOpenWeatherCondition(firstWeather.main)

    return {
        date: new Date(value.dt * 1000),
        tempHigh: Math.round(value.temp.max),
        tempLow: Math.round(value.temp.min),
        condition,
        humidity: value.humidity,
        precipitation: isFiniteNumber(value.pop) ? Math.round(value.pop * 100) : 0,
        windSpeed: Math.round(value.wind_speed * 3.6),
        icon: getWeatherIcon(condition),
    }
}

function mapOpenWeatherCondition(owmCondition: string): WeatherDay['condition'] {
    const mapping: Record<string, WeatherDay['condition']> = {
        Clear: 'sunny',
        Clouds: 'cloudy',
        Rain: 'rainy',
        Drizzle: 'rainy',
        Thunderstorm: 'stormy',
        Snow: 'snowy',
    }
    return mapping[owmCondition] || 'partly-cloudy'
}
