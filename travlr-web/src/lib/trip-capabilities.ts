/**
 * Serialize a trip for a caller who is already authorized to see it.
 *
 * Ownership is deliberately represented as a capability rather than exposing
 * the owner's database id to the browser. This keeps role checks server-owned
 * and gives clients one stable flag to use for owner-only controls.
 */
export function serializeTripWithOwnerCapability<T extends { userId: string }>(
    trip: T,
    currentUserId: string,
): Omit<T, "userId"> & { isOwner: boolean } {
    const { userId: ownerId, ...visibleTrip } = trip

    return {
        ...visibleTrip,
        isOwner: ownerId === currentUserId,
    }
}

/**
 * Reduce a trip for library cards while retaining the role capability. The
 * relation count is computed by Prisma so summary callers never need the
 * itinerary graph just to render a day count.
 */
export function serializeTripSummaryWithOwnerCapability<
    T extends { userId: string; _count: { days: number } },
>(trip: T, currentUserId: string) {
    const { _count, ...tripWithoutCount } = trip

    return serializeTripWithOwnerCapability(
        { ...tripWithoutCount, dayCount: _count.days },
        currentUserId,
    )
}
