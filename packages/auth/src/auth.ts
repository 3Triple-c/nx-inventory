import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '@nx-inventory/database'

/**
 * Deliberately NOT using the `organization` plugin. Business/Membership
 * already cover multi-tenancy — richer than a generic "organization,"
 * since every other model (Warehouse, Purchase, Sale...) is already scoped
 * by businessId, and UserRole already carries OWNER/ADMIN/MANAGER/STAFF.
 * Better Auth's job stops at "who is this person and are they logged in";
 * Business/Membership answers "which business, and what can they do there."
 */
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // sliding expiration, refreshed daily on activity
  },
})

export type Auth = typeof auth