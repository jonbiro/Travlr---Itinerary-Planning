"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
    Camera,
    FileText,
    Image as ImageIcon,
    Video,
    Plus,
    Trash2,
    Loader2,
    Calendar,
    MapPin,
    ExternalLink,
    RefreshCw,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import type { Memory, MemoryType } from "@/lib/types/memory"
import { MEMORY_TYPES, getMemoryTypeInfo } from "@/lib/types/memory"

interface MemoryKeeperProps {
    tripId?: string
}

type AuthState = "auth" | "setup"

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function classifyAuthFailure(payload: unknown): AuthState {
    const record = isRecord(payload) ? payload : null
    return record?.code === "AUTH_NOT_CONFIGURED" || record?.authConfigured === false
        ? "setup"
        : "auth"
}

const typeIcons = {
    photo: ImageIcon,
    video: Video,
    note: FileText,
    document: FileText,
}

function MemoryTypeIcon({ type, className }: { type: MemoryType; className?: string }) {
    const Icon = typeIcons[type] ?? FileText
    return <Icon className={className} aria-hidden="true" />
}

function formatDateOnly(value: Date | string, options: Intl.DateTimeFormatOptions = {}): string {
    const source = typeof value === "string" ? value : value.toISOString()
    const dateOnly = source.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
    const date = new Date(dateOnly ? `${dateOnly}T00:00:00.000Z` : source)
    if (Number.isNaN(date.getTime())) return "Date unavailable"

    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
        ...options,
    }).format(date)
}

