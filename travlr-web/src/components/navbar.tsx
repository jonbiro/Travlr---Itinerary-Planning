import Link from "next/link"
import { MapPin, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { isAuthConfigured } from "@/lib/auth"
import { isDemoMode } from "@/lib/current-user"
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

export function Navbar() {
    const demoMode = isDemoMode()
    const authConfigured = isAuthConfigured()

    return (
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container flex h-16 items-center px-4">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl mr-6">
                    <div className="bg-primary text-primary-foreground p-1 rounded-lg">
                        <MapPin className="h-5 w-5" />
                    </div>
                    Travlr
                </Link>
                <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
                    {navigation.map((item) => (
                        <Link key={item.href} href={item.href} className="transition-colors hover:text-foreground">
                            {item.label}
                        </Link>
                    ))}
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
                            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation menu">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48" align="end">
                            {navigation.map((item) => (
                                <DropdownMenuItem key={item.href} asChild>
                                    <Link href={item.href}>{item.label}</Link>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </nav>
    )
}
