"use client"

import Image from "next/image"
import { useState, useEffect, useRef } from "react"
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
    Upload
} from "lucide-react"
import { format } from "date-fns"

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Memory, MemoryType } from "@/lib/types/memory"
import { MEMORY_TYPES, getMemoryTypeInfo } from "@/lib/types/memory"

interface MemoryKeeperProps {
    tripId?: string
}

const typeIcons = {
    photo: ImageIcon,
    video: Video,
    note: FileText,
    document: FileText,
}

export function MemoryKeeper({ tripId }: MemoryKeeperProps) {
    const [memories, setMemories] = useState<Memory[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
    const [activeTab, setActiveTab] = useState<string>("all")
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Form state
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [type, setType] = useState<MemoryType>("note")
    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))
    const [location, setLocation] = useState("")
    const [content, setContent] = useState("") // For notes
    const [fileUrl, setFileUrl] = useState("")

    // Load memories
    useEffect(() => {
        if (!tripId) return

        async function loadMemories() {
            setIsLoading(true)
            try {
                const res = await fetch(`/api/trip/memories?tripId=${tripId}`)
                if (res.ok) {
                    const data = await res.json()
                    setMemories(data.memories || [])
                }
            } catch (error) {
                console.error("Failed to load memories:", error)
            } finally {
                setIsLoading(false)
            }
        }

        loadMemories()
    }, [tripId])

    const filteredMemories = activeTab === "all"
        ? memories
        : memories.filter(m => m.type === activeTab)

    const resetForm = () => {
        setTitle("")
        setDescription("")
        setType("note")
        setDate(format(new Date(), "yyyy-MM-dd"))
        setLocation("")
        setContent("")
        setFileUrl("")
    }

    async function handleAddMemory() {
        if (!tripId || !title) return

        setIsAdding(true)
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
                    date: new Date(date).toISOString(),
                    location: location || null,
                }),
            })

            if (res.ok) {
                const newMemory = await res.json()
                setMemories([newMemory, ...memories])
                resetForm()
                setDialogOpen(false)
            }
        } catch (error) {
            console.error("Failed to add memory:", error)
        } finally {
            setIsAdding(false)
        }
    }

    async function handleDeleteMemory(memoryId: string) {
        try {
            const res = await fetch(`/api/trip/memories?id=${memoryId}`, {
                method: "DELETE",
            })

            if (res.ok) {
                setMemories(memories.filter(m => m.id !== memoryId))
                setSelectedMemory(null)
            }
        } catch (error) {
            console.error("Failed to delete memory:", error)
        }
    }

    if (!tripId) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 h-full">
                <Camera className="h-12 w-12 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Create or select a trip to add memories</p>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Loading memories...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">Memories</h3>
                    <p className="text-xs text-muted-foreground">{memories.length} items</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="h-4 w-4 mr-1" /> Add
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
                                <Label>Type</Label>
                                <Select value={type} onValueChange={(v) => setType(v as MemoryType)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MEMORY_TYPES.map((t) => (
                                            <SelectItem key={t.value} value={t.value}>
                                                <span className="flex items-center gap-2">
                                                    <span>{t.icon}</span>
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
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Paste a URL or upload from your device
                                    </p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*,video/*,.pdf,.doc,.docx"
                                        className="hidden"
                                        onChange={(e) => {
                                            // In production, this would upload to cloud storage
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                setFileUrl(`local://${file.name}`)
                                            }
                                        }}
                                    />
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
                                className="w-full"
                                onClick={handleAddMemory}
                                disabled={!title || isAdding}
                            >
                                {isAdding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Add Memory
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filter Tabs */}
            <div className="px-4 pt-2">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-5 h-8">
                        <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                        <TabsTrigger value="photo" className="text-xs">📷</TabsTrigger>
                        <TabsTrigger value="video" className="text-xs">🎬</TabsTrigger>
                        <TabsTrigger value="note" className="text-xs">📝</TabsTrigger>
                        <TabsTrigger value="document" className="text-xs">📄</TabsTrigger>
                    </TabsList>
                </Tabs>
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
                            const Icon = typeIcons[memory.type as keyof typeof typeIcons] || FileText
                            const typeInfo = getMemoryTypeInfo(memory.type as MemoryType)

                            return (
                                <Card
                                    key={memory.id}
                                    className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
                                    onClick={() => setSelectedMemory(memory)}
                                >
                                    {memory.type === "photo" && memory.fileUrl ? (
                                        <div
                                            className="aspect-square bg-cover bg-center"
                                            style={{ backgroundImage: `url(${memory.fileUrl})` }}
                                        />
                                    ) : (
                                        <div className="aspect-square bg-muted flex items-center justify-center">
                                            <Icon className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                    )}
                                    <CardContent className="p-2">
                                        <p className="font-medium text-sm truncate">{memory.title}</p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                            <span>{typeInfo.icon}</span>
                                            {format(new Date(memory.date), "MMM d")}
                                        </p>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </ScrollArea>

            {/* Memory Detail Modal */}
            <Dialog open={!!selectedMemory} onOpenChange={() => setSelectedMemory(null)}>
                <DialogContent className="sm:max-w-[600px]">
                    {selectedMemory && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <span>{getMemoryTypeInfo(selectedMemory.type as MemoryType).icon}</span>
                                    {selectedMemory.title}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                {selectedMemory.type === "photo" && selectedMemory.fileUrl && (
                                    <div className="relative w-full aspect-video">
                                        <Image
                                            src={selectedMemory.fileUrl}
                                            alt={selectedMemory.title}
                                            fill
                                            className="object-cover rounded-lg"
                                        />
                                    </div>
                                )}
                                {selectedMemory.type === "video" && selectedMemory.fileUrl && (
                                    <video
                                        src={selectedMemory.fileUrl}
                                        controls
                                        className="w-full rounded-lg"
                                    />
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
                                        <Calendar className="h-4 w-4" />
                                        {format(new Date(selectedMemory.date), "MMMM d, yyyy")}
                                    </span>
                                    {selectedMemory.location && (
                                        <span className="flex items-center gap-1">
                                            <MapPin className="h-4 w-4" />
                                            {selectedMemory.location}
                                        </span>
                                    )}
                                </div>

                                <div className="flex justify-end">
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDeleteMemory(selectedMemory.id)}
                                    >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
