'use server'

import { getSession } from '@nx-inventory/auth'
import { getUserBusinessContext } from '@nx-inventory/organisation'
import { createSupplier } from '@nx-inventory/suppliers'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createSupplierAction(formData: FormData) {
  const session = await getSession(await headers())
  if (!session) redirect('/login')

  const business = await getUserBusinessContext(session.user.id)
  if (!business) redirect('/onboarding')

  const name = String(formData.get('name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim() || undefined
  const email = String(formData.get('email') ?? '').trim() || undefined
  if (!name) throw new Error('Supplier name is required')

  await createSupplier({ businessId: business.businessId, name, phone, email })
  revalidatePath('/purchasing/suppliers')
}