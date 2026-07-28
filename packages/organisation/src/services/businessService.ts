import { prisma, UserRole, type BusinessType } from '@nx-inventory/database'

/**
 * Creates a Business and makes the given user its OWNER, atomically — you
 * never want a Business to exist with zero members, even for a split
 * second.
 */
export async function createBusinessForUser(params: {
  userId: string
  name: string
  type: BusinessType
}) {
  return prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: { name: params.name, type: params.type },
    })

    await tx.membership.create({
      data: {
        userId: params.userId,
        businessId: business.id,
        role: UserRole.OWNER,
      },
    })

    return business
  })
}

export interface BusinessContext {
  businessId: string
  businessName: string
  role: UserRole
}

/**
 * Resolves which business a request should be scoped to. Note what this
 * is NOT doing yet: Better Auth's session has no concept of "business" at
 * all, so there's nowhere to durably store "the business this user picked
 * to act as" — this just takes the user's first Membership every time.
 * That's correct for Phase 1 (one business per user in practice), but it's
 * the exact piece Phase 3's multi-business switching has to replace: at
 * that point, add an `activeBusinessId` field to the Session model (Better
 * Auth supports session additionalFields) so a user's explicit choice
 * persists across requests instead of always resolving to memberships[0].
 *
 * Returns null when the user has no Membership yet — the caller should
 * treat that as "needs onboarding," not an error.
 */
export async function getUserBusinessContext(userId: string): Promise<BusinessContext | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    include: { business: true },
    orderBy: { createdAt: 'asc' },
  })

  if (!membership) return null

  return {
    businessId: membership.businessId,
    businessName: membership.business.name,
    role: membership.role,
  }
}

export async function getUserMemberships(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    include: { business: true },
    orderBy: { createdAt: 'asc' },
  })
}