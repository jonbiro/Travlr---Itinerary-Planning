import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  CalendarDays,
  Check,
  Compass,
  Map,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const planningPillars = [
  {
    icon: Map,
    eyebrow: "01",
    title: "Shape the big picture",
    description:
      "Start with a destination, dates, and a few interests. Travlr turns the blank page into a practical route.",
  },
  {
    icon: Users,
    eyebrow: "02",
    title: "Bring your people in",
    description:
      "Share one trip plan with the people coming along so the important details stay easy to find.",
  },
  {
    icon: CalendarDays,
    eyebrow: "03",
    title: "Leave room to wander",
    description:
      "Keep days, places, expenses, memories, and last-minute ideas together as the trip takes shape.",
  },
] as const

const trustNotes = ["Day-by-day itinerary", "Shared trip context", "Installable app shell"]

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col overflow-hidden">
      <section className="relative border-b bg-muted/20">
        <div className="pointer-events-none absolute -left-40 top-16 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-amber-200/20 blur-3xl dark:bg-amber-400/10" />

        <div className="container relative grid gap-12 px-4 py-14 md:px-6 md:py-20 lg:grid-cols-[minmax(0,0.88fr)_minmax(480px,1.12fr)] lg:items-center lg:gap-16 lg:py-24 xl:py-28">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1.5 text-sm font-medium text-primary shadow-sm backdrop-blur">
              <Compass className="h-4 w-4" aria-hidden="true" />
              Travel planning, with room to wander
            </div>

            <h1 className="text-balance text-5xl font-semibold tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Plan less. Be there more.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
              Travlr turns a loose idea into a thoughtful, shareable itinerary—so the logistics are ready when you are.
            </p>

            <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
              <Button asChild size="lg" className="h-12 rounded-full px-7">
                <Link href="/dashboard">
                  Start planning
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-7">
                <Link href="/explore">Explore destinations</Link>
              </Button>
            </div>

            <div className="mt-10 grid gap-3 border-t pt-6 sm:grid-cols-3 sm:gap-5">
              {trustNotes.map((note) => (
                <div key={note} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                  </span>
                  {note}
                </div>
              ))}
            </div>
          </div>

          <figure className="relative min-h-[420px] overflow-hidden rounded-[2rem] border bg-muted shadow-2xl shadow-primary/10 sm:min-h-[520px] lg:min-h-[600px]">
            <Image
              src="/images/hero-travel-planning.webp"
              alt="Two friends planning a Lisbon trip over a map by a sunny window"
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 56vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-black/10" aria-hidden="true" />
            <figcaption className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/40 bg-background/90 p-4 shadow-xl backdrop-blur sm:inset-x-6 sm:bottom-6 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    Next up
                  </div>
                  <p className="mt-2 text-lg font-semibold">Lisbon, Portugal</p>
                  <p className="mt-1 text-sm text-muted-foreground">A five-day route for two</p>
                </div>
                <div className="rounded-xl bg-primary/10 px-3 py-2 text-right text-xs font-medium text-primary">
                  <span className="block text-base font-semibold">5</span>
                  days
                </div>
              </div>
            </figcaption>
          </figure>
        </div>
      </section>

      <section id="how-it-works" className="w-full border-b py-16 md:py-24" aria-labelledby="how-it-works-heading">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              A calmer way to get ready
            </div>
            <h2 id="how-it-works-heading" className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              From daydream to departure
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Keep the fun decisions front and center while Travlr gives the practical details a place to land.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-3">
            {planningPillars.map(({ icon: Icon, eyebrow, title, description }) => (
              <Card key={title} className="gap-4 border-muted-foreground/15 bg-card/80 py-6 shadow-sm transition-shadow hover:shadow-md">
                <CardHeader className="gap-5">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">{eyebrow}</span>
                  </div>
                  <CardTitle className="text-xl">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-6">{description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full bg-muted/35 py-16 md:py-24" aria-labelledby="features-heading">
        <div className="container grid gap-10 px-4 md:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-20">
          <div className="max-w-lg">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">One home for the trip</p>
            <h2 id="features-heading" className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              The useful stuff, together.
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Make a plan that is clear enough to follow and flexible enough to change when you find somewhere better.
            </p>
            <Button asChild variant="link" className="mt-5 h-auto px-0 text-base">
              <Link href="/dashboard">
                Open your planning space
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-muted-foreground/15 shadow-sm">
              <CardHeader>
                <Map className="h-6 w-6 text-primary" aria-hidden="true" />
                <CardTitle className="mt-2">Smart itineraries</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="leading-6">
                  Generate an organized day-by-day plan, then adjust the details as your trip gets real.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border-muted-foreground/15 shadow-sm">
              <CardHeader>
                <Users className="h-6 w-6 text-primary" aria-hidden="true" />
                <CardTitle className="mt-2">Shared trip context</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="leading-6">
                  Invite your people to view the same plan and keep trip details, expenses, and memories close by.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border-muted-foreground/15 shadow-sm">
              <CardHeader>
                <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
                <CardTitle className="mt-2">Useful suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="leading-6">
                  Get ideas for restaurants, attractions, and stays shaped around the way you want to travel.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border-muted-foreground/15 shadow-sm">
              <CardHeader>
                <CalendarDays className="h-6 w-6 text-primary" aria-hidden="true" />
                <CardTitle className="mt-2">Ready when you are</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="leading-6">
                  Travlr is installable for a quick open on the go; connect when you need the latest shared trip data.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <footer className="border-t py-7">
        <div className="container flex flex-col gap-2 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-6">
          <p>© {new Date().getFullYear()} Travlr. Make the next trip a good one.</p>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Plan with intention. Wander with ease.</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
