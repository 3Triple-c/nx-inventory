import { prisma, Prisma } from '@nx-inventory/database'

export class CategoryInUseError extends Error {}

export async function listCategories(businessId: string) {
  return prisma.category.findMany({
    where: { businessId },
    orderBy: { name: 'asc' },
  })
}

export async function createCategory(params: { businessId: string; name: string }) {
  return prisma.category.create({
    data: { businessId: params.businessId, name: params.name },
  })
}

export async function deleteCategory(id: string) {
  try {
    await prisma.category.delete({ where: { id } })
  } catch (err) {
    // P2003 = foreign key constraint failed — there are still Products
    // pointing at this category. Turn Postgres's raw error into something
    // a UI can actually show the user, rather than a stack trace.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      throw new CategoryInUseError(
        'This category still has products assigned to it. Move or delete those products first.'
      )
    }
    throw err
  }
}