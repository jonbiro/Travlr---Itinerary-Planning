import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Compass, Globe2, MapPin, Sparkles } from "lucide-react"

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
    name: "Tokyo",
    country: "Japan",
    description: "Neon neighborhoods, quiet temples, and unforgettable food in one electric city.",
    highlights: ["Food and culture", "City adventures", "Day trips"],
    interests: ["food", "culture", "nightlife"],
    image: "/images/destinations/tokyo.webp",
    imageAlt: "Tokyo street scene glowing with warm evening light",
  },
  {
    name: "Lisbon",
    country: "Portugal",
    description: "Wander tiled streets, ride the historic trams, and slow down by the Atlantic.",
    highlights: ["Coastal day trips", "Local cuisine", "Historic neighborhoods"],
    interests: ["food", "culture", "nature"],
    image: "/images/destinations/lisbon.webp",
    imageAlt: "Lisbon rooftops and a sunlit waterfront",
  },
  {
    name: "Reykjavik",
    country: "Iceland",
    description: "Use a colorful capital as your base for waterfalls, hot springs, and wide-open skies.",
    highlights: ["Northern lights", "Hot springs", "Road trips"],
    interests: ["nature", "wellness"],
    image: "/images/destinations/reykjavik.webp",
    imageAlt: "Reykjavik waterfront and mountains beneath a clear sky",
  },
  {
    name: "Mexico City",
    country: "Mexico",
    description: "A creative, historic city with world-class museums, markets, and neighborhoods to explore.",
    highlights: ["Art and design", "Markets", "Weekend escapes"],
    interests: ["culture", "food", "architecture"],
    image: "/images/destinations/mexico-city.webp",
    imageAlt: "Mexico City architecture and leafy streets in warm daylight",
  },
  {
    name: "Cape Town",
    country: "South Africa",
    description: "Combine mountain views, dramatic coastlines, and a vibrant food and wine scene.",
    highlights: ["Outdoor adventures", "Beaches", "Food and wine"],
    interests: ["nature", "food"],
    image: "/images/destinations/cape-town.webp",
    imageAlt: "Cape Town coastline with dramatic mountains in the distance",
  },
  {
    name: "Vancouver",
    country: "Canada",
    description: "Enjoy an easy mix of city comforts, forests, mountains, and waterfront walks.",
    highlights: ["Nature in the city", "Cycling", "Mountain escapes"],
    interests: ["nature", "wellness"],
    image: "/images/destinations/vancouver.webp",
    imageAlt: "Vancouver skyline framed by forest and mountain peaks",
  },
] as const

function planHref(destination: (typeof destinations)[number]) {
  const destinationName = `${destination.name}, ${destination.country}`
  const interests = destination.interests.join(",")

  return `/dashboard?destination=${encodeURIComponent(destinationName)}&create=1&interests=${encodeURIComponent(interests)}`
}

export default function ExplorePage() {
  return (
    <main className="min-h-[calc(100vh-4rem)]">
      <section className="border-b bg-muted/25">
        <div className="container grid gap-10 px-4 py-12 md:px-6 md:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16 lg:py-20">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1.5 text-sm font-medium text-primary shadow-sm">
              <Compass className="h-4 w-4" aria-hidden="true" />
              Inspiration for your next adventure
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-5xl lg:text-6xl">
              Go somewhere worth remembering.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
              Browse a few ideas, then let Travlr turn the place that catches your eye into a thoughtful itinerary.
            </p>
            <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
              <Button asChild size="lg" className="rounded-full px-7">
                <Link href="/dashboard?create=1">
                  Start planning
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-7">
                <Link href="/trips">View my trips</Link>
              </Button>
            </div>
          </div>

          <div className="relative min-h-[340px] overflow-hidden rounded-[2rem] border bg-muted shadow-xl shadow-primary/10 sm:min-h-[430px]">
            <Image
              src="/images/destinations/lisbon.webp"
              alt="Lisbon rooftops beside the Atlantic"
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 52vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/15" aria-hidden="true" />
            <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/40 bg-background/90 p-4 shadow-lg backdrop-blur sm:bottom-6 sm:left-6 sm:right-auto sm:min-w-64">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Start with a feeling</p>
              <div className="mt-2 flex items-center gap-2 font-semibold">
                <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                Lisbon, Portugal
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Slow mornings, tiled streets, ocean air.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container px-4 py-12 md:px-6 md:py-16" aria-labelledby="destination-heading">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              <Globe2 className="h-4 w-4" aria-hidden="true" />
              Curated ideas
            </div>
            <h2 id="destination-heading" className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              Where will you go next?
            </h2>
            <p className="mt-2 text-muted-foreground">Pick a place, choose what matters to you, and make it yours in the dashboard.</p>
          </div>
          <Link href="/dashboard?create=1" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Create a custom trip
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((destination) => (
            <Card key={destination.name} className="group gap-0 overflow-hidden py-0 transition-all hover:-translate-y-1 hover:shadow-xl">
              <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                <Image
                  src={destination.image}
                  alt={destination.imageAlt}
                  fill
                  sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/65 via-black/15 to-transparent px-5 pb-4 pt-12 text-white">
                  <div>
                    <p className="text-lg font-semibold">{destination.name}</p>
                    <p className="text-sm text-white/80">{destination.country}</p>
                  </div>
                  <span className="rounded-full border border-white/30 bg-black/20 px-2.5 py-1 text-xs font-medium backdrop-blur">
                    {destination.interests[0]}
                  </span>
                </div>
              </div>
              <CardHeader className="gap-2 pt-6">
                <CardTitle className="sr-only">{destination.name}, {destination.country}</CardTitle>
                <CardDescription className="leading-6">{destination.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {destination.highlights.map((highlight) => (
                    <span key={highlight} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      {highlight}
                    </span>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="pb-6 pt-2">
                <Button asChild variant="outline" className="w-full rounded-full">
                  <Link href={planHref(destination)}>
                    Plan {destination.name}
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
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
