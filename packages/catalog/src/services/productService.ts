import { prisma, TrackingMode } from '@nx-inventory/database'

export async function listProducts(businessId: string) {
  return prisma.product.findMany({
    where: { businessId },
    include: { category: true, variants: { include: { unit: true } } },
    orderBy: { name: 'asc' },
  })
}

export async function getProduct(id: string) {
  return prisma.product.findUniqueOrThrow({
    where: { id },
    include: { category: true, variants: { include: { unit: true } } },
  })
}

export async function createProduct(params: {
  businessId: string
  categoryId?: string
  name: string
  description?: string
  unit: string
}) {
  return prisma.product.create({
    data: {
      businessId: params.businessId,
      categoryId: params.categoryId,
      name: params.name,
      description: params.description,
      unit: params.unit,
    },
  })
}

export async function updateProduct(
  id: string,
  params: Partial<{ categoryId: string | null; name: string; description: string | null; unit: string }>
) {
  return prisma.product.update({ where: { id }, data: params })
}

/**
 * trackingMode is required here, not defaulted quietly — whoever builds
 * the "add variant" form should present this as an explicit choice (a
 * select, not a hidden default), since it decides whether this variant
 * needs batch/expiry tracking for its entire lifetime. Changing it after
 * stock already exists is a data-migration problem, not a form edit.
 */
export async function createVariant(params: {
  productId: string
  unitId: string
  name: string
  sku?: string
  barcode?: string
  price?: number
  costPrice?: number
  trackingMode: TrackingMode
  isDefault?: boolean
}) {
  return prisma.productVariant.create({
    data: {
      productId: params.productId,
      unitId: params.unitId,
      name: params.name,
      sku: params.sku,
      barcode: params.barcode,
      price: params.price,
      costPrice: params.costPrice,
      trackingMode: params.trackingMode,
      isDefault: params.isDefault ?? false,
    },
  })
}

export async function updateVariant(
  id: string,
  params: Partial<{
    name: string
    sku: string | null
    barcode: string | null
    price: number | null
    costPrice: number | null
    isDefault: boolean
    // Deliberately NOT allowing trackingMode here. Flipping BATCH<->NONE
    // on a variant that already has Stock/ProductBatch rows against it
    // needs a real migration path (backfill or archive-and-recreate), not
    // a silent field update — see applyStockMovement's enforcement of this
    // same rule.
  }>
) {
  return prisma.productVariant.update({ where: { id }, data: params })
}