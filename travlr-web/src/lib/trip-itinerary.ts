import type { PrismaClient } from "@prisma/client"
import { z } from "zod"
import { PRODUCT_LIMITS } from "@/lib/product-limits"

export const itineraryActivitySchema = z.object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000),
    time: z.string().trim().min(1).max(100),
    location: z.string().trim().max(500),
}).strict()

export const itineraryChangeSchema = z.object({
    day: z.number().int().positive().max(PRODUCT_LIMITS.maxTripDays),
    action: z.enum(["add", "remove", "replace"]),
    activity: itineraryActivitySchema,
}).strict()

export type ItineraryChange = z.infer<typeof itineraryChangeSchema>

type PersistItineraryResult =
    | { status: "updated"; message: string }
    | { status: "not-found" | "day-not-found" | "invalid-day" | "not-changed" | "limit-reached"; message: string }

function tripDayCount(startDate: Date | null, endDate: Date | null) {
    if (!startDate || !endDate) return null

    const start = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())
    const end = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())
    const count = Math.floor((end - start) / 86_400_000) + 1

    return count > 0 ? count : 0
}

function dateForDay(startDate: Date | null, day: number) {
    const date = startDate ? new Date(startDate) : new Date()
    date.setUTCDate(date.getUTCDate() + day - 1)
    return date
}

function activityData(activity: ItineraryChange["activity"]) {
    return {
        name: activity.name,
        description: activity.description,
        startTime: activity.time,
        location: activity.location,
    }
}

/**
 * Persist one assistant-requested itinerary change for the signed-in user's
 * trip.
 * The caller must pass the trip id from the current trip context; the trip is
 * looked up by owner inside the transaction so a crafted chat payload cannot
 * edit another user's itinerary.
 */
export async function persistItineraryChange(
    prisma: PrismaClient,
    tripId: string,
    userId: string,
    change: ItineraryChange,
): Promise<PersistItineraryResult> {
    return prisma.$transaction(async (tx) => {
        const trip = await tx.trip.findFirst({
            where: { id: tripId, userId },
            select: { id: true, startDate: true, endDate: true },
        })

        if (!trip) {
            return { status: "not-found", message: "That trip could not be found or is not editable." }
        }

        const totalDays = tripDayCount(trip.startDate, trip.endDate)
        if (totalDays !== null && change.day > totalDays) {
            return {
                status: "invalid-day",
                message: `Day ${change.day} is outside this trip's ${totalDays}-day range.`,
            }
        }

        let day = await tx.day.findUnique({
            where: {
                tripId_dayNumber: {
                    tripId: trip.id,
                    dayNumber: change.day,
                },
            },
            include: {
                activities: {
                    orderBy: { order: "asc" },
                    take: PRODUCT_LIMITS.maxActivitiesPerDay + 1,
                },
            },
        })

        if (!day && change.action !== "add") {
            return {
                status: "day-not-found",
                message: `Day ${change.day} does not have an itinerary to update.`,
            }
        }

        if (!day) {
            day = await tx.day.create({
                data: {
                    tripId: trip.id,
                    dayNumber: change.day,
                    date: dateForDay(trip.startDate, change.day),
                    theme: "New Day",
                },
                include: {
                    activities: true,
                },
            })
        }

        if (change.action === "add") {
            const totalActivityCount = await tx.itineraryItem.count({
                where: { day: { tripId: trip.id } },
            })
            if (totalActivityCount >= PRODUCT_LIMITS.maxActivitiesPerTrip) {
                return {
                    status: "limit-reached",
                    message: `This trip already has the maximum of ${PRODUCT_LIMITS.maxActivitiesPerTrip} activities.`,
                }
            }

            if (day.activities.length >= PRODUCT_LIMITS.maxActivitiesPerDay) {
                return {
                    status: "limit-reached",
                    message: `Day ${change.day} already has the maximum of ${PRODUCT_LIMITS.maxActivitiesPerDay} activities.`,
                }
            }

            const nextOrder = day.activities.reduce(
                (highest, activity) => Math.max(highest, activity.order),
                -1,
            ) + 1

            await tx.itineraryItem.create({
                data: {
                    dayId: day.id,
                    order: nextOrder,
                    ...activityData(change.activity),
                },
            })

            return {
                status: "updated",
                message: `Added ${change.activity.name} to Day ${change.day}.`,
            }
        }

        const matchingActivities = day.activities.filter(
            (activity) => activity.name === change.activity.name,
        )

        if (matchingActivities.length === 0) {
            return {
                status: "not-changed",
                message: `I couldn't find ${change.activity.name} on Day ${change.day}.`,
            }
        }

        if (change.action === "remove") {
            await tx.itineraryItem.deleteMany({
                where: {
                    id: { in: matchingActivities.map((activity) => activity.id) },
                },
            })

            return {
                status: "updated",
                message: `Removed ${change.activity.name} from Day ${change.day}.`,
            }
        }

        await tx.itineraryItem.update({
            where: { id: matchingActivities[0].id },
            data: activityData(change.activity),
        })

        return {
            status: "updated",
            message: `Updated ${change.activity.name} on Day ${change.day}.`,
        }
    })
}
