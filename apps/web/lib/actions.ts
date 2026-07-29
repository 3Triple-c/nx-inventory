'use server'

import { getSession } from '@nx-inventory/auth'
import { createBusinessForUser } from '@nx-inventory/organisation'
import { BusinessType } from '@nx-inventory/database'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export async function createBusinessAction(formData: FormData) {
  const session = await getSession(await headers())
  if (!session) {
    redirect('/login')
  }

  const name = String(formData.get('name') ?? '').trim()
  const type = String(formData.get('type') ?? 'GENERIC') as BusinessType

  if (!name) {
    throw new Error('Business name is required')
  }

  await createBusinessForUser({ userId: session.user.id, name, type })

  redirect('/')
}