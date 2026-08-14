import { prisma } from '@nx-inventory/database'

export async function listWarehouses(businessId: string) {
  return prisma.warehouse.findMany({
    where: { businessId },
    orderBy: { name: 'asc' },
  })
}

export async function createWarehouse(params: {
  businessId: string
  name: string
  address?: string
  phone?: string
}) {
  return prisma.warehouse.create({
    data: {
      businessId: params.businessId,
      name: params.name,
      address: params.address,
      phone: params.phone,
    },
  })
}

export async function updateWarehouse(
  id: string,
  params: Partial<{ name: string; address: string | null; phone: string | null }>
) {
  return prisma.warehouse.update({ where: { id }, data: params })
}