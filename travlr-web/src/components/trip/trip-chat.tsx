"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, getToolName, isToolUIPart } from "ai"
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

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function TripChat({ trip, onTripUpdate }: TripChatProps) {
    const [input, setInput] = useState("")
    const handledToolCalls = useRef(new Set<string>())
    const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), [])
    const { error, messages, regenerate, sendMessage, status } = useChat({ transport })
    const isLoading = status === "submitted" || status === "streaming"

    useEffect(() => {
        if (!onTripUpdate) return

        for (const message of messages) {
            if (message.role !== "assistant") continue

            for (const part of message.parts) {
                if (!isToolUIPart(part) || getToolName(part) !== "updateItinerary") continue
                if (part.state !== "output-available" || handledToolCalls.current.has(part.toolCallId)) continue
                if (!isRecord(part.output) || !isRecord(part.output.updatedTrip)) continue

                handledToolCalls.current.add(part.toolCallId)
                onTripUpdate(part.output.updatedTrip as unknown as Trip)
            }
        }
    }, [messages, onTripUpdate])

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const message = input.trim()
        if (!message || isLoading) return

        void sendMessage({ text: message }, { body: { trip } })
        setInput("")
    }

    return (
        <div className="flex h-full flex-col">
            <ScrollArea className="flex-1 p-4">
                {messages.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
                        <MapPin className="mb-4 h-10 w-10 opacity-50" />
                        <p className="text-lg font-medium">Trip Assistant</p>
                        <p className="text-sm">Ask me about weather, activities, or local tips.</p>
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
                                    <AvatarFallback>AI</AvatarFallback>
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
                                                    {success ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <X className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
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
                                                Updating your itinerary… <Loader2 className="h-3 w-3 animate-spin" />
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
                                            Checking weather for {inputValue}… <Loader2 className="h-3 w-3 animate-spin" />
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}

                    {isLoading && messages[messages.length - 1]?.role === "user" && (
                        <div className="flex items-center gap-2 pl-11 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
                        </div>
                    )}

                    {error && (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                            <p>The trip assistant is unavailable right now.</p>
                            <Button type="button" variant="ghost" size="sm" className="mt-1" onClick={() => void regenerate()}>
                                <RefreshCw className="h-3.5 w-3.5" /> Retry
                            </Button>
                        </div>
                    )}
                </div>
            </ScrollArea>

            <div className="border-t p-4">
                <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
                    <Input
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        placeholder="Ask anything..."
                        className="flex-1"
                        disabled={isLoading}
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                        <Send className="h-4 w-4" />
                        <span className="sr-only">Send</span>
                    </Button>
                </form>
            </div>
        </div>
    )
}
