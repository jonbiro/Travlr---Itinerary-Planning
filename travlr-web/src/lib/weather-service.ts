// Weather service for fetching live forecasts from OpenWeatherMap.

export interface WeatherDay {
    date: Date
    tempHigh: number
    tempLow: number
    condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'partly-cloudy'
    humidity: number
    precipitation: number // percentage
    windSpeed: number // km/h
}

export interface WeatherForecast {
    location: string
    /** IANA timezone for the forecast location, as returned by OpenWeather. */
    timezone: string
    /** Current UTC offset for the forecast location, in seconds. */
    timezoneOffset: number
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

const WEATHER_CACHE_TTL_MS = 10 * 60 * 1_000
const WEATHER_STALE_TTL_MS = 60 * 60 * 1_000
const WEATHER_CACHE_MAX_ENTRIES = 500

type WeatherCacheEntry = {
    forecast: WeatherForecast
    expiresAt: number
    staleUntil: number
}

const weatherCache = new Map<string, WeatherCacheEntry>()

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

function cloneForecast(forecast: WeatherForecast): WeatherForecast {
    return {
        ...forecast,
        current: { ...forecast.current },
        daily: forecast.daily.map((day) => ({
            ...day,
            date: new Date(day.date),
        })),
    }
}

function pruneWeatherCache(now: number) {
    for (const [key, entry] of weatherCache) {
        if (entry.staleUntil <= now) weatherCache.delete(key)
    }

    if (weatherCache.size <= WEATHER_CACHE_MAX_ENTRIES) return

    const oldest = [...weatherCache.entries()]
        .sort(([, first], [, second]) => first.expiresAt - second.expiresAt)
    for (const [key] of oldest.slice(0, weatherCache.size - WEATHER_CACHE_MAX_ENTRIES)) {
        weatherCache.delete(key)
    }
}

/** Clear weather cache state between unit tests or a deliberate refresh. */
export function clearWeatherCache() {
    weatherCache.clear()
}

async function fetchProviderJson(url: string, signal?: AbortSignal): Promise<unknown> {
    let response: Response

    try {
        response = await fetch(url, {
            signal: signal
                ? AbortSignal.any([signal, AbortSignal.timeout(10_000)])
                : AbortSignal.timeout(10_000),
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

export async function getWeatherForecast(location: string, signal?: AbortSignal): Promise<WeatherForecast> {
    const apiKey = process.env.OPENWEATHERMAP_API_KEY?.trim()

    if (!apiKey) {
        throw new WeatherServiceError(
            'WEATHER_NOT_CONFIGURED',
            503,
            'Weather forecasts are not configured. Add OPENWEATHERMAP_API_KEY to enable them.',
        )
    }

    const normalizedLocation = location.trim()
    if (!normalizedLocation || normalizedLocation.length > 200) {
        throw new WeatherServiceError('INVALID_LOCATION', 400, 'A location is required to load weather.')
    }

    const cacheKey = normalizedLocation.toLocaleLowerCase()
    const now = Date.now()
    pruneWeatherCache(now)
    const cached = weatherCache.get(cacheKey)
    if (cached && cached.expiresAt > now) return cloneForecast(cached.forecast)

    try {
        // First get coordinates from the location name.
        const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(normalizedLocation)}&limit=1&appid=${apiKey}`
        const geoData = await fetchProviderJson(geoUrl, signal)

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
        const forecastData = await fetchProviderJson(forecastUrl, signal)

        try {
            if (!isRecord(forecastData) || !isRecord(forecastData.current) || !Array.isArray(forecastData.daily)) {
                throw invalidProviderResponse()
            }

            const { timezone, timezoneOffset } = parseForecastTimezone(forecastData)
            const current = parseCurrentWeather(forecastData.current)
            const daily = forecastData.daily.slice(0, 10).map(parseWeatherDay)

            if (daily.length === 0) {
                throw invalidProviderResponse()
            }

            const forecast = {
                location: normalizedLocation,
                timezone,
                timezoneOffset,
                current,
                daily,
            }
            weatherCache.set(cacheKey, {
                forecast,
                expiresAt: Date.now() + WEATHER_CACHE_TTL_MS,
                staleUntil: Date.now() + WEATHER_STALE_TTL_MS,
            })
            pruneWeatherCache(Date.now())
            return cloneForecast(forecast)
        } catch (error) {
            if (error instanceof WeatherServiceError) throw error
            throw invalidProviderResponse({ cause: error })
        }
    } catch (error) {
        if (
            cached
            && cached.staleUntil > Date.now()
            && error instanceof WeatherServiceError
            && (error.code === "WEATHER_PROVIDER_ERROR" || error.code === "WEATHER_PROVIDER_RESPONSE_INVALID")
        ) {
            return cloneForecast(cached.forecast)
        }
        throw error
    }
}

function parseForecastTimezone(value: JsonRecord): Pick<WeatherForecast, 'timezone' | 'timezoneOffset'> {
    // OpenWeather includes both fields on One Call responses. Keep a UTC fallback
    // for older/mocked responses, while still rejecting malformed values when a
    // provider response explicitly includes either field.
    if (
        ('timezone' in value && (typeof value.timezone !== 'string' || value.timezone.trim().length === 0))
        || ('timezone_offset' in value && !isFiniteNumber(value.timezone_offset))
    ) {
        throw invalidProviderResponse()
    }

    return {
        timezone: typeof value.timezone === 'string' ? value.timezone : 'UTC',
        timezoneOffset: isFiniteNumber(value.timezone_offset) ? value.timezone_offset : 0,
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
