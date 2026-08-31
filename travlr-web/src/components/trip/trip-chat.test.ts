import { describe, expect, it } from "vitest"
import type { UIDataTypes, UIMessagePart, UITools } from "ai"

import type { Trip } from "@/lib/types/trip"
import { collectNewItineraryToolResults } from "./trip-chat"

function itineraryToolPart(
    state: "input-available" | "output-available",
    toolCallId = "call-1",
    updatedTrip?: Trip,
): UIMessagePart<UIDataTypes, UITools> {
    return {
        type: "tool-updateItinerary",
        toolCallId,
        state,
        input: {},
        ...(updatedTrip ? { output: { updatedTrip } } : {}),
    } as UIMessagePart<UIDataTypes, UITools>
}

describe("collectNewItineraryToolResults", () => {
    it("rechecks only the streamed tail and emits an itinerary result once", () => {
        const updatedTrip = { id: "trip-1" } as Trip
        const assistantMessage = {
            id: "assistant-1",
            role: "assistant",
            parts: [itineraryToolPart("input-available")],
        }
        const handledToolCalls = new Set<string>()
        const initial = collectNewItineraryToolResults(
            [assistantMessage],
            "trip-1",
            { tripId: "trip-1", nextMessageIndex: 0, tailMessageId: null, ignoredMessageIds: new Set() },
            handledToolCalls,
        )

        expect(initial.updates).toEqual([])

        const streamedMessage = {
            ...assistantMessage,
            parts: [itineraryToolPart("output-available", "call-1", updatedTrip)],
        }
        const completed = collectNewItineraryToolResults(
            [streamedMessage],
            "trip-1",
            initial.cursor,
            handledToolCalls,
        )

        expect(completed.updates).toEqual([{ toolCallId: "call-1", updatedTrip }])
        expect(completed.newToolCallIds).toEqual(["call-1"])

        handledToolCalls.add("call-1")
        const replayed = collectNewItineraryToolResults(
            [streamedMessage],
            "trip-1",
            completed.cursor,
            handledToolCalls,
        )

        expect(replayed.updates).toEqual([])
    })

    it("resets the cursor without replaying old-trip tool results", () => {
        const oldTrip = { id: "trip-1" } as Trip
        const oldMessages = [{
            id: "assistant-1",
            role: "assistant",
            parts: [itineraryToolPart("output-available", "old-call", oldTrip)],
        }]

        const reset = collectNewItineraryToolResults(
            oldMessages,
            "trip-2",
            {
                tripId: "trip-1",
                nextMessageIndex: oldMessages.length,
                tailMessageId: "assistant-1",
                ignoredMessageIds: new Set(),
            },
            new Set(["old-call"]),
        )

        expect(reset.reset).toBe(true)
        expect(reset.updates).toEqual([])
        expect(reset.cursor).toEqual({
            tripId: "trip-2",
            nextMessageIndex: 1,
            tailMessageId: "assistant-1",
            ignoredMessageIds: new Set(["assistant-1"]),
        })

        const newMessage = {
            id: "assistant-2",
            role: "assistant",
            parts: [itineraryToolPart("output-available", "new-call", { id: "trip-2" } as Trip)],
        }
        const newTripUpdate = collectNewItineraryToolResults(
            [...oldMessages, newMessage],
            "trip-2",
            reset.cursor,
            new Set(),
        )

        expect(newTripUpdate.updates).toEqual([{
            toolCallId: "new-call",
            updatedTrip: { id: "trip-2" },
        }])
    })
})
