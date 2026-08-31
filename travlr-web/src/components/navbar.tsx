"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MapPin, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const navigation = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/trips", label: "My Trips" },
    { href: "/stats", label: "Stats" },
    { href: "/explore", label: "Explore" },
]

type NavbarProps = {
    demoMode: boolean
    authConfigured: boolean
}

function isCurrentPath(pathname: string, href: string) {
    return pathname === href || pathname.startsWith(`${href}/`)
}

export function Navbar({ demoMode, authConfigured }: NavbarProps) {
    const pathname = usePathname()

    return (
        <nav aria-label="Primary navigation" className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container flex h-16 items-center px-4">
                <Link href="/" aria-label="Travlr home" className="flex items-center gap-2 font-bold text-xl mr-6">
                    <div aria-hidden="true" className="bg-primary text-primary-foreground p-1 rounded-lg">
                        <MapPin className="h-5 w-5" />
                    </div>
                    Travlr
                </Link>
                <div className="hidden md:flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    {navigation.map((item) => {
                        const isCurrent = isCurrentPath(pathname, item.href)

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={isCurrent ? "page" : undefined}
                                className={cn(
                                    "rounded-md px-2.5 py-1.5 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    isCurrent && "bg-muted text-foreground",
                                )}
                            >
                                {item.label}
                            </Link>
                        )
                    })}
                </div>
                <div className="ml-auto flex items-center gap-3">
                    {demoMode ? (
                        <Badge variant="secondary" className="hidden sm:inline-flex">Demo mode</Badge>
                    ) : authConfigured ? (
                        <Link href="/api/auth/signin" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                            Sign in
                        </Link>
                    ) : null}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Navigation menu">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48" align="end">
                            {navigation.map((item) => {
                                const isCurrent = isCurrentPath(pathname, item.href)

                                return (
                                    <DropdownMenuItem key={item.href} asChild>
                                        <Link
                                            href={item.href}
                                            aria-current={isCurrent ? "page" : undefined}
                                            className={cn(isCurrent && "bg-accent font-medium text-accent-foreground")}
                                        >
                                            {item.label}
                                        </Link>
                                    </DropdownMenuItem>
                                )
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </nav>
    )
}
