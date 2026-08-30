import { describe, expect, it } from 'vitest'

import { formatWeatherDate } from './weather-forecast'

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
