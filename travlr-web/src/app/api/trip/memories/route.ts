import { NextResponse } from "next/server"

// Mock memory storage (in production, use Prisma)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockMemories: Map<string, any[]> = new Map()

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const tripId = searchParams.get("tripId")

    if (!tripId) {
        return NextResponse.json({ error: "tripId is required" }, { status: 400 })
    }

    // Get memories for trip
    const tripMemories = mockMemories.get(tripId) || []

    return NextResponse.json({ memories: tripMemories })
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { tripId, type, title, description, content, fileUrl, date, location } = body

        if (!tripId || !title || !type) {
            return NextResponse.json(
                { error: "tripId, title, and type are required" },
                { status: 400 }
            )
        }

        // Create memory
        const memory = {
            id: `memory-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            tripId,
            type,
            title,
            description,
            content,
            fileUrl,
            date: new Date(date),
            location,
            createdAt: new Date(),
        }

        // Get existing memories for trip
        const tripMemories = mockMemories.get(tripId) || []
        tripMemories.unshift(memory)
        mockMemories.set(tripId, tripMemories)

        return NextResponse.json(memory)
    } catch (error) {
        console.error("Failed to create memory:", error)
        return NextResponse.json({ error: "Failed to create memory" }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
        return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

    // Find and delete memory
    for (const [tripId, memories] of mockMemories.entries()) {
        const index = memories.findIndex(m => m.id === id)
        if (index !== -1) {
            memories.splice(index, 1)
            mockMemories.set(tripId, memories)
            return NextResponse.json({ success: true })
        }
    }

    return NextResponse.json({ error: "Memory not found" }, { status: 404 })
}
