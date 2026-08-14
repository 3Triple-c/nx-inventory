"use client"

import { signOut } from '@nx-inventory/auth/client'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"

export function SignOutButton() {
  const router = useRouter()

  return (
    <Button
      onClick={async () => {
        await signOut()
        router.refresh() // re-runs the server component below so it re-checks session
      }}
      variant="secondary"
    >
      Sign out
    </Button>
  )
}
