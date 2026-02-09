// Memory types for the memory keeper feature

export interface Memory {
    id: string
    tripId: string
    type: MemoryType
    title: string
    description?: string | null
    fileUrl?: string | null
    thumbnailUrl?: string | null
    content?: string | null // For notes
    date: Date | string
    location?: string | null
    createdAt: Date | string
}

export type MemoryType = 'photo' | 'video' | 'note' | 'document'

export const MEMORY_TYPES: { value: MemoryType; label: string; icon: string }[] = [
    { value: 'photo', label: 'Photo', icon: '📷' },
    { value: 'video', label: 'Video', icon: '🎬' },
    { value: 'note', label: 'Note', icon: '📝' },
    { value: 'document', label: 'Document', icon: '📄' },
]

export function getMemoryTypeInfo(type: MemoryType) {
    return MEMORY_TYPES.find(t => t.value === type) || MEMORY_TYPES[0]
}

export function getFileTypeFromUrl(url: string): MemoryType {
    const ext = url.split('.').pop()?.toLowerCase()
    if (!ext) return 'document'

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) return 'photo'
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return 'video'
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) return 'document'

    return 'document'
}
