import Link from "next/link"
import { ArrowRight, Compass, Globe2, MapPin, Sparkles } from "lucide-react"
import type { Metadata } from "next"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = {
    title: "Explore Destinations | Travlr",
    description: "Find inspiration for your next trip and start planning with Travlr.",
}

const destinations = [
    {
        name: "Tokyo, Japan",
        description: "Neon neighborhoods, quiet temples, and unforgettable food in one electric city.",
        highlights: ["Food and culture", "Cherry blossoms", "City adventures"],
        accent: "from-rose-500/20 via-orange-400/10 to-transparent",
        icon: "🗼",
    },
    {
        name: "Lisbon, Portugal",
        description: "Wander tiled streets, ride the historic trams, and slow down by the Atlantic.",
        highlights: ["Coastal day trips", "Local cuisine", "Historic neighborhoods"],
        accent: "from-amber-400/20 via-yellow-300/10 to-transparent",
        icon: "🚋",
    },
    {
        name: "Reykjavik, Iceland",
        description: "Use a colorful capital as your base for waterfalls, hot springs, and wide-open skies.",
        highlights: ["Northern lights", "Hot springs", "Road trips"],
        accent: "from-cyan-400/20 via-blue-400/10 to-transparent",
        icon: "🌌",
    },
    {
        name: "Mexico City, Mexico",
        description: "A creative, historic city with world-class museums, markets, and neighborhoods to explore.",
        highlights: ["Art and design", "Markets", "Weekend escapes"],
        accent: "from-emerald-400/20 via-teal-400/10 to-transparent",
        icon: "🌵",
    },
    {
        name: "Cape Town, South Africa",
        description: "Combine mountain views, dramatic coastlines, and a vibrant food and wine scene.",
        highlights: ["Outdoor adventures", "Beaches", "Food and wine"],
        accent: "from-violet-500/20 via-fuchsia-400/10 to-transparent",
        icon: "⛰️",
    },
    {
        name: "Vancouver, Canada",
        description: "Enjoy an easy mix of city comforts, forests, mountains, and waterfront walks.",
        highlights: ["Nature in the city", "Cycling", "Mountain escapes"],
        accent: "from-sky-400/20 via-indigo-400/10 to-transparent",
        icon: "🌲",
    },
] as const

export default function ExplorePage() {
    return (
        <main className="min-h-[calc(100vh-4rem)]">
            <section className="border-b bg-muted/30">
                <div className="container px-4 py-16 md:px-6 md:py-24">
                    <div className="mx-auto max-w-3xl text-center">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                            <Compass className="h-4 w-4" />
                            Inspiration for your next adventure
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                            Go somewhere worth remembering.
                        </h1>
                        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                            Browse a few ideas, then let Travlr turn the one that catches your eye into a thoughtful itinerary.
                        </p>
                        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                            <Button asChild size="lg">
                                <Link href="/dashboard">
                                    Start planning
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild size="lg" variant="outline">
                                <Link href="/trips">View my trips</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="container px-4 py-12 md:px-6 md:py-16" aria-labelledby="destination-heading">
                <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
                            <Globe2 className="h-4 w-4" />
                            Curated ideas
                        </div>
                        <h2 id="destination-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
                            Where will you go next?
                        </h2>
                        <p className="mt-2 text-muted-foreground">
                            Every destination is a starting point. Make it yours in the dashboard.
                        </p>
                    </div>
                    <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                        Create a custom trip
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {destinations.map((destination) => (
                        <Card key={destination.name} className="overflow-hidden transition-shadow hover:shadow-md">
                            <div className={`flex h-32 items-end bg-gradient-to-br ${destination.accent} p-6`}>
                                <span className="text-5xl" role="img" aria-label={`${destination.name} illustration`}>
                                    {destination.icon}
                                </span>
                            </div>
                            <CardHeader>
                                <CardTitle>{destination.name}</CardTitle>
                                <CardDescription>{destination.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    {destination.highlights.map((highlight) => (
                                        <li key={highlight} className="flex items-center gap-2">
                                            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                                            {highlight}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button asChild variant="outline" className="w-full">
                                    <Link href="/dashboard">
                                        Plan this destination
                                        <Sparkles className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </section>
        </main>
    )
}
