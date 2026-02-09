import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Map, Users, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-background">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
            <div className="flex flex-col justify-center space-y-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                  Plan Your Next Adventure seamlessly.
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  Collaborate with friends, discover hidden gems, and build the perfect itinerary for your next trip.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Link href="/dashboard">
                  <Button size="lg" className="gap-2">
                    Start Planning <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/explore">
                  <Button size="lg" variant="outline">
                    Explore Destinations
                  </Button>
                </Link>
              </div>
            </div>
            <div className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full lg:order-last lg:aspect-square relative">
              <Image
                src="/hero.png"
                alt="Travel Hero"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm bg-primary/10 text-primary">Key Features</div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Everything you need to travel</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                From discovery to departure, Travlr helps you organize every detail of your journey.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 lg:gap-12 mt-8">
            <Card>
              <CardHeader>
                <Map className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Smart Itineraries</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Drag and drop events, routes, and reservations. Visualize your trip on an interactive map.
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Users className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Real-time Collaboration</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Invite friends to your trip. Vote on destinations and edit the plan together in real-time.
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Sparkles className="h-10 w-10 text-primary mb-2" />
                <CardTitle>AI Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Get personalized suggestions for restaurants, attractions, and hotels based on your preferences.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">© 2024 Travlr Inc. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  )
}
