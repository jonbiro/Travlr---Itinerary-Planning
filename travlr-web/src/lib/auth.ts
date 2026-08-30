import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import { getPrismaClient } from "@/lib/prisma"

const prisma = getPrismaClient()

/**
 * Travlr currently supports Google as its only production sign-in provider.
 * Treat auth as configured only when all of the values needed to complete the
 * OAuth flow are present; a partially-filled local .env should not silently
 * turn the app into a broken auth-only experience.
 */
export function isAuthConfigured() {
    return Boolean(
        process.env.NEXTAUTH_SECRET?.trim() &&
        process.env.GOOGLE_CLIENT_ID?.trim() &&
        process.env.GOOGLE_CLIENT_SECRET?.trim(),
    )
}

/** Return true for both complete and partially supplied auth settings. */
export function hasAuthConfiguration() {
    return Boolean(
        process.env.NEXTAUTH_SECRET?.trim() ||
        process.env.GOOGLE_CLIENT_ID?.trim() ||
        process.env.GOOGLE_CLIENT_SECRET?.trim(),
    )
}

export const authOptions: NextAuthOptions = {
    ...(prisma ? { adapter: PrismaAdapter(prisma) } : {}),
    // Without a Prisma adapter NextAuth defaults to JWT sessions. Being
    // explicit keeps session handling correct when the database is omitted
    // from a local auth smoke test.
    session: {
        strategy: prisma ? "database" : "jwt",
    },
    providers: isAuthConfigured()
        ? [GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        })]
        : [],
    callbacks: {
        async jwt({ token, user }) {
            if (user?.id) {
                token.sub = user.id;
            }
            return token;
        },
        async session({ session, user, token }) {
            const userId = user?.id ?? token.sub
            if (session.user && userId) {
                session.user.id = userId;
            }
            return session;
        },
    },
}
