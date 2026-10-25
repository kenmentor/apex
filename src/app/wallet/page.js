'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getUser } from '@/lib/auth'

export default function WalletPage() {
  const [user, setUser] = useState(null)
  const [wallet, setWallet] = useState(null)

  useEffect(() => {
    const u = getUser()
    setUser(u)
    if (u) fetch('/api/wallet?email=' + encodeURIComponent(u.email), { cache: 'no-store' }).then(r => r.json()).then(setWallet).catch(() => {})
  }, [])

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <h1 className="text-xl font-bold">Wallet</h1>
      </div>
      <div className="rounded-xl border p-4">
        <div className="text-3xl font-extrabold">{wallet?.spendable ?? '—'} <span className="text-sm font-medium text-muted-foreground">coins</span></div>
        <p className="mt-1 text-xs text-muted-foreground">Stackable, no expiry, in-app only. Earn by completing your daily plan item, winning races, and creating valued content. Withdrawals are unavailable in V1.</p>
      </div>
      <h2 className="text-sm font-bold">History</h2>
      <ul className="space-y-2">
        {(wallet?.history || []).map(h => (
          <li key={h._id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
            <span>{h.type.replace(/_/g, ' ')}<span className="block text-xs text-muted-foreground">{h.reason}</span></span>
            <span className="font-medium">{h.to === user?.email?.toLowerCase() ? `+${h.amount}` : `−${h.amount}`}</span>
          </li>
        ))}
      </ul>
      {!(wallet?.history || []).length && <p className="text-sm text-muted-foreground">No transactions yet — your 30-coin welcome grant lands here.</p>}
    </div>
  )
}
