import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

type PrismaGlobal = {
    prisma?: PrismaClient
    pool?: Pool
    connectionString?: string
}

// Keep both objects on globalThis so route modules reloaded by Next.js (and
// production server instances handling many requests) reuse one pool.
const globalForPrisma = globalThis as unknown as PrismaGlobal

export const DEMO_USER_ID = "demo-user"

function configuredPoolSize() {
    const value = Number.parseInt(process.env.DATABASE_POOL_MAX ?? "", 10)
    return Number.isInteger(value) && value > 0 ? value : 10
}

export function isDatabaseConfigured() {
    return Boolean(process.env.DATABASE_URL)
}

export function getPrismaClient(): PrismaClient | null {
    const connectionString = process.env.DATABASE_URL

    if (!connectionString) {
        return null
    }

    if (
        globalForPrisma.prisma &&
        globalForPrisma.connectionString === connectionString
    ) {
        return globalForPrisma.prisma
    }

    const pool = new Pool({
        connectionString,
        // A bounded pool prevents a burst of route requests from exhausting a
        // hosted Postgres instance. Override for a specific deployment when
        // needed without changing application code.
        max: configuredPoolSize(),
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000,
    })
    const adapter = new PrismaPg(pool)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma = new PrismaClient({ adapter } as any)

    globalForPrisma.pool = pool
    globalForPrisma.prisma = prisma
    globalForPrisma.connectionString = connectionString
    return prisma
}

export async function ensureDemoUser(prisma: PrismaClient) {
    return prisma.user.upsert({
        where: { id: DEMO_USER_ID },
        update: {},
        create: {
            id: DEMO_USER_ID,
            name: "Demo User",
            email: "demo@example.com",
        },
    })
}
