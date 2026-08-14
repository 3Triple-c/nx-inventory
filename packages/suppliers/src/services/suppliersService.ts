import { prisma } from '@nx-inventory/database'

export async function listSuppliers(businessId: string) {
  return prisma.supplier.findMany({
    where: { businessId },
    orderBy: { name: 'asc' },
  })
}

export async function createSupplier(params: {
  businessId: string
  name: string
  email?: string
  phone?: string
  address?: string
}) {
  return prisma.supplier.create({
    data: {
      businessId: params.businessId,
      name: params.name,
      email: params.email,
      phone: params.phone,
      address: params.address,
    },
  })
}