// Weather service for fetching weather data
// Uses OpenWeatherMap API (free tier available)
// Falls back to mock data if no API key is configured

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

const WEATHER_CONDITIONS = ['sunny', 'cloudy', 'rainy', 'partly-cloudy', 'stormy', 'snowy'] as const

// Mock weather data generator for development
function generateMockForecast(location: string): WeatherForecast {
    const today = new Date()
    const daily: WeatherDay[] = []

    for (let i = 0; i < 10; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() + i)

        const tempHigh = Math.floor(Math.random() * 20) + 15 // 15-35
        const tempLow = tempHigh - Math.floor(Math.random() * 10) - 5 // 5-15 degrees lower
        const condition = WEATHER_CONDITIONS[Math.floor(Math.random() * WEATHER_CONDITIONS.length)]

        daily.push({
            date,
            tempHigh,
            tempLow,
            condition,
            humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
            precipitation: condition === 'rainy' || condition === 'stormy' ? Math.floor(Math.random() * 60) + 30 : Math.floor(Math.random() * 20),
            windSpeed: Math.floor(Math.random() * 30) + 5, // 5-35 km/h
            icon: getWeatherIcon(condition),
        })
    }

    return {
        location,
        current: {
            temp: daily[0].tempHigh - 3,
            condition: daily[0].condition,
            humidity: daily[0].humidity,
            windSpeed: daily[0].windSpeed,
        },
        daily,
    }
}

export function getWeatherIcon(condition: string): string {
    const icons: Record<string, string> = {
        'sunny': '☀️',
        'cloudy': '☁️',
        'rainy': '🌧️',
        'stormy': '⛈️',
        'snowy': '❄️',
        'partly-cloudy': '⛅',
    }
    return icons[condition] || '🌤️'
}

export async function getWeatherForecast(location: string): Promise<WeatherForecast> {
    const apiKey = process.env.OPENWEATHERMAP_API_KEY

    if (!apiKey) {
        // Return mock data if no API key
        console.log('No OpenWeatherMap API key found, using mock data')
        return generateMockForecast(location)
    }

    try {
        // First get coordinates from location name
        const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`
        const geoResponse = await fetch(geoUrl)
        const geoData = await geoResponse.json()

        if (!geoData.length) {
            return generateMockForecast(location)
        }

        const { lat, lon } = geoData[0]

        // Get 8-day forecast (free tier limit)
        const forecastUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,alerts&units=metric&appid=${apiKey}`
        const forecastResponse = await fetch(forecastUrl)
        const forecastData = await forecastResponse.json()

        const daily: WeatherDay[] = forecastData.daily.slice(0, 10).map((day: any) => ({
            date: new Date(day.dt * 1000),
            tempHigh: Math.round(day.temp.max),
            tempLow: Math.round(day.temp.min),
            condition: mapOpenWeatherCondition(day.weather[0].main),
            humidity: day.humidity,
            precipitation: Math.round((day.pop || 0) * 100),
            windSpeed: Math.round(day.wind_speed * 3.6), // m/s to km/h
            icon: getWeatherIcon(mapOpenWeatherCondition(day.weather[0].main)),
        }))

        return {
            location,
            current: {
                temp: Math.round(forecastData.current.temp),
                condition: mapOpenWeatherCondition(forecastData.current.weather[0].main),
                humidity: forecastData.current.humidity,
                windSpeed: Math.round(forecastData.current.wind_speed * 3.6),
            },
            daily,
        }
    } catch (error) {
        console.error('Error fetching weather:', error)
        return generateMockForecast(location)
    }
}

function mapOpenWeatherCondition(owmCondition: string): WeatherDay['condition'] {
    const mapping: Record<string, WeatherDay['condition']> = {
        'Clear': 'sunny',
        'Clouds': 'cloudy',
        'Rain': 'rainy',
        'Drizzle': 'rainy',
        'Thunderstorm': 'stormy',
        'Snow': 'snowy',
    }
    return mapping[owmCondition] || 'partly-cloudy'
}
