import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * Prisma 7 removed the built-in Rust query engine and requires an explicit
 * driver adapter — `new PrismaClient()` with no arguments throws:
 * "Using engine type 'client' requires either 'adapter' or 'accelerateUrl'
 * to be provided to PrismaClient constructor."
 * https://pris.ly/d/client-constructor
 */
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  // The pg driver has no connection timeout by default — Prisma 6's old
  // engine defaulted to 5s. Without this, a bad connection string or an
  // unreachable DB hangs forever instead of failing fast.
  connectionTimeoutMillis: 5_000,
  max: 10,
})

// Singleton across hot-reloads (dev) and across every package that imports
// this — nothing else in the monorepo should call `new PrismaClient()`
// directly, they should all import `prisma` from here.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Note for later, if you're on a managed Postgres host (Supabase, RDS, etc.)
// requiring SSL: v7's pg-based connection is stricter about certificates
// than the old Rust engine was. If you hit P1010/SSL errors, that's the
// adapter's `ssl` option, not a schema or code problem.