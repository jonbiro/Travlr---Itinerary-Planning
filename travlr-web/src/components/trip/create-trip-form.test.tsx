
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CreateTripForm, serializeCreateTripDates } from './create-trip-form'

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

    it('prefills the requested destination and toggles interests accessibly', () => {
        render(<CreateTripForm initialDestination="Lisbon, Portugal" initialInterests={["food", "culture"]} />)

        expect(screen.getByLabelText(/Destination/i)).toHaveValue('Lisbon, Portugal')

        const foodInterest = screen.getByRole('button', { name: /Food & drink/i })
        expect(foodInterest).toHaveAttribute('aria-pressed', 'true')

        fireEvent.click(foodInterest)
        expect(foodInterest).toHaveAttribute('aria-pressed', 'false')

        fireEvent.click(foodInterest)
        expect(foodInterest).toHaveAttribute('aria-pressed', 'true')
    })

    it('serializes selected dates as calendar days instead of JSON Date instants', () => {
        const startDate = new Date(2026, 8, 10, 0, 0, 0, 0)
        const endDate = new Date(2026, 8, 14, 0, 0, 0, 0)

        expect(serializeCreateTripDates({
            destination: 'Tokyo, Japan',
            startDate,
            endDate,
            budget: 'moderate',
            interests: [],
        })).toMatchObject({
            startDate: '2026-09-10',
            endDate: '2026-09-14',
        })
    })
})
