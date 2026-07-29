import { prisma } from "@nx-inventory/database";

/**
 * Unit.businessId is nullable in the schema — a null businessId means a
 * shared unit available to every business (e.g. "kg", "piece"), while a
 * set businessId means one a specific business defined for itself. Every
 * list/lookup here returns both, since a business should see the shared
 * units plus whatever it added on top.
 */
export async function listUnits(businessId: string) {
  return prisma.unit.findMany({
    where: { OR: [{ businessId: null }, { businessId }] },
    orderBy: { name: "asc" },
  });
}

export async function createUnit(params: {
  businessId: string;
  name: string;
  symbol: string;
}) {
  return prisma.unit.create({
    data: {
      businessId: params.businessId,
      name: params.name,
      symbol: params.symbol,
    },
  });
}
