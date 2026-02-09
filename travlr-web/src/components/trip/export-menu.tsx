"use client"

import { useState } from "react"
import { Download, FileSpreadsheet, FileJson, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
    exportItineraryToCSV,
    exportItineraryAsMarkdown,
    exportTripAsJSON,
    exportExpensesToCSV,
    exportPackingListToCSV,
} from "@/lib/export-service"

interface ExportMenuProps {
    trip?: {
        tripName: string
        destination?: string
        startDate?: string | Date
        endDate?: string | Date
        days?: Array<{
            day: number
            theme?: string
            activities: Array<{
                name: string
                time?: string
                description?: string
                location?: string
            }>
        }>
    }
    expenses?: Array<{
        date: Date | string
        category: string
        amount: number
        currency: string
        description?: string
    }>
    packingItems?: Array<{
        name: string
        category?: string
        packed: boolean
        quantity?: number
    }>
    className?: string
}

export function ExportMenu({ trip, expenses, packingItems, className }: ExportMenuProps) {
    const [isExporting, setIsExporting] = useState<string | null>(null)

    const handleExport = async (type: string) => {
        if (!trip) return

        setIsExporting(type)

        try {
            // Small delay to show loading state
            await new Promise(resolve => setTimeout(resolve, 300))

            switch (type) {
                case 'itinerary-csv':
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    exportItineraryToCSV(trip as any)
                    break
                case 'itinerary-md':
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    exportItineraryAsMarkdown(trip as any)
                    break
                case 'trip-json':
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    exportTripAsJSON(trip as any)
                    break
                case 'expenses-csv':
                    if (expenses && expenses.length > 0) {
                        exportExpensesToCSV(expenses, trip.tripName)
                    }
                    break
                case 'packing-csv':
                    if (packingItems && packingItems.length > 0) {
                        exportPackingListToCSV(packingItems, trip.tripName)
                    }
                    break
            }
        } catch (error) {
            console.error('Export failed:', error)
        } finally {
            setTimeout(() => setIsExporting(null), 500)
        }
    }

    if (!trip) return null

    const hasItinerary = trip.days && trip.days.length > 0
    const hasExpenses = expenses && expenses.length > 0
    const hasPackingList = packingItems && packingItems.length > 0

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={cn("gap-2", className)}>
                    <Download className="h-4 w-4" />
                    Export
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Export Trip Data</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {hasItinerary && (
                    <>
                        <DropdownMenuItem
                            onClick={() => handleExport('itinerary-csv')}
                            disabled={isExporting !== null}
                        >
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            <span className="flex-1">Itinerary (CSV)</span>
                            {isExporting === 'itinerary-csv' && (
                                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => handleExport('itinerary-md')}
                            disabled={isExporting !== null}
                        >
                            <FileText className="h-4 w-4 mr-2" />
                            <span className="flex-1">Itinerary (Markdown)</span>
                            {isExporting === 'itinerary-md' && (
                                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                            )}
                        </DropdownMenuItem>
                    </>
                )}

                {hasExpenses && (
                    <DropdownMenuItem
                        onClick={() => handleExport('expenses-csv')}
                        disabled={isExporting !== null}
                    >
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        <span className="flex-1">Expenses (CSV)</span>
                        {isExporting === 'expenses-csv' && (
                            <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        )}
                    </DropdownMenuItem>
                )}

                {hasPackingList && (
                    <DropdownMenuItem
                        onClick={() => handleExport('packing-csv')}
                        disabled={isExporting !== null}
                    >
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        <span className="flex-1">Packing List (CSV)</span>
                        {isExporting === 'packing-csv' && (
                            <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        )}
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onClick={() => handleExport('trip-json')}
                    disabled={isExporting !== null}
                >
                    <FileJson className="h-4 w-4 mr-2" />
                    <span className="flex-1">Full Trip (JSON)</span>
                    {isExporting === 'trip-json' && (
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    )}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
