"use client"

import { useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { Send, MapPin, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { Trip } from "@/lib/types/trip"

interface TripChatProps {
    trip?: Trip | null
    onTripUpdate?: (trip: Trip) => void
}

export function TripChat({ trip, onTripUpdate }: TripChatProps) {
    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: "/api/chat",
        body: { trip },
    } as any) as any

    // Sync trip updates from AI tool invocations back to parent
    useEffect(() => {
        if (!messages?.length) return

        const lastMessage = messages[messages.length - 1]
        if (lastMessage.role === 'assistant' && lastMessage.toolInvocations) {
            for (const invocation of lastMessage.toolInvocations) {
                if (invocation.toolName === 'updateItinerary' && invocation.state === 'result') {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const result = invocation.result as any
                    const { updatedTrip } = result ?? {}
                    if (updatedTrip && onTripUpdate) {
                        onTripUpdate(updatedTrip)
                    }
                }
            }
        }
    }, [messages, onTripUpdate])

    return (
        <div className="flex flex-col h-full">
            <ScrollArea className="flex-1 p-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                        <MapPin className="h-10 w-10 mb-4 opacity-50" />
                        <p className="text-lg font-medium">Trip Assistant</p>
                        <p className="text-sm">Ask me about weather, activities, or local tips!</p>
                    </div>
                )}
                <div className="space-y-4">
                    {messages.map((m: any) => (
                        <div
                            key={m.id}
                            className={cn(
                                "flex gap-3 text-sm",
                                m.role === "user" ? "justify-end" : "justify-start"
                            )}
                        >
                            {m.role === "assistant" && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>AI</AvatarFallback>
                                    <AvatarImage src="/bot-avatar.png" />
                                </Avatar>
                            )}
                            <div
                                className={cn(
                                    "rounded-lg px-3 py-2 max-w-[80%]",
                                    m.role === "user"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted"
                                )}
                            >
                                <p className="whitespace-pre-wrap">{m.content}</p>
                                {/* Render Tool Invocations if any */}
                                {m.toolInvocations?.map((toolInvocation: any) => {
                                    const { toolCallId, toolName, state, args, result } = toolInvocation
                                    if (toolName === 'getWeather') {
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        const args = 'args' in toolInvocation ? (toolInvocation as any).args : {}
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        const result = 'result' in toolInvocation ? (toolInvocation as any).result : {}

                                        return (
                                            <div key={toolCallId} className="mt-2 p-2 bg-background/50 rounded text-xs border">
                                                {state === 'result' ? (
                                                    <span>
                                                        Checking weather for <b>{args.location}</b>: {result.temperature}°{result.unit}, {result.condition}
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1">
                                                        Checking weather for {args.location}... <Loader2 className="h-3 w-3 animate-spin" />
                                                    </span>
                                                )}
                                            </div>
                                        )
                                    }
                                    return null;
                                })}
                            </div>
                        </div>
                    ))}
                    {isLoading && messages[messages.length - 1]?.role === "user" && (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm pl-11">
                            <Loader2 className="h-4 w-4 animate-spin" /> Thinking...
                        </div>
                    )}
                </div>
            </ScrollArea>
            <div className="p-4 border-t">
                <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
                    <Input
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Ask anything..."
                        className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={isLoading}>
                        <Send className="h-4 w-4" />
                        <span className="sr-only">Send</span>
                    </Button>
                </form>
            </div>
        </div>
    )
}
