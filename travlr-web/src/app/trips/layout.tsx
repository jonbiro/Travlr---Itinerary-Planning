import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "My Trips | Travlr",
  robots: { index: false, follow: false },
}

export default function TripsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
