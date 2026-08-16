import { prisma } from '@nx-inventory/database'

export async function listCustomers(businessId: string) {
  return prisma.customer.findMany({
    where: { businessId },
    orderBy: { name: 'asc' },
  })
}

export async function getCustomer(id: string) {
  return prisma.customer.findUniqueOrThrow({
    where: { id },
    include: {
      sales: {
        include: { warehouse: true, items: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}

export async function createCustomer(params: {
  businessId: string
  name: string
  email?: string
  phone?: string
  address?: string
}) {
  return prisma.customer.create({
    data: {
      businessId: params.businessId,
      name: params.name,
      email: params.email,
      phone: params.phone,
      address: params.address,
    },
  })
}

export async function updateCustomer(
  id: string,
  params: Partial<{ name: string; email: string | null; phone: string | null; address: string | null }>
) {
  return prisma.customer.update({ where: { id }, data: params })
}