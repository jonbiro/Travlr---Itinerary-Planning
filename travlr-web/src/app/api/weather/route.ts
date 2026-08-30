import { NextResponse } from 'next/server'
import { getCurrentUser, unauthorizedResponse } from '@/lib/current-user'
import { getWeatherForecast, WeatherServiceError } from '@/lib/weather-service'
import { consumeRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit'

export async function GET(request: Request) {
    const currentUser = await getCurrentUser()
    if (!currentUser) return unauthorizedResponse()

    const rateLimit = consumeRateLimit(`weather:${currentUser.id}`, RATE_LIMITS.weather)
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit)

    const { searchParams } = new URL(request.url)
    const location = searchParams.get('location')?.trim()

    if (!location) {
        return NextResponse.json(
            { error: 'A location is required to load weather.', code: 'INVALID_LOCATION' },
            { status: 400 }
        )
    }

    try {
        const forecast = await getWeatherForecast(location)
        return NextResponse.json(forecast)
    } catch (error) {
        if (error instanceof WeatherServiceError) {
            return NextResponse.json(
                { error: error.message, code: error.code },
                { status: error.status },
            )
        }

        return NextResponse.json(
            {
                error: 'The weather provider is unavailable right now. Please try again later.',
                code: 'WEATHER_PROVIDER_ERROR',
            },
            { status: 502 },
        )
    }
}
