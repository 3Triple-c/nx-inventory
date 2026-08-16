import { getSession } from '@nx-inventory/auth'
import { getUserBusinessContext } from '@nx-inventory/organisation'
import { listTransfers } from '@nx-inventory/inventory'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PageContainer, PageHeader, Card, EmptyState, Button } from '@/components/ui'

export default async function TransfersPage() {
  const session = await getSession(await headers())
  if (!session) redirect('/login')

  const business = await getUserBusinessContext(session.user.id)
  if (!business) redirect('/onboarding')

  const transfers = await listTransfers(business.businessId)

  return (
    <PageContainer>
      <PageHeader title="Transfers" backHref="/" backLabel="Home" />

      <Link href="/transfers/new">
        <Button>+ New transfer</Button>
      </Link>

      {transfers.length === 0 && <EmptyState>No transfers yet.</EmptyState>}

      <div className="space-y-3">
        {transfers.map((t) => (
          <Link key={t.id} href={`/transfers/${t.id}`}>
            <Card>
              <div className="flex justify-between">
                <span className="font-medium">{t.transferNumber}</span>
                <span className="text-sm text-gray-500">{t.status}</span>
              </div>
              <div className="text-sm text-gray-500">
                {t.fromWarehouse.name} → {t.toWarehouse.name} — {t.items.length} item(s)
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </PageContainer>
  )
}