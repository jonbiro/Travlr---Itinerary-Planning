import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { getWeatherForecast, WeatherServiceError } from "./weather-service"

const fetchMock = vi.fn()

function providerResponse(body: unknown, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
    }
}

beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
    vi.stubEnv("OPENWEATHERMAP_API_KEY", "test-key")
})

afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
})

describe("getWeatherForecast", () => {
    it("fails with a structured configuration error when the API key is missing", async () => {
        vi.stubEnv("OPENWEATHERMAP_API_KEY", "")

        await expect(getWeatherForecast("Paris, France")).rejects.toMatchObject({
            code: "WEATHER_NOT_CONFIGURED",
            status: 503,
        })
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it("returns a not-found error when geocoding finds no location", async () => {
        fetchMock.mockResolvedValueOnce(providerResponse([]))

        await expect(getWeatherForecast("Place That Does Not Exist")).rejects.toMatchObject({
            code: "LOCATION_NOT_FOUND",
            status: 404,
        })
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it("returns a provider error when the forecast request fails", async () => {
        fetchMock
            .mockResolvedValueOnce(providerResponse([{ lat: 48.8566, lon: 2.3522 }]))
            .mockResolvedValueOnce(providerResponse({ message: "upstream failure" }, 503))

        const request = getWeatherForecast("Paris, France")

        await expect(request).rejects.toMatchObject({
            code: "WEATHER_PROVIDER_ERROR",
            status: 502,
        })
        await expect(request).rejects.toBeInstanceOf(WeatherServiceError)
    })

    it("maps a live provider response without synthesizing values", async () => {
        fetchMock
            .mockResolvedValueOnce(providerResponse([{ lat: 48.8566, lon: 2.3522 }]))
            .mockResolvedValueOnce(providerResponse({
                current: {
                    temp: 18.4,
                    humidity: 61,
                    wind_speed: 4,
                    weather: [{ main: "Clear" }],
                },
                daily: [{
                    dt: 1_700_000_000,
                    temp: { max: 20.2, min: 12.1 },
                    humidity: 58,
                    wind_speed: 5,
                    pop: 0.2,
                    weather: [{ main: "Rain" }],
                }],
            }))

        await expect(getWeatherForecast("Paris, France")).resolves.toMatchObject({
            location: "Paris, France",
            current: {
                temp: 18,
                condition: "sunny",
                humidity: 61,
                windSpeed: 14,
            },
            daily: [{
                tempHigh: 20,
                tempLow: 12,
                condition: "rainy",
                precipitation: 20,
                windSpeed: 18,
            }],
        })
    })
})
