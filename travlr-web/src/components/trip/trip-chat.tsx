"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useChat } from "@ai-sdk/react"
import {
    DefaultChatTransport,
    getToolName,
    isToolUIPart,
    type UIDataTypes,
    type UIMessagePart,
    type UITools,
} from "ai"
import { Check, Loader2, MapPin, RefreshCw, Send, X } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Trip } from "@/lib/types/trip"
import { cn } from "@/lib/utils"

interface TripChatProps {
    trip?: Trip | null
    onTripUpdate?: (trip: Trip) => void
}

type AuthState = "auth" | "setup"

type ChatMessageSnapshot = {
    id: string
    role: string
    parts: readonly UIMessagePart<UIDataTypes, UITools>[]
}

type MessageCursor = {
    tripId: string | null
    nextMessageIndex: number
    tailMessageId: string | null
    ignoredMessageIds: ReadonlySet<string>
}

type ItineraryToolUpdate = {
    toolCallId: string
    updatedTrip: Trip
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseErrorPayload(message: string): Record<string, unknown> | null {
    try {
        const payload: unknown = JSON.parse(message)
        return isRecord(payload) ? payload : null
    } catch {
        return null
    }
}

function classifyChatAuthError(error: Error | undefined): AuthState | null {
    if (!error) return null

    const directPayload = isRecord(error) ? error : null
    const messagePayload = parseErrorPayload(error.message)
    const payload = directPayload?.code || directPayload?.authConfigured !== undefined
        ? directPayload
        : messagePayload

    if (payload?.code === "AUTH_NOT_CONFIGURED" || payload?.authConfigured === false) return "setup"
    if (payload?.code === "AUTH_REQUIRED") return "auth"

    const message = error.message.toLowerCase()
    if (message.includes("authentication is not configured") || message.includes("sign-in is not configured")) {
        return "setup"
    }
    if (message.includes("authentication required") || message.includes("sign in") || message.includes("unauthor")) {
        return "auth"
    }

    return null
}

export function collectNewItineraryToolResults(
    messages: readonly ChatMessageSnapshot[],
    currentTripId: string | null,
    cursor: MessageCursor,
    handledToolCalls: ReadonlySet<string>,
): {
    updates: ItineraryToolUpdate[]
    newToolCallIds: string[]
    cursor: MessageCursor
    reset: boolean
} {
    if (cursor.tripId !== currentTripId) {
        return {
            updates: [],
            newToolCallIds: [],
            cursor: {
                tripId: currentTripId,
                nextMessageIndex: messages.length,
                tailMessageId: messages[messages.length - 1]?.id ?? null,
                ignoredMessageIds: new Set(messages.map((message) => message.id)),
            },
            reset: true,
        }
    }

    const previousMessageCount = cursor.nextMessageIndex
    const previousTailAtIndex = previousMessageCount > 0
        ? messages[previousMessageCount - 1]?.id ?? null
        : null
    const messageListWasReplaced = previousMessageCount > messages.length
        || (previousMessageCount > 0 && previousTailAtIndex !== cursor.tailMessageId)
    // The active assistant message is updated in place while it streams. Keep
    // a one-message overlap so an input part can be revisited when it becomes
    // an output, without rescanning the completed conversation.
    const startIndex = messageListWasReplaced
        ? 0
        : Math.max(0, previousMessageCount - 1)
    const seenToolCalls = new Set(handledToolCalls)
    const updates: ItineraryToolUpdate[] = []
    const newToolCallIds: string[] = []

    for (const message of messages.slice(startIndex)) {
        if (cursor.ignoredMessageIds.has(message.id)) continue
        if (message.role !== "assistant") continue

        for (const part of message.parts) {
            if (!isToolUIPart(part) || getToolName(part) !== "updateItinerary") continue
            if (part.state !== "output-available" || seenToolCalls.has(part.toolCallId)) continue
            if (!isRecord(part.output) || !isRecord(part.output.updatedTrip)) continue

            seenToolCalls.add(part.toolCallId)
            newToolCallIds.push(part.toolCallId)
            updates.push({
                toolCallId: part.toolCallId,
                updatedTrip: part.output.updatedTrip as unknown as Trip,
            })
        }
    }

    return {
        updates,
        newToolCallIds,
        cursor: {
            tripId: currentTripId,
            nextMessageIndex: messages.length,
            tailMessageId: messages[messages.length - 1]?.id ?? null,
            ignoredMessageIds: cursor.ignoredMessageIds,
        },
        reset: false,
    }
}

export function TripChat({ trip, onTripUpdate }: TripChatProps) {
    const [input, setInput] = useState("")
    const [authState, setAuthState] = useState<AuthState | null>(null)
    const handledToolCalls = useRef(new Set<string>())
    const pendingTripUpdates = useRef(new Map<string, Trip>())
    const currentTripId = trip?.id ?? null
    const messageCursor = useRef<MessageCursor>({
        tripId: currentTripId,
        nextMessageIndex: 0,
        tailMessageId: null,
        ignoredMessageIds: new Set(),
    })
    const onTripUpdateRef = useRef(onTripUpdate)
    const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), [])
    const { error, messages, regenerate, sendMessage, status } = useChat({ transport })
    const isLoading = status === "submitted" || status === "streaming"

    useEffect(() => {
        setAuthState(classifyChatAuthError(error))
    }, [error])

    useEffect(() => {
        const result = collectNewItineraryToolResults(
            messages,
            currentTripId,
            messageCursor.current,
            handledToolCalls.current,
        )

        messageCursor.current = result.cursor
        if (result.reset) {
            // Do not replay results that belong to the previous trip if the
            // chat hook keeps its message history while the trip changes.
            handledToolCalls.current.clear()
            pendingTripUpdates.current.clear()
            return
        }

        for (const toolCallId of result.newToolCallIds) {
            handledToolCalls.current.add(toolCallId)
        }
        for (const update of result.updates) {
            pendingTripUpdates.current.set(update.toolCallId, update.updatedTrip)
        }

        const updateTrip = onTripUpdateRef.current
        if (!updateTrip) return

        for (const [toolCallId, updatedTrip] of pendingTripUpdates.current) {
            pendingTripUpdates.current.delete(toolCallId)
            updateTrip(updatedTrip)
        }
    }, [currentTripId, messages])

    useEffect(() => {
        onTripUpdateRef.current = onTripUpdate
        if (!onTripUpdate) return

        for (const [toolCallId, updatedTrip] of pendingTripUpdates.current) {
            pendingTripUpdates.current.delete(toolCallId)
            onTripUpdate(updatedTrip)
        }
    }, [onTripUpdate])

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const message = input.trim()
        if (!message || isLoading) return

        void sendMessage({ text: message }, { body: { trip } })
        setInput("")
    }

    return (
        <div className="flex h-full flex-col">
            <ScrollArea className="flex-1 p-4" role="log" aria-label="Trip assistant conversation" aria-live="polite">
                {messages.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
                        <MapPin className="mb-4 h-10 w-10 opacity-50" aria-hidden="true" />
                        <p className="text-lg font-medium">Trip Assistant</p>
                        <p className="text-sm">Ask me about weather, activities, or local tips.</p>
                        <p className="mt-2 max-w-xs text-xs">Trip members can ask questions; itinerary changes can only be applied by the trip owner.</p>
                    </div>
                )}

                <div className="space-y-4">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={cn(
                                "flex gap-3 text-sm",
                                message.role === "user" ? "justify-end" : "justify-start",
                            )}
                        >
                            {message.role === "assistant" && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback aria-label="Trip assistant">AI</AvatarFallback>
                                </Avatar>
                            )}

                            <div
                                className={cn(
                                    "max-w-[80%] rounded-lg px-3 py-2",
                                    message.role === "user"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted",
                                )}
                            >
                                {message.parts.map((part, index) => {
                                    if (part.type === "text") {
                                        return <p key={`${message.id}-text-${index}`} className="whitespace-pre-wrap">{part.text}</p>
                                    }

                                    if (!isToolUIPart(part)) return null

                                    const toolName = getToolName(part)
                                    if (toolName === "updateItinerary") {
                                        if (part.state === "output-available" && isRecord(part.output)) {
                                            const success = part.output.success === true
                                            return (
                                                <div
                                                    key={part.toolCallId}
                                                    className={cn(
                                                        "mt-2 flex items-start gap-1.5 rounded border bg-background/50 p-2 text-xs",
                                                        success ? "text-emerald-700 dark:text-emerald-400" : "text-destructive",
                                                    )}
                                                >
                                                    {success ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <X className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                                                    <span>{String(part.output.message ?? (success ? "Itinerary updated." : "The itinerary could not be updated."))}</span>
                                                </div>
                                            )
                                        }

                                        if (part.state === "output-error") {
                                            return (
                                                <p key={part.toolCallId} className="mt-2 text-xs text-destructive">
                                                    {part.errorText || "The itinerary could not be updated."}
                                                </p>
                                            )
                                        }

                                        return (
                                            <div key={part.toolCallId} className="mt-2 flex items-center gap-1 rounded border bg-background/50 p-2 text-xs">
                                                Updating your itinerary… <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                                            </div>
                                        )
                                    }

                                    if (toolName !== "getWeather") {
                                        return part.state === "output-error" ? (
                                            <p key={part.toolCallId} className="mt-2 text-xs text-destructive">
                                                {part.errorText || "The assistant could not complete that action."}
                                            </p>
                                        ) : null
                                    }

                                    const inputValue = isRecord(part.input) && typeof part.input.location === "string"
                                        ? part.input.location
                                        : "that location"

                                    if (part.state === "output-available" && isRecord(part.output)) {
                                        if (part.output.success === false) {
                                            return (
                                                <p key={part.toolCallId} className="mt-2 text-xs text-destructive">
                                                    {typeof part.output.error === "string"
                                                        ? part.output.error
                                                        : "Weather is unavailable right now."}
                                                </p>
                                            )
                                        }

                                        return (
                                            <div key={part.toolCallId} className="mt-2 rounded border bg-background/50 p-2 text-xs">
                                                Weather for <b>{inputValue}</b>: {String(part.output.temperature ?? "—")}°{String(part.output.unit ?? "")}, {String(part.output.condition ?? "unavailable")}
                                            </div>
                                        )
                                    }

                                    if (part.state === "output-error") {
                                        return <p key={part.toolCallId} className="mt-2 text-xs text-destructive">{part.errorText}</p>
                                    }

                                    return (
                                        <div key={part.toolCallId} className="mt-2 flex items-center gap-1 rounded border bg-background/50 p-2 text-xs">
                                            Checking weather for {inputValue}… <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}

                    {isLoading && messages[messages.length - 1]?.role === "user" && (
                        <div className="flex items-center gap-2 pl-11 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Thinking…
                        </div>
                    )}

                    {error && (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm" role="alert">
                            {authState === "setup" ? (
                                <>
                                    <p className="font-medium">Finish setting up Travlr</p>
                                    <p className="mt-1 text-muted-foreground">
                                        Sign-in is not configured for this environment yet. Add the required authentication settings, then try again.
                                    </p>
                                </>
                            ) : authState === "auth" ? (
                                <>
                                    <p className="font-medium">Sign in to use the trip assistant.</p>
                                    <Button asChild type="button" variant="link" size="sm" className="mt-1 h-auto px-0">
                                        <Link href="/api/auth/signin">Sign in</Link>
                                    </Button>
                                </>
                            ) : (
                                <p>The trip assistant is unavailable right now.</p>
                            )}
                            <Button type="button" variant="ghost" size="sm" className="mt-1" onClick={() => void regenerate()}>
                                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
                            </Button>
                        </div>
                    )}
                </div>
            </ScrollArea>

            <div className="border-t p-4">
                <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2" aria-label="Ask the trip assistant">
                    <Input
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        placeholder="Ask anything..."
                        className="flex-1"
                        disabled={isLoading}
                        aria-label="Message for the trip assistant"
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                        <Send className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Send</span>
                    </Button>
                </form>
            </div>
        </div>
    )
}
