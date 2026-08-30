import Link from "next/link"
import { ArrowLeft, MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function NotFound() {
    return (
        <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
            <div className="max-w-md text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MapPin className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="mt-5 text-sm font-medium text-primary">404</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight">That place is off the map</h1>
                <p className="mt-3 text-muted-foreground">
                    We couldn’t find the page you were looking for. Let’s get you back to a useful starting point.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <Button asChild>
                        <Link href="/">
                            <ArrowLeft className="h-4 w-4" />
                            Back home
                        </Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/explore">Explore destinations</Link>
                    </Button>
                </div>
            </div>
        </main>
    )
}
