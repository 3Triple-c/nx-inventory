"use client"

import { signOut } from '@nx-inventory/auth/client'
import { useRouter } from 'next/navigation'

export function SignOutButton() {
  const router = useRouter()

  return (
    <button
      onClick={async () => {
        await signOut()
        router.refresh() // re-runs the server component below so it re-checks session
      }}
    >
      Sign out
    </button>
  )
}