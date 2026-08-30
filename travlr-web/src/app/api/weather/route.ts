import { NextResponse } from 'next/server'
import { getCurrentUser, unauthorizedResponse } from '@/lib/current-user'
import { getWeatherForecast, WeatherServiceError } from '@/lib/weather-service'
import { getPrismaClient } from '@/lib/prisma'
import { consumeRateLimitAsync, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit'

export async function GET(request: Request) {
    const currentUser = await getCurrentUser()
    if (!currentUser) return unauthorizedResponse()

    const rateLimit = await consumeRateLimitAsync(
        `weather:${currentUser.id}`,
        RATE_LIMITS.weather,
        getPrismaClient(),
    )
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit)

    const { searchParams } = new URL(request.url)
    const rawLocation = searchParams.get('location')?.trim()
    const location = rawLocation && rawLocation.length <= 200 ? rawLocation : undefined

    if (!location) {
        return NextResponse.json(
            { error: 'A valid location is required to load weather.', code: 'INVALID_LOCATION' },
            { status: 400 }
        )
    }

    try {
        const forecast = await getWeatherForecast(location)
        return NextResponse.json(forecast, {
            headers: {
                "Cache-Control": "private, max-age=300, stale-if-error=3600",
            },
        })
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
