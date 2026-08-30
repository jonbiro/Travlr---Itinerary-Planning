import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { InstallPrompt } from "@/components/pwa/install-prompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Travlr - AI Travel Planner",
  description: "Plan your perfect trip with AI-powered itinerary generation, expense tracking, and travel memories",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Travlr",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    title: "Travlr - AI Travel Planner",
    description: "Plan your perfect trip with AI-powered itinerary generation",
    siteName: "Travlr",
  },
  twitter: {
    card: "summary_large_image",
    title: "Travlr - AI Travel Planner",
    description: "Plan your perfect trip with AI-powered itinerary generation",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <ServiceWorkerRegistration />
        <a
          href="#main-content"
          className="sr-only fixed left-4 top-4 z-[100] rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Skip to content
        </a>
        <Navbar />
        <div id="main-content" tabIndex={-1} className="flex-1 min-w-0 outline-none">
          {children}
        </div>
        <Toaster />
        <InstallPrompt />
      </body>
    </html>
  );
}
