"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Luggage } from "lucide-react"

interface PackingItem {
    item: string
    reason?: string
    checked: boolean
}

interface PackingCategory {
    name: string
    items: PackingItem[]
}

export function PackingList({ destination, days, activities }: { destination: string, days: number, activities: string[] }) {
    const [categories, setCategories] = useState<PackingCategory[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [generated, setGenerated] = useState(false)

    const generateList = async () => {
        setIsLoading(true)
        try {
            const response = await fetch("/api/trip/packing-list", {
                method: "POST",
                body: JSON.stringify({ destination, days, activities }),
            })
            const data = await response.json()
            setCategories(data.categories)
            setGenerated(true)
        } catch (error) {
            console.error("Failed to generate packing list", error)
        } finally {
            setIsLoading(false)
        }
    }

    const toggleItem = (categoryIndex: number, itemIndex: number) => {
        const newCategories = [...categories]
        newCategories[categoryIndex].items[itemIndex].checked = !newCategories[categoryIndex].items[itemIndex].checked
        setCategories(newCategories)
    }

    if (!generated) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="bg-primary/10 p-4 rounded-full">
                    <Luggage className="h-8 w-8 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold text-lg">Smart Packing List</h3>
                    <p className="text-sm text-muted-foreground">
                        Get a personalized list based on your activities and weather.
                    </p>
                </div>
                <Button onClick={generateList} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isLoading ? "Generating..." : "Generate List"}
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Luggage className="h-5 w-5" /> Packing List
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setGenerated(false)}>Regenerate</Button>
            </div>
            {categories.map((category, catIdx) => (
                <div key={catIdx} className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">{category.name}</h4>
                    <div className="space-y-2">
                        {category.items.map((item, itemIdx) => (
                            <div key={itemIdx} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                <Checkbox
                                    id={`item-${catIdx}-${itemIdx}`}
                                    checked={item.checked}
                                    onCheckedChange={() => toggleItem(catIdx, itemIdx)}
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <label
                                        htmlFor={`item-${catIdx}-${itemIdx}`}
                                        className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${item.checked ? "line-through text-muted-foreground" : ""}`}
                                    >
                                        {item.item}
                                    </label>
                                    {item.reason && (
                                        <p className="text-xs text-muted-foreground">
                                            {item.reason}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