function todayAsDateInput(): string {
    const now = new Date()
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

function isSafeExternalUrl(value: string | null | undefined): value is string {
    if (!value) return false

    try {
        const url = new URL(value)
        return url.protocol === "https:" || url.protocol === "http:"
    } catch {
        return false
    }
}

export function MemoryKeeper({ tripId }: MemoryKeeperProps) {
    const [memories, setMemories] = useState<Memory[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const [deletingMemoryId, setDeletingMemoryId] = useState<string | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
    const [memoryToDelete, setMemoryToDelete] = useState<Memory | null>(null)
    const [activeTab, setActiveTab] = useState<"all" | MemoryType>("all")
    const [formError, setFormError] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [authState, setAuthState] = useState<AuthState | null>(null)
    const [retryToken, setRetryToken] = useState(0)

    // Form state
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [type, setType] = useState<MemoryType>("note")
    const [date, setDate] = useState(todayAsDateInput)
    const [location, setLocation] = useState("")
    const [content, setContent] = useState("") // For notes
    const [fileUrl, setFileUrl] = useState("")

    // Load memories
    useEffect(() => {
        if (!tripId) {
            setMemories([])
            setIsLoading(false)
            setError(null)
            setAuthState(null)
            return
        }

        const requestedTripId = tripId
        const controller = new AbortController()

        async function loadMemories() {
            setIsLoading(true)
            setError(null)
            setAuthState(null)
            try {
                const res = await fetch(`/api/trip/memories?tripId=${encodeURIComponent(requestedTripId)}`, {
                    signal: controller.signal,
                })
                const data: unknown = await res.json().catch(() => null)
                if (res.status === 401) {
                    const nextAuthState = classifyAuthFailure(data)
                    setAuthState(nextAuthState)
                    throw new Error(nextAuthState === "setup"
                        ? "Sign-in is not configured for this environment yet."
                        : "Sign in to view and manage shared memories.")
                }
                if (!res.ok) {
                    const message = typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
                        ? data.error
                        : "Unable to load memories"
                    throw new Error(message)
                }
                const memories = typeof data === "object" && data !== null && "memories" in data && Array.isArray(data.memories)
                    ? data.memories as Memory[]
                    : []
                setMemories(memories)
            } catch (loadError) {
                if (controller.signal.aborted) return
                setError(loadError instanceof Error ? loadError.message : "Unable to load memories")
            } finally {
                if (!controller.signal.aborted) setIsLoading(false)
            }
        }

        void loadMemories()

        return () => controller.abort()
    }, [tripId, retryToken])

    const filteredMemories = activeTab === "all"
        ? memories
        : memories.filter(m => m.type === activeTab)

    const resetForm = () => {
        setTitle("")
        setDescription("")
        setType("note")
        setDate(todayAsDateInput())
        setLocation("")
        setContent("")
        setFileUrl("")
        setFormError(null)
    }

    async function handleAddMemory() {
        if (!tripId || !title) return

        if (type !== "note") {
            try {
                const url = new URL(fileUrl)
                if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error()
            } catch {
                setFormError("Add a valid public http or https file URL.")
                return
            }
        }

        setIsAdding(true)
        setFormError(null)
        try {
            const res = await fetch("/api/trip/memories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tripId,
                    type,
                    title,
                    description: description || null,
                    content: type === "note" ? content : null,
                    fileUrl: type !== "note" ? fileUrl : null,
                    date: new Date(`${date}T00:00:00.000Z`).toISOString(),
                    location: location || null,
                }),
            })

            if (!res.ok) {
                const payload: unknown = await res.json().catch(() => null)
                if (res.status === 401) {
                    const nextAuthState = classifyAuthFailure(payload)
                    setAuthState(nextAuthState)
                    throw new Error(nextAuthState === "setup"
                        ? "Sign-in is not configured for this environment yet."
                        : "Sign in to save shared memories.")
                }
                const message = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
                    ? payload.error
                    : "Unable to save this memory"
                throw new Error(message)
            }

            const newMemory = await res.json()
            setMemories((previousMemories) => [newMemory, ...previousMemories])
            resetForm()
            setDialogOpen(false)
        } catch (error) {
            setFormError(error instanceof Error ? error.message : "Unable to save this memory")
        } finally {
            setIsAdding(false)
        }
    }

    async function handleDeleteMemory(memory: Memory) {
        if (!memory.canDelete) return

        setDeletingMemoryId(memory.id)
        setError(null)
        try {
            const res = await fetch(`/api/trip/memories?id=${encodeURIComponent(memory.id)}`, {
                method: "DELETE",
            })

            const payload: unknown = await res.json().catch(() => null)
            if (res.status === 401) {
                const nextAuthState = classifyAuthFailure(payload)
                setAuthState(nextAuthState)
                throw new Error(nextAuthState === "setup"
                    ? "Sign-in is not configured for this environment yet."
                    : "Sign in to manage shared memories.")
            }
            if (!res.ok) {
                const message = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
                    ? payload.error
                    : "Unable to delete memory"
                throw new Error(message)
            }
            setMemories((previousMemories) => previousMemories.filter((currentMemory) => currentMemory.id !== memory.id))
            setSelectedMemory(null)
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : "Unable to delete memory")
        } finally {
            setDeletingMemoryId(null)
            setMemoryToDelete(null)
        }
    }

    if (!tripId) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 h-full">
                <Camera className="h-12 w-12 text-muted-foreground opacity-50" aria-hidden="true" />
                <p className="text-muted-foreground">Create or select a trip to add memories</p>
            </div>
        )
    }

    if (authState) {
        const isSetup = authState === "setup"

        return (
            <div className="flex h-full flex-col items-center justify-center space-y-4 p-8 text-center" role="alert">
                <Camera className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
                <div>
                    <h3 className="font-semibold text-lg">{isSetup ? "Finish setting up Travlr" : "Sign in to manage shared memories"}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {isSetup
                            ? "Sign-in is not configured for this environment yet. Add the required authentication settings, then try again."
                            : "Trip members can save notes, photos, and documents after signing in."}
                    </p>
                </div>
                {isSetup ? (
                    <Button type="button" variant="outline" onClick={() => setRetryToken((token) => token + 1)}>
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        Try again
                    </Button>
                ) : (
                    <Button asChild>
                        <Link href="/api/auth/signin">Sign in</Link>
                    </Button>
                )}
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
                <p className="mt-2 text-sm text-muted-foreground">Loading memories...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {error && (
                <p className="m-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
                    {error}
                </p>
            )}
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">Memories</h3>
                    <p className="text-xs text-muted-foreground">{memories.length} items</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button type="button" size="sm">
                            <Plus className="h-4 w-4 mr-1" aria-hidden="true" /> Add memory
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Add Memory</DialogTitle>
                            <DialogDescription>
                                Capture a special moment from your trip
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div className="grid gap-2">
                                <Label htmlFor="memory-type">Type</Label>
                                <Select value={type} onValueChange={(v) => setType(v as MemoryType)}>
                                    <SelectTrigger id="memory-type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MEMORY_TYPES.map((t) => (
                                            <SelectItem key={t.value} value={t.value}>
                                                <span className="flex items-center gap-2">
                                                    <MemoryTypeIcon type={t.value} className="h-4 w-4" />
                                                    <span>{t.label}</span>
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g., Sunset at the beach"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            {type === "note" ? (
                                <div className="grid gap-2">
                                    <Label htmlFor="content">Note Content</Label>
                                    <Textarea
                                        id="content"
                                        placeholder="Write your memory..."
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        rows={6}
                                    />
                                </div>
                            ) : (
                                <div className="grid gap-2">
                                    <Label htmlFor="fileUrl">File URL</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="fileUrl"
                                            placeholder="https://example.com/photo.jpg"
                                            value={fileUrl}
                                            onChange={(e) => setFileUrl(e.target.value)}
                                            className="flex-1"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Paste a public http or https link to the photo, video, or document.
                                    </p>
                                </div>
                            )}

                            <div className="grid gap-2">
                                <Label htmlFor="description">Description (optional)</Label>
                                <Input
                                    id="description"
                                    placeholder="Add a description..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="date">Date</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="location">Location (optional)</Label>
                                    <Input
                                        id="location"
                                        placeholder="Paris, France"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                    />
                                </div>
                            </div>

                            <Button
                                type="button"
                                className="w-full"
                                onClick={handleAddMemory}
                                disabled={!title || (type !== "note" && !fileUrl) || isAdding}
                            >
                                {isAdding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Add Memory
                            </Button>
                            {formError && <p className="text-sm text-destructive">{formError}</p>}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Memory filters */}
            <div className="px-4 pt-2">
                <div className="grid h-9 w-full grid-cols-5 rounded-lg bg-muted p-1" role="group" aria-label="Filter memories">
                    {([
                        { value: "all", label: "All", icon: null },
                        { value: "photo", label: "Photos", icon: ImageIcon },
                        { value: "video", label: "Videos", icon: Video },
                        { value: "note", label: "Notes", icon: FileText },
                        { value: "document", label: "Documents", icon: FileText },
                    ] as const).map((filter) => {
                        const Icon = filter.icon
                        const selected = activeTab === filter.value

                        return (
                            <button
                                key={filter.value}
                                type="button"
                                aria-label={filter.label}
                                aria-pressed={selected}
                                onClick={() => setActiveTab(filter.value)}
                                className="inline-flex items-center justify-center rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm"
                            >
                                {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : filter.label}
                            </button>
                        )
                    })}
                </div>
                <p className="sr-only" role="status" aria-live="polite">
                    {filteredMemories.length} {filteredMemories.length === 1 ? "memory" : "memories"} shown.
                </p>
            </div>

            {/* Memory Grid */}
            <ScrollArea className="flex-1 p-4">
                {filteredMemories.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                        <p className="text-sm">No memories yet</p>
                        <p className="text-xs mt-1">Add photos, notes, and more!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {filteredMemories.map((memory) => {
                            return (
                                <Card
                                    key={memory.id}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`View memory: ${memory.title}`}
                                    className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    onClick={() => setSelectedMemory(memory)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault()
                                            setSelectedMemory(memory)
                                        }
                                    }}
                                >
                                    {memory.type === "photo" && isSafeExternalUrl(memory.fileUrl) ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={memory.fileUrl}
                                            alt={memory.title}
                                            loading="lazy"
                                            decoding="async"
                                            className="aspect-square w-full object-cover"
                                        />
                                    ) : (
                                        <div className="aspect-square bg-muted flex items-center justify-center">
                                            <MemoryTypeIcon type={memory.type as MemoryType} className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                    )}
                                    <CardContent className="p-2">
                                        <p className="font-medium text-sm truncate">{memory.title}</p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                            <MemoryTypeIcon type={memory.type as MemoryType} className="h-3.5 w-3.5" />
                                            {formatDateOnly(memory.date)}
                                        </p>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </ScrollArea>

            {/* Memory Detail Modal */}
            <Dialog open={!!selectedMemory} onOpenChange={(open) => { if (!open) setSelectedMemory(null) }}>
                <DialogContent className="sm:max-w-[600px]">
                    {selectedMemory && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <MemoryTypeIcon type={selectedMemory.type as MemoryType} className="h-4 w-4" />
                                    <span className="sr-only">{getMemoryTypeInfo(selectedMemory.type as MemoryType).label}</span>
                                    {selectedMemory.title}
                                </DialogTitle>
                                <DialogDescription className="sr-only">
                                    Details for {selectedMemory.title}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                {selectedMemory.type === "photo" && isSafeExternalUrl(selectedMemory.fileUrl) && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={selectedMemory.fileUrl}
                                        alt={selectedMemory.title}
                                        loading="lazy"
                                        decoding="async"
                                        className="aspect-video w-full rounded-lg object-cover"
                                    />
                                )}
                                {selectedMemory.type === "video" && isSafeExternalUrl(selectedMemory.fileUrl) && (
                                    <video
                                        src={selectedMemory.fileUrl}
                                        controls
                                        aria-label={selectedMemory.title}
                                        className="w-full rounded-lg"
                                    />
                                )}
                                {selectedMemory.type === "document" && isSafeExternalUrl(selectedMemory.fileUrl) && (
                                    <a
                                        href={selectedMemory.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between rounded-lg border bg-muted/40 p-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <span>Open document</span>
                                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                                    </a>
                                )}
                                {selectedMemory.type === "note" && selectedMemory.content && (
                                    <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                                        {selectedMemory.content}
                                    </div>
                                )}

                                {selectedMemory.description && (
                                    <p className="text-muted-foreground">{selectedMemory.description}</p>
                                )}

                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4" aria-hidden="true" />
                                        {formatDateOnly(selectedMemory.date, { month: "long" })}
                                    </span>
                                    {selectedMemory.location && (
                                        <span className="flex items-center gap-1">
                                            <MapPin className="h-4 w-4" aria-hidden="true" />
                                            {selectedMemory.location}
                                        </span>
                                    )}
                                </div>

                                {selectedMemory.canDelete && (
                                    <div className="flex justify-end">
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => setMemoryToDelete(selectedMemory)}
                                            disabled={deletingMemoryId !== null}
                                            aria-label={`Delete memory: ${selectedMemory.title}`}
                                        >
                                            {deletingMemoryId === selectedMemory.id ? (
                                                <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden="true" />
                                            ) : (
                                                <Trash2 className="h-4 w-4 mr-1" aria-hidden="true" />
                                            )}
                                            Delete
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
            <ConfirmDialog
                open={memoryToDelete !== null}
                onOpenChange={(open) => {
                    if (!open) setMemoryToDelete(null)
                }}
                title="Delete memory?"
                description={memoryToDelete
                    ? `Delete ${memoryToDelete.title} permanently? This cannot be undone.`
                    : "This memory will be permanently deleted."}
                confirmLabel="Delete memory"
                cancelLabel="Keep memory"
                isConfirming={deletingMemoryId !== null}
                onConfirm={() => {
                    if (memoryToDelete) return handleDeleteMemory(memoryToDelete)
                }}
            />
        </div>
    )
}
