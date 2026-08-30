"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { addDays, format, startOfDay } from "date-fns"
import { CalendarIcon, Loader2, LogIn, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { formatDateOnly } from "@/lib/date-only"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { createTripSchema, type CreateTripValues } from "@/lib/validators/trip"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export type GeneratedTrip = {
    id: string
    [key: string]: unknown
}

type CreateTripFormProps = {
    initialDestination?: string
    initialInterests?: string[]
    onSuccess?: (data: GeneratedTrip) => void
}

type FormError = {
    kind: "auth" | "setup" | "generic"
    message: string
}

const interestOptions = [
    { value: "food", label: "Food & drink" },
    { value: "culture", label: "Art & culture" },
    { value: "nature", label: "Nature" },
    { value: "architecture", label: "Architecture" },
    { value: "nightlife", label: "Nightlife" },
    { value: "wellness", label: "Wellness" },
] as const

const interestValues = new Set<string>(interestOptions.map((interest) => interest.value))
const noInitialInterests: string[] = []

function normalizeInitialInterests(interests: string[]) {
    return [...new Set(interests.map((interest) => interest.trim().toLowerCase()))]
        .filter((interest) => interestValues.has(interest))
}

function isGeneratedTrip(value: unknown): value is GeneratedTrip {
    return (
        typeof value === "object"
        && value !== null
        && !Array.isArray(value)
        && typeof (value as { id?: unknown }).id === "string"
        && (value as { id: string }).id.length > 0
    )
}

function getErrorMessage(payload: unknown, fallback: string): string {
    if (
        typeof payload === "object"
        && payload !== null
        && typeof (payload as { error?: unknown }).error === "string"
    ) {
        return (payload as { error: string }).error
    }

    return fallback
}

export function serializeCreateTripDates(data: CreateTripValues) {
    return {
        ...data,
        startDate: formatDateOnly(data.startDate),
        endDate: formatDateOnly(data.endDate),
    }
}

export function CreateTripForm({ initialDestination = "", initialInterests = noInitialInterests, onSuccess }: CreateTripFormProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [formError, setFormError] = useState<FormError | null>(null)
    const requestRef = useRef<AbortController | null>(null)
    const today = startOfDay(new Date())

    const form = useForm<CreateTripValues>({
        // The dates are intentionally useful defaults so the first generated
        // itinerary only requires a destination and budget choice.
        resolver: zodResolver(createTripSchema) as never,
        defaultValues: {
            destination: initialDestination,
            startDate: today,
            endDate: addDays(today, 3),
            interests: normalizeInitialInterests(initialInterests),
        },
    })
    const startDate = form.watch("startDate")

    useEffect(() => {
        form.reset({
            destination: initialDestination,
            startDate: today,
            endDate: addDays(today, 3),
            interests: normalizeInitialInterests(initialInterests),
        })
        setFormError(null)
        // `today` is evaluated once per render, but this effect only needs to
        // run when the destination or interests supplied by the dashboard change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialDestination, initialInterests, form])

    useEffect(() => () => {
        requestRef.current?.abort()
    }, [])

    async function onSubmit(data: CreateTripValues) {
        requestRef.current?.abort()
        const controller = new AbortController()
        requestRef.current = controller
        setIsLoading(true)
        setFormError(null)

        try {
            const response = await fetch("/api/trip/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(serializeCreateTripDates(data)),
                signal: controller.signal,
            })
            const payload: unknown = await response.json().catch(() => null)

            if (!response.ok) {
                if (response.status === 401) {
                    const authConfigured = !(
                        typeof payload === "object"
                        && payload !== null
                        && "authConfigured" in payload
                        && payload.authConfigured === false
                    )
                    setFormError({
                        kind: authConfigured ? "auth" : "setup",
                        message: authConfigured
                            ? "Sign in before generating an itinerary."
                            : getErrorMessage(payload, "Google OAuth and NextAuth must be configured before you can sign in."),
                    })
                    return
                }

                if (response.status === 503) {
                    setFormError({
                        kind: "setup",
                        message: getErrorMessage(payload, "Trip generation is not configured yet."),
                    })
                    return
                }

                throw new Error(getErrorMessage(payload, "Failed to generate trip"))
            }

            if (!isGeneratedTrip(payload)) {
                throw new Error("The generated trip was missing an ID. Please try again.")
            }

            toast.success("Trip generated successfully!")
            onSuccess?.(payload)
        } catch (error) {
            if (controller.signal.aborted) return

            const message = error instanceof Error
                ? error.message
                : "Something went wrong. Please try again."
            setFormError({ kind: "generic", message })
            toast.error(message)
        } finally {
            if (requestRef.current === controller) {
                requestRef.current = null
                setIsLoading(false)
            }
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="destination"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Destination</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Paris, France"
                                    autoComplete="address-level2"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                Where do you want to go?
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                            <FormItem className="flex min-w-0 flex-col">
                                <FormLabel>Start date</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground",
                                                )}
                                            >
                                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) => (
                                                date < today || date < new Date("1900-01-01")
                                            )}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                            <FormItem className="flex min-w-0 flex-col">
                                <FormLabel>End date</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground",
                                                )}
                                            >
                                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) => {
                                                const minimumDate = startDate ? startOfDay(startDate) : today
                                                return date < minimumDate || date < new Date("1900-01-01")
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Budget level</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a budget" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="budget">Budget-friendly</SelectItem>
                                    <SelectItem value="moderate">Moderate</SelectItem>
                                    <SelectItem value="luxury">Luxury</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="interests"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Interests <span className="font-normal text-muted-foreground">(optional)</span></FormLabel>
                            <FormDescription>
                                Pick a few signals so the itinerary feels like yours.
                            </FormDescription>
                            <div className="flex flex-wrap gap-2 pt-1">
                                {interestOptions.map((interest) => {
                                    const selected = field.value?.includes(interest.value) ?? false
                                    return (
                                        <Button
                                            key={interest.value}
                                            type="button"
                                            variant={selected ? "secondary" : "outline"}
                                            size="sm"
                                            aria-pressed={selected}
                                            onClick={() => {
                                                const interests = field.value ?? []
                                                field.onChange(
                                                    selected
                                                        ? interests.filter((value) => value !== interest.value)
                                                        : [...interests, interest.value],
                                                )
                                            }}
                                        >
                                            {interest.label}
                                        </Button>
                                    )
                                })}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {formError && (
                    <div
                        role="alert"
                        className={cn(
                            "rounded-md border p-3 text-sm",
                            formError.kind === "auth"
                                ? "border-primary/30 bg-primary/5"
                                : "border-destructive/30 bg-destructive/5",
                        )}
                    >
                        <p>{formError.message}</p>
                        {formError.kind === "auth" && (
                            <Button asChild type="button" variant="link" size="sm" className="mt-1 h-auto px-0">
                                <Link href="/api/auth/signin">
                                    <LogIn className="h-3.5 w-3.5" />
                                    Sign in to continue
                                </Link>
                            </Button>
                        )}
                        {formError.kind === "setup" && (
                            <p className="mt-1 text-xs text-muted-foreground">
                                A workspace owner can add the required environment settings, then try again.
                            </p>
                        )}
                    </div>
                )}

                <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                    aria-busy={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating itinerary…
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate with AI
                        </>
                    )}
                </Button>
            </form>
        </Form>
    )
}
