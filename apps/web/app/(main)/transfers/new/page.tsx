import { getSession } from '@nx-inventory/auth'
import { getUserBusinessContext } from '@nx-inventory/organisation'
import { listWarehouses } from '@nx-inventory/warehouses'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createTransferAction } from '@/lib/transfers'
import { PageContainer, PageHeader, Field, Select, Button, EmptyState } from '@/components/ui'

export default async function NewTransferPage() {
  const session = await getSession(await headers())
  if (!session) redirect('/login')

  const business = await getUserBusinessContext(session.user.id)
  if (!business) redirect('/onboarding')

  const warehouses = await listWarehouses(business.businessId)

  if (warehouses.length < 2) {
    return (
      <PageContainer>
        <PageHeader title="New transfer" backHref="/transfers" backLabel="Transfers" />
        <EmptyState>
          You need at least two warehouses to transfer between —{' '}
          <Link href="/warehouses" className="underline">
            add another one
          </Link>
          .
        </EmptyState>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader title="New transfer" backHref="/transfers" backLabel="Transfers" />
      <form action={createTransferAction} className="space-y-3">
        <Field label="From warehouse">
          <Select name="fromWarehouseId" required defaultValue="">
            <option value="" disabled>
              Select source
            </option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="To warehouse">
          <Select name="toWarehouseId" required defaultValue="">
            <option value="" disabled>
              Select destination
            </option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit">Create transfer (draft)</Button>
      </form>
    </PageContainer>
  )
}