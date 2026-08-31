import type { PrismaClient } from "@prisma/client"
import { describe, expect, it, vi } from "vitest"

import { PRODUCT_LIMITS } from "@/lib/product-limits"
import { persistItineraryChange } from "./trip-itinerary"

const tripRow = {
    id: "trip-1",
    startDate: new Date("2026-09-10T00:00:00.000Z"),
    endDate: new Date("2026-09-12T00:00:00.000Z"),
}

function createPrismaMock({
    queryResult = [tripRow],
    totalActivityCount = 0,
}: {
    queryResult?: typeof tripRow[]
    totalActivityCount?: number
} = {}) {
    const tx = {
        $queryRaw: vi.fn().mockResolvedValue(queryResult),
        day: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({
                id: "day-2",
                activities: [],
            }),
        },
        itineraryItem: {
            count: vi.fn().mockResolvedValue(totalActivityCount),
            create: vi.fn().mockResolvedValue({ id: "activity-1" }),
        },
    }

    const prisma = {
        $transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx)),
    } as unknown as PrismaClient

    return { prisma, tx }
}

const addChange = {
    day: 2,
    action: "add" as const,
    activity: {
        name: "Visit the museum",
        description: "See the main collection",
        time: "10:00 AM",
        location: "Central Museum",
    },
}

describe("persistItineraryChange", () => {
    it("locks the parent Trip row with FOR UPDATE before reading the itinerary", async () => {
        const { prisma, tx } = createPrismaMock({ queryResult: [] })

        await expect(
            persistItineraryChange(prisma, "trip-1", "owner-1", addChange),
        ).resolves.toMatchObject({ status: "not-found" })

        expect(tx.$queryRaw).toHaveBeenCalledTimes(1)
        const lockQuery = tx.$queryRaw.mock.calls[0]?.[0] as {
            strings: string[]
            values: unknown[]
        }
        expect(lockQuery.strings.join(""))
            .toContain("FOR UPDATE")
        expect(lockQuery.values).toEqual(["trip-1", "owner-1"])
        expect(tx.day.findUnique).not.toHaveBeenCalled()
    })

    it("rejects an add at the trip activity limit without creating a missing Day", async () => {
        const { prisma, tx } = createPrismaMock({
            totalActivityCount: PRODUCT_LIMITS.maxActivitiesPerTrip,
        })

        await expect(
            persistItineraryChange(prisma, "trip-1", "owner-1", addChange),
        ).resolves.toEqual({
            status: "limit-reached",
            message: `This trip already has the maximum of ${PRODUCT_LIMITS.maxActivitiesPerTrip} activities.`,
        })

        expect(tx.day.create).not.toHaveBeenCalled()
        expect(tx.itineraryItem.create).not.toHaveBeenCalled()
    })

    it("creates a missing Day and its activity for a valid add", async () => {
        const { prisma, tx } = createPrismaMock()

        await expect(
            persistItineraryChange(prisma, "trip-1", "owner-1", addChange),
        ).resolves.toEqual({
            status: "updated",
            message: "Added Visit the museum to Day 2.",
        })

        expect(tx.day.create).toHaveBeenCalledWith({
            data: {
                tripId: "trip-1",
                dayNumber: 2,
                date: new Date("2026-09-11T00:00:00.000Z"),
                theme: "New Day",
            },
            include: { activities: true },
        })
        expect(tx.itineraryItem.create).toHaveBeenCalledWith({
            data: {
                dayId: "day-2",
                order: 0,
                name: "Visit the museum",
                description: "See the main collection",
                startTime: "10:00 AM",
                location: "Central Museum",
            },
        })
    })
})
