// Export service for generating CSV and other export formats
import { Trip } from "@/lib/types/trip"

export interface ExportColumn {
    key: string
    header: string
    formatter?: (value: unknown) => string
}

// Generate CSV content from data
export function generateCSV<T extends Record<string, unknown>>(
    data: T[],
    columns: ExportColumn[]
): string {
    const escapeCSV = (value: unknown): string => {
        if (value === null || value === undefined) return ''
        const str = String(value)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
        }
        return str
    }

    // Headers
    const headers = columns.map(col => escapeCSV(col.header)).join(',')

    // Rows
    const rows = data.map(item =>
        columns
            .map(col => {
                const value = item[col.key]
                const formatted = col.formatter ? col.formatter(value) : value
                return escapeCSV(formatted)
            })
            .join(',')
    )

    return [headers, ...rows].join('\n')
}

// Download CSV file
export function downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

// Download JSON file
export function downloadJSON(data: unknown, filename: string) {
    const content = JSON.stringify(data, null, 2)
    const blob = new Blob([content], { type: 'application/json;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = filename.endsWith('.json') ? filename : `${filename}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

// Format date for export
export function formatDateForExport(date: unknown): string {
    if (!date) return ''
    const d = new Date(date as string | Date | number)
    return d.toISOString().split('T')[0]
}

// Format currency for export
export function formatCurrencyForExport(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    }).format(amount)
}

// Export itinerary to CSV
export function exportItineraryToCSV(trip: Partial<Trip>) {
    const rows: Record<string, unknown>[] = []

    trip.days?.forEach(day => {
        day.activities.forEach(activity => {
            rows.push({
                day: day.day,
                theme: day.theme || '',
                time: activity.time || '',
                activity: activity.name,
                description: activity.description || '',
                location: activity.location || '',
            })
        })
    })

    const columns: ExportColumn[] = [
        { key: 'day', header: 'Day' },
        { key: 'theme', header: 'Theme' },
        { key: 'time', header: 'Time' },
        { key: 'activity', header: 'Activity' },
        { key: 'description', header: 'Description' },
        { key: 'location', header: 'Location' },
    ]

    const csv = generateCSV(rows, columns)
    const tripName = trip.tripName || 'trip'
    const filename = `${tripName.replace(/\s+/g, '-').toLowerCase()}-itinerary`
    downloadCSV(csv, filename)
}

// Export expenses to CSV
export function exportExpensesToCSV(
    expenses: Array<{
        date: Date | string
        category: string
        amount: number
        currency: string
        description?: string
    }>,
    tripName: string
) {
    const columns: ExportColumn[] = [
        { key: 'date', header: 'Date', formatter: formatDateForExport },
        { key: 'category', header: 'Category' },
        { key: 'amount', header: 'Amount' },
        { key: 'currency', header: 'Currency' },
        { key: 'description', header: 'Description' },
    ]

    const csv = generateCSV(expenses, columns)
    const filename = `${tripName.replace(/\s+/g, '-').toLowerCase()}-expenses`
    downloadCSV(csv, filename)
}

// Export packing list to CSV
export function exportPackingListToCSV(
    items: Array<{
        name: string
        category?: string
        packed: boolean
        quantity?: number
    }>,
    tripName: string
) {
    const columns: ExportColumn[] = [
        { key: 'name', header: 'Item' },
        { key: 'category', header: 'Category' },
        { key: 'quantity', header: 'Quantity' },
        { key: 'packed', header: 'Packed', formatter: (v) => v ? 'Yes' : 'No' },
    ]

    const csv = generateCSV(items, columns)
    const filename = `${tripName.replace(/\s+/g, '-').toLowerCase()}-packing-list`
    downloadCSV(csv, filename)
}

// Export full trip as JSON (for backup/import)
export function exportTripAsJSON(trip: Partial<Trip>) {
    const filename = `${trip.tripName?.replace(/\s+/g, '-').toLowerCase() || 'trip'}-backup`
    downloadJSON(trip, filename)
}

// Generate markdown export
export function exportItineraryToMarkdown(trip: Partial<Trip>): string {
    let md = `# ${trip.tripName || 'Trip'}\n\n`

    if (trip.destination) {
        md += `📍 **Destination:** ${trip.destination}\n\n`
    }

    if (trip.startDate && trip.endDate) {
        md += `📅 ${formatDateForExport(trip.startDate)} - ${formatDateForExport(trip.endDate)}\n\n`
    }

    md += `---\n\n`

    trip.days?.forEach(day => {
        md += `## Day ${day.day}`
        if (day.theme) {
            md += `: ${day.theme}`
        }
        md += `\n\n`

        day.activities.forEach(activity => {
            md += `### ${activity.time ? `${activity.time} - ` : ''}${activity.name}\n\n`

            if (activity.description) {
                md += `${activity.description}\n\n`
            }

            if (activity.location) {
                md += `📍 *${activity.location}*\n\n`
            }
        })
    })

    return md
}

// Download markdown file
export function downloadMarkdown(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = filename.endsWith('.md') ? filename : `${filename}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

export function exportItineraryAsMarkdown(trip: Partial<Trip>) {
    const md = exportItineraryToMarkdown(trip)
    const filename = `${trip.tripName?.replace(/\s+/g, '-').toLowerCase() || 'trip'}-itinerary`
    downloadMarkdown(md, filename)
}
