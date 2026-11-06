import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { formatWeatherDate, WeatherForecastComponent } from './weather-forecast'

afterEach(() => vi.unstubAllGlobals())

describe('weather destination changes', () => {
    it('aborts the previous request and ignores its late authorization error', async () => {
        let resolveOld!: (value: { ok: boolean; status: number; json: () => Promise<unknown> }) => void
        const fetchMock = vi.fn()
            .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
            .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'New destination unavailable' }) })
        vi.stubGlobal('fetch', fetchMock)
        const { rerender } = render(<WeatherForecastComponent destination="Paris" />)
        const oldSignal = (fetchMock.mock.calls[0][1] as { signal: AbortSignal }).signal
        rerender(<WeatherForecastComponent destination="Tokyo" />)
        expect(oldSignal.aborted).toBe(true)
        await screen.findByText('New destination unavailable')
        await act(async () => { resolveOld({ ok: false, status: 401, json: async () => ({}) }) })
        expect(screen.getByText('New destination unavailable')).toBeInTheDocument()
        expect(screen.queryByText('Sign in to see the forecast')).not.toBeInTheDocument()
        rerender(<WeatherForecastComponent />)
        expect(screen.getByText('Create or select a trip to see weather forecasts')).toBeInTheDocument()
        expect(screen.queryByText('New destination unavailable')).not.toBeInTheDocument()
    })
})

describe('formatWeatherDate', () => {
    it('uses the destination timezone instead of the viewer timezone', () => {
        // This instant is still August 30 in Los Angeles, but already August 31
        // in Tokyo. The forecast label must use the latter.
        const instant = new Date('2026-08-30T16:30:00.000Z')

        expect(formatWeatherDate(instant, 'Asia/Tokyo', 32_400)).toEqual({
            day: 'Mon',
            date: '8/31',
        })
    })

    it('falls back to the provider offset when a timezone identifier is unavailable', () => {
        const instant = new Date('2026-08-30T16:30:00.000Z')

        expect(formatWeatherDate(instant, 'Not/A_Timezone', 32_400)).toEqual({
            day: 'Mon',
            date: '8/31',
        })
    })
})
