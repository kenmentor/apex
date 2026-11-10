'use client'

import { useState, useEffect } from 'react'
import { getUser } from '@/lib/auth'

export default function WalletPage() {
  const [balance, setBalance] = useState(null)

  useEffect(() => {
    const u = getUser()
    if (!u?.email) return
    fetch('/api/wallet?email=' + encodeURIComponent(u.email), { cache: 'no-store' })
      .then(r => r.json())
      .then(w => setBalance(w?.spendable ?? null))
      .catch(() => setBalance(null))
  }, [])

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-24 pt-6">
      <h1 className="text-xl font-bold">Wallet</h1>

      <div className="mt-4 rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Balance</div>
        <div className="mt-2 text-5xl font-black tracking-tight">{balance ?? '—'}</div>
        <div className="mt-1 text-sm font-medium text-muted-foreground">coins</div>
      </div>
    </div>
  )
}
