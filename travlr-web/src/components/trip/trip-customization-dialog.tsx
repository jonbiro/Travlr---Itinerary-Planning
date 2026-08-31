"use client"

import { useState } from "react"
import Link from "next/link"
import { Palette, Image as ImageIcon, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { TripTheme } from "@/lib/types/trip"

export type { TripTheme } from "@/lib/types/trip"

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

interface TripCustomizationDialogProps {
    tripId?: string
    currentTheme?: TripTheme
    onThemeChange?: (theme: TripTheme) => void
}

// Preset color themes
const presetThemes: { name: string; theme: TripTheme }[] = [
    {
        name: "Ocean Blue",
        theme: {
            backgroundColor: "#0ea5e9",
            accentColor: "#0284c7",
            gradientFrom: "#0ea5e9",
            gradientTo: "#2563eb",
        },
    },
    {
        name: "Sunset",
        theme: {
            backgroundColor: "#f97316",
            accentColor: "#ea580c",
            gradientFrom: "#f97316",
            gradientTo: "#ec4899",
        },
    },
    {
        name: "Forest",
        theme: {
            backgroundColor: "#22c55e",
            accentColor: "#16a34a",
            gradientFrom: "#22c55e",
            gradientTo: "#14b8a6",
        },
    },
    {
        name: "Lavender",
        theme: {
            backgroundColor: "#a855f7",
            accentColor: "#9333ea",
            gradientFrom: "#a855f7",
            gradientTo: "#6366f1",
        },
    },
    {
        name: "Rose",
        theme: {
            backgroundColor: "#f43f5e",
            accentColor: "#e11d48",
            gradientFrom: "#f43f5e",
            gradientTo: "#f97316",
        },
    },
    {
        name: "Midnight",
        theme: {
            backgroundColor: "#1e293b",
            accentColor: "#334155",
            gradientFrom: "#1e293b",
            gradientTo: "#0f172a",
        },
    },
]

// Preset background images (travel-themed)
const presetImages = [
    { name: "Beach", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800" },
    { name: "Mountains", url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800" },
    { name: "City", url: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800" },
    { name: "Forest", url: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800" },
    { name: "Desert", url: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800" },
    { name: "Aurora", url: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800" },
]

export function TripCustomizationDialog({
    tripId,
    currentTheme,
    onThemeChange,
}: TripCustomizationDialogProps) {
    const [selectedTheme, setSelectedTheme] = useState<TripTheme>(
        currentTheme || presetThemes[0].theme
    )
    const [customColor, setCustomColor] = useState(currentTheme?.backgroundColor || "#3b82f6")
    const [customImageUrl, setCustomImageUrl] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [authState, setAuthState] = useState<AuthState | null>(null)
    const [open, setOpen] = useState(false)
    const [statusMessage, setStatusMessage] = useState("")

    const resetDraft = () => {
        const nextTheme = currentTheme || presetThemes[0].theme
        setSelectedTheme({ ...nextTheme })
        setCustomColor(nextTheme.backgroundColor || "#3b82f6")
        setCustomImageUrl("")
        setSaveError(null)
        setAuthState(null)
    }

    const handleOpenChange = (nextOpen: boolean) => {
        if (isSaving) return

        resetDraft()
        setOpen(nextOpen)
        if (nextOpen) setStatusMessage("")
    }

    const handleSelectPresetTheme = (theme: TripTheme) => {
        setSaveError(null)
        setSelectedTheme({ ...theme })
    }

    const handleSelectImage = (url: string) => {
        setSaveError(null)
        setSelectedTheme({
            ...selectedTheme,
            backgroundImage: url,
        })
    }

    const handleCustomColor = () => {
        if (!isValidHexColor(customColor)) {
            const message = "Use a six-digit hex color, such as #3b82f6."
            setSaveError(message)
            setStatusMessage(message)
            return
        }

        setSaveError(null)
        setStatusMessage("Custom color applied to the preview.")
        setSelectedTheme({
            backgroundColor: customColor,
            accentColor: customColor,
            gradientFrom: customColor,
            gradientTo: adjustColor(customColor, -30),
        })
    }

    const handleCustomImage = () => {
        if (customImageUrl) {
            setSaveError(null)
            setStatusMessage("Custom background image applied to the preview.")
            setSelectedTheme({
                ...selectedTheme,
                backgroundImage: customImageUrl,
            })
        }
    }

    const handleSave = async () => {
        if (!tripId) {
            const message = "Select a trip before saving its appearance."
            setSaveError(message)
            setStatusMessage(message)
            return
        }

        setIsSaving(true)
        setSaveError(null)
        setAuthState(null)
        setStatusMessage("Saving trip appearance.")
        try {
            const response = await fetch(`/api/trip/${encodeURIComponent(tripId)}/theme`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(selectedTheme),
            })
            const payload: unknown = await response.json().catch(() => null)
            if (response.status === 401) {
                const nextAuthState = classifyAuthFailure(payload)
                setAuthState(nextAuthState)
                throw new Error(nextAuthState === "setup"
                    ? "Sign-in is not configured for this environment yet."
                    : "Sign in to customize this trip.")
            }
            if (!response.ok) {
                throw new Error(
                    isRecord(payload) && typeof payload.error === "string"
                        ? payload.error
                        : "Unable to save the trip appearance.",
                )
            }

            onThemeChange?.(selectedTheme)
            setStatusMessage("Trip appearance saved.")
            setOpen(false)
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to save the trip appearance."
            setSaveError(message)
            setStatusMessage(message)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <>
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="gap-2" disabled={!tripId}>
                    <Palette className="h-4 w-4" />
                    Customize
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Customize Trip Appearance</DialogTitle>
                    <DialogDescription>
                        Personalize your trip with colors and background images
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="colors" className="mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="colors" className="gap-2">
                            <Palette className="h-4 w-4" />
                            Colors
                        </TabsTrigger>
                        <TabsTrigger value="images" className="gap-2">
                            <ImageIcon className="h-4 w-4" />
                            Background
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="colors" className="space-y-4 pt-4">
                        {/* Preview */}
                        <div
                            className="relative flex h-24 items-center justify-center overflow-hidden rounded-lg font-medium text-white"
                            style={{
                                background: selectedTheme.gradientFrom
                                    ? `linear-gradient(135deg, ${selectedTheme.gradientFrom}, ${selectedTheme.gradientTo})`
                                    : selectedTheme.backgroundColor,
                            }}
                        >
                            <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
                            <span className="relative">Preview</span>
                        </div>

                        {/* Preset Themes */}
                        <div role="group" aria-labelledby="preset-themes-label">
                            <Label id="preset-themes-label" className="text-sm font-medium mb-2 block">Preset Themes</Label>
                            <div className="grid grid-cols-6 gap-2">
                                {presetThemes.map((preset) => (
                                    <button
                                        key={preset.name}
                                        type="button"
                                        onClick={() => handleSelectPresetTheme(preset.theme)}
                                        className={cn(
                                            "w-full aspect-square rounded-lg border-2 transition-all",
                                            selectedTheme.backgroundColor === preset.theme.backgroundColor
                                                ? "border-foreground scale-110"
                                                : "border-transparent hover:scale-105"
                                        )}
                                        style={{
                                            background: `linear-gradient(135deg, ${preset.theme.gradientFrom}, ${preset.theme.gradientTo})`,
                                        }}
                                        title={preset.name}
                                        aria-label={`Use ${preset.name} theme`}
                                        aria-pressed={selectedTheme.backgroundColor === preset.theme.backgroundColor}
                                    >
                                        {selectedTheme.backgroundColor === preset.theme.backgroundColor && (
                                            <Check className="h-4 w-4 text-white mx-auto" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Color */}
                        <div role="group" aria-labelledby="custom-color-label">
                            <Label id="custom-color-label" htmlFor="custom-color-picker" className="text-sm font-medium mb-2 block">Custom Color</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="custom-color-picker"
                                    type="color"
                                    value={customColor}
                                    onChange={(e) => setCustomColor(e.target.value)}
                                    className="w-12 h-10 p-1 cursor-pointer"
                                    aria-label="Choose custom color"
                                />
                                <Input
                                    id="custom-color-hex"
                                    type="text"
                                    value={customColor}
                                    onChange={(e) => setCustomColor(e.target.value)}
                                    placeholder="#3b82f6"
                                    className="flex-1"
                                    aria-label="Custom color hex value"
                                />
                                <Button type="button" variant="secondary" onClick={handleCustomColor}>
                                    Apply
                                </Button>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="images" className="space-y-4 pt-4">
                        {/* Preview */}
                        <div
                            className="relative flex h-24 items-center justify-center overflow-hidden rounded-lg bg-cover bg-center font-medium text-white"
                            style={{
                                backgroundImage: selectedTheme.backgroundImage
                                    ? `url(${selectedTheme.backgroundImage})`
                                    : undefined,
                                backgroundColor: selectedTheme.backgroundColor,
                            }}
                        >
                            <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
                            <span className="relative">Preview</span>
                        </div>

                        {/* Preset Images */}
                        <div role="group" aria-labelledby="preset-backgrounds-label">
                            <Label id="preset-backgrounds-label" className="text-sm font-medium mb-2 block">Preset Backgrounds</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {presetImages.map((img) => (
                                    <button
                                        key={img.name}
                                        type="button"
                                        onClick={() => handleSelectImage(img.url)}
                                        className={cn(
                                            "aspect-video rounded-lg bg-cover bg-center border-2 transition-all relative overflow-hidden",
                                            selectedTheme.backgroundImage === img.url
                                                ? "border-foreground scale-105"
                                                : "border-transparent hover:scale-105"
                                        )}
                                        style={{ backgroundImage: `url(${img.url})` }}
                                        title={img.name}
                                        aria-label={`Use ${img.name} background`}
                                        aria-pressed={selectedTheme.backgroundImage === img.url}
                                    >
                                        {selectedTheme.backgroundImage === img.url && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                <Check className="h-6 w-6 text-white" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Image URL */}
                        <div>
                            <Label htmlFor="custom-image-url" className="text-sm font-medium mb-2 block">Custom Image URL</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="custom-image-url"
                                    type="url"
                                    value={customImageUrl}
                                    onChange={(e) => setCustomImageUrl(e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                    className="flex-1"
                                />
                                <Button type="button" variant="secondary" onClick={handleCustomImage}>
                                    Apply
                                </Button>
                            </div>
                        </div>

                        {/* Clear Image */}
                        {selectedTheme.backgroundImage && (
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                    setSaveError(null)
                                    setSelectedTheme({ ...selectedTheme, backgroundImage: undefined })
                                }}
                            >
                                Remove Background Image
                            </Button>
                        )}
                    </TabsContent>
                </Tabs>

                <div className="flex items-center justify-end gap-2 mt-4">
                    {authState ? (
                        <div className="mr-auto text-sm" role="alert">
                            <p className="font-medium">
                                {authState === "setup" ? "Finish setting up Travlr" : "Sign in to customize this trip"}
                            </p>
                            <p className="mt-1 text-muted-foreground">
                                {authState === "setup"
                                    ? "Sign-in is not configured for this environment yet. Add the required authentication settings, then try again."
                                    : "Sign in before saving this trip's appearance."}
                            </p>
                            {authState === "auth" && (
                                <Button asChild type="button" variant="link" size="sm" className="mt-1 h-auto px-0">
                                    <Link href="/api/auth/signin">Sign in</Link>
                                </Button>
                            )}
                        </div>
                    ) : saveError ? (
                        <p id="trip-theme-error" role="alert" className="mr-auto text-sm text-destructive">
                            {saveError}
                        </p>
                    ) : null}
                    <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleSave} disabled={isSaving || !tripId} aria-busy={isSaving}>
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                                Saving…
                            </>
                        ) : (
                            "Save Theme"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {statusMessage}
        </p>
        </>
    )
}

// Helper to adjust color brightness
function adjustColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace("#", ""), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.max(0, Math.min(255, (num >> 16) + amt))
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt))
    const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt))
    return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`
}

function isValidHexColor(value: string): boolean {
    return /^#[0-9a-f]{6}$/i.test(value)
}
