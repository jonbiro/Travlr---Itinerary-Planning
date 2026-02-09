"use client"

import { useState } from "react"
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

interface TripCustomizationDialogProps {
    tripId?: string
    currentTheme?: TripTheme
    onThemeChange?: (theme: TripTheme) => void
}

export interface TripTheme {
    backgroundColor: string
    backgroundImage?: string
    accentColor: string
    gradientFrom?: string
    gradientTo?: string
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
    const [customColor, setCustomColor] = useState("#3b82f6")
    const [customImageUrl, setCustomImageUrl] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [open, setOpen] = useState(false)

    const handleSelectPresetTheme = (theme: TripTheme) => {
        setSelectedTheme(theme)
    }

    const handleSelectImage = (url: string) => {
        setSelectedTheme({
            ...selectedTheme,
            backgroundImage: url,
        })
    }

    const handleCustomColor = () => {
        setSelectedTheme({
            backgroundColor: customColor,
            accentColor: customColor,
            gradientFrom: customColor,
            gradientTo: adjustColor(customColor, -30),
        })
    }

    const handleCustomImage = () => {
        if (customImageUrl) {
            setSelectedTheme({
                ...selectedTheme,
                backgroundImage: customImageUrl,
            })
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            // In production, save to database
            if (tripId) {
                await fetch(`/api/trip/${tripId}/theme`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(selectedTheme),
                })
            }
            onThemeChange?.(selectedTheme)
            setOpen(false)
        } catch (error) {
            console.error("Failed to save theme:", error)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
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
                            className="h-24 rounded-lg flex items-center justify-center text-white font-medium"
                            style={{
                                background: selectedTheme.gradientFrom
                                    ? `linear-gradient(135deg, ${selectedTheme.gradientFrom}, ${selectedTheme.gradientTo})`
                                    : selectedTheme.backgroundColor,
                            }}
                        >
                            Preview
                        </div>

                        {/* Preset Themes */}
                        <div>
                            <Label className="text-sm font-medium mb-2 block">Preset Themes</Label>
                            <div className="grid grid-cols-6 gap-2">
                                {presetThemes.map((preset) => (
                                    <button
                                        key={preset.name}
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
                                    >
                                        {selectedTheme.backgroundColor === preset.theme.backgroundColor && (
                                            <Check className="h-4 w-4 text-white mx-auto" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Color */}
                        <div>
                            <Label className="text-sm font-medium mb-2 block">Custom Color</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="color"
                                    value={customColor}
                                    onChange={(e) => setCustomColor(e.target.value)}
                                    className="w-12 h-10 p-1 cursor-pointer"
                                />
                                <Input
                                    type="text"
                                    value={customColor}
                                    onChange={(e) => setCustomColor(e.target.value)}
                                    placeholder="#3b82f6"
                                    className="flex-1"
                                />
                                <Button variant="secondary" onClick={handleCustomColor}>
                                    Apply
                                </Button>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="images" className="space-y-4 pt-4">
                        {/* Preview */}
                        <div
                            className="h-24 rounded-lg flex items-center justify-center text-white font-medium bg-cover bg-center relative overflow-hidden"
                            style={{
                                backgroundImage: selectedTheme.backgroundImage
                                    ? `url(${selectedTheme.backgroundImage})`
                                    : undefined,
                                backgroundColor: selectedTheme.backgroundColor,
                            }}
                        >
                            <div className="absolute inset-0 bg-black/30" />
                            <span className="relative">Preview</span>
                        </div>

                        {/* Preset Images */}
                        <div>
                            <Label className="text-sm font-medium mb-2 block">Preset Backgrounds</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {presetImages.map((img) => (
                                    <button
                                        key={img.name}
                                        onClick={() => handleSelectImage(img.url)}
                                        className={cn(
                                            "aspect-video rounded-lg bg-cover bg-center border-2 transition-all relative overflow-hidden",
                                            selectedTheme.backgroundImage === img.url
                                                ? "border-foreground scale-105"
                                                : "border-transparent hover:scale-105"
                                        )}
                                        style={{ backgroundImage: `url(${img.url})` }}
                                        title={img.name}
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
                            <Label className="text-sm font-medium mb-2 block">Custom Image URL</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="url"
                                    value={customImageUrl}
                                    onChange={(e) => setCustomImageUrl(e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                    className="flex-1"
                                />
                                <Button variant="secondary" onClick={handleCustomImage}>
                                    Apply
                                </Button>
                            </div>
                        </div>

                        {/* Clear Image */}
                        {selectedTheme.backgroundImage && (
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() =>
                                    setSelectedTheme({ ...selectedTheme, backgroundImage: undefined })
                                }
                            >
                                Remove Background Image
                            </Button>
                        )}
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Save Theme
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
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
