
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CreateTripForm } from './create-trip-form'

// Mock the API call
global.fetch = vi.fn()

// Mock sonner toast
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

describe('CreateTripForm', () => {
    it('renders correctly', () => {
        render(<CreateTripForm />)
        expect(screen.getByLabelText(/Destination/i)).toBeInTheDocument()
        expect(screen.getByText(/Start Date/i)).toBeInTheDocument()
        expect(screen.getByText(/End Date/i)).toBeInTheDocument()
        expect(screen.getByText(/Budget Level/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Generate with AI/i })).toBeInTheDocument()
    })

    // Add more tests as needed
})
