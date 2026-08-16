import { prisma } from "@nx-inventory/database";

export async function listSuppliers(businessId: string) {
  return prisma.supplier.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
  });
}

export async function getSupplier(id: string) {
  return prisma.supplier.findUniqueOrThrow({
    where: { id },
    include: {
      purchases: {
        include: { warehouse: true, items: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function updateSupplier(
  id: string,
  params: Partial<{
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  }>,
) {
  return prisma.supplier.update({ where: { id }, data: params });
}

export async function createSupplier(params: {
  businessId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}) {
  return prisma.supplier.create({
    data: {
      businessId: params.businessId,
      name: params.name,
      email: params.email,
      phone: params.phone,
      address: params.address,
    },
  });
}
