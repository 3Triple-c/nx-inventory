'use server'

import { getSession } from '@nx-inventory/auth'
import { getUserBusinessContext } from '@nx-inventory/organisation'
import { createCategory, createUnit, createProduct, createVariant } from '@nx-inventory/catalog'
import { TrackingMode } from '@nx-inventory/database'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function requireBusinessContext() {
  const session = await getSession(await headers())
  if (!session) redirect('/login')

  const business = await getUserBusinessContext(session.user.id)
  if (!business) redirect('/onboarding')

  return business
}

export async function createCategoryAction(formData: FormData) {
  const business = await requireBusinessContext()
  const name = String(formData.get('name') ?? '').trim()
  if (!name) throw new Error('Category name is required')

  await createCategory({ businessId: business.businessId, name })
  revalidatePath('/catalog')
}

export async function createUnitAction(formData: FormData) {
  const business = await requireBusinessContext()
  const name = String(formData.get('name') ?? '').trim()
  const symbol = String(formData.get('symbol') ?? '').trim()
  if (!name || !symbol) throw new Error('Unit name and symbol are required')

  await createUnit({ businessId: business.businessId, name, symbol })
  revalidatePath('/catalog')
}

export async function createProductAction(formData: FormData) {
  const business = await requireBusinessContext()
  const name = String(formData.get('name') ?? '').trim()
  const categoryId = String(formData.get('categoryId') ?? '') || undefined
  if (!name) throw new Error('Product name is required')

  const product = await createProduct({ businessId: business.businessId, name, categoryId })
  redirect(`/catalog/products/${product.id}`)
}

export async function createVariantAction(formData: FormData) {
  await requireBusinessContext() // just enforcing auth/business here - variant itself is scoped by productId below

  const productId = String(formData.get('productId') ?? '')
  const unitId = String(formData.get('unitId') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const trackingMode = String(formData.get('trackingMode') ?? '') as TrackingMode
  const priceRaw = formData.get('price')
  const costPriceRaw = formData.get('costPrice')

  if (!productId || !unitId || !name || !trackingMode) {
    throw new Error('Product, unit, name, and tracking mode are all required')
  }

  await createVariant({
    productId,
    unitId,
    name,
    trackingMode,
    price: priceRaw ? Number(priceRaw) : undefined,
    costPrice: costPriceRaw ? Number(costPriceRaw) : undefined,
  })
  revalidatePath(`/catalog/products/${productId}`)
}
