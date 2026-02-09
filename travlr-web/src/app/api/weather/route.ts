import { NextResponse } from 'next/server'
import { getWeatherForecast } from '@/lib/weather-service'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get('location')

    if (!location) {
        return NextResponse.json(
            { error: 'Location parameter is required' },
            { status: 400 }
        )
    }

    try {
        const forecast = await getWeatherForecast(location)
        return NextResponse.json(forecast)
    } catch (error) {
        console.error('Weather API error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch weather data' },
            { status: 500 }
        )
    }
}
