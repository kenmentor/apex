'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Wallet, Coins, ArrowDownLeft, ArrowUpRight, Gift, Trophy, Sparkles, Lock, Nfc } from 'lucide-react'
import { getUser } from '@/lib/auth'

function typeIcon(type = '') {
  if (type.includes('welcome') || type.includes('gift')) return Gift
  if (type.includes('race') || type.includes('winning')) return Trophy
  if (type.includes('creator') || type.includes('payout')) return Sparkles
  return Coins
}

export default function WalletPage() {
  const [user, setUser] = useState(null)
  const [wallet, setWallet] = useState(null)

  useEffect(() => {
    const u = getUser()
    setUser(u)
    if (u) fetch('/api/wallet?email=' + encodeURIComponent(u.email), { cache: 'no-store' }).then(r => r.json()).then(setWallet).catch(() => {})
  }, [])

  const history = wallet?.history || []
  const email = (user?.email || '').toLowerCase()
  const { earned, spent } = useMemo(() => {
    let e = 0, s = 0
    for (const h of history) {
      if (h.to === email) e += h.amount
      else s += h.amount
    }
    return { earned: e, spent: s }
  }, [history, email])

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex size-9 items-center justify-center rounded-lg border hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <h1 className="text-xl font-bold">Wallet</h1>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-bold">
          <Coins className="size-3.5 text-amber-500" /> {wallet?.spendable ?? '—'}
        </span>
      </div>

      {/* ---- Leather wallet card ---- */}
      <div className="relative overflow-hidden rounded-[28px] bg-neutral-900 p-5 text-white shadow-xl ring-1 ring-white/10">
        {/* stitched edge */}
        <div className="pointer-events-none absolute inset-2 rounded-[22px] border-2 border-dashed border-white/15" aria-hidden />
        {/* sheen + pocket flap */}
        <div className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-amber-500/20 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-orange-700/20 blur-2xl" aria-hidden />

        <div className="relative flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/70">
            <Wallet className="size-4 text-amber-400" /> GSS Wallet
          </span>
          <Nfc className="size-5 text-white/40" />
        </div>

        {/* chip + brand */}
        <div className="relative mt-5 flex items-center gap-3">
          <div className="grid size-11 grid-cols-2 gap-px overflow-hidden rounded-lg bg-gradient-to-br from-amber-200 to-amber-500 p-1.5 shadow-inner">
            <div className="rounded-sm bg-amber-700/40" />
            <div className="rounded-sm bg-amber-700/40" />
            <div className="rounded-sm bg-amber-700/40" />
            <div className="rounded-sm bg-amber-700/40" />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">Stackable · No expiry · In-app only</div>
        </div>

        <div className="relative mt-4">
          <div className="text-[11px] font-medium uppercase tracking-widest text-white/50">Balance</div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black tracking-tight">{wallet?.spendable ?? '—'}</span>
            <span className="text-sm font-bold uppercase tracking-widest text-amber-400">coins</span>
          </div>
        </div>

        <div className="relative mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-mono text-xs tracking-wider text-white/60">
              {(user?.email || 'guest@wallet').toUpperCase()}
            </div>
            <div className="mt-0.5 text-[11px] text-white/50">{user?.name || user?.username || 'Coin holder'}</div>
          </div>
          <div className="flex shrink-0 -space-x-2.5">
            <span className="size-8 rounded-full bg-red-500/80 ring-2 ring-neutral-900" />
            <span className="size-8 rounded-full bg-amber-400/90 ring-2 ring-neutral-900" />
          </div>
        </div>
      </div>

      {/* ---- Spendable / Withdrawable / Earned ---- */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl border bg-card p-3 text-center shadow-sm">
          <div className="text-lg font-extrabold">{wallet?.spendable ?? '—'}</div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Spendable</div>
        </div>
        <div className="rounded-2xl border bg-card p-3 text-center shadow-sm">
          <div className="flex items-center justify-center gap-1 text-lg font-extrabold">
            {wallet?.withdrawable ?? '—'}
          </div>
          <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Cashable <Lock className="size-2.5" />
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-3 text-center shadow-sm">
          <div className="text-lg font-extrabold text-emerald-600">+{earned}</div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Earned</div>
        </div>
      </div>

      <p className="rounded-2xl bg-muted/60 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
        Earn by completing your daily plan item, winning races, and creating valued content. Withdrawals are unavailable in V1.
      </p>

      {/* ---- Quick actions: billfold slots ---- */}
      <div className="grid grid-cols-3 gap-2.5">
        <Link href="/plan" className="flex flex-col items-center gap-1.5 rounded-2xl border bg-card p-3.5 text-center shadow-sm transition-colors hover:bg-muted/50">
          <Gift className="size-5 text-emerald-600" />
          <span className="text-xs font-bold">Earn daily</span>
        </Link>
        <Link href="/races" className="flex flex-col items-center gap-1.5 rounded-2xl border bg-card p-3.5 text-center shadow-sm transition-colors hover:bg-muted/50">
          <Trophy className="size-5 text-amber-500" />
          <span className="text-xs font-bold">Win races</span>
        </Link>
        <Link href="/contribute" className="flex flex-col items-center gap-1.5 rounded-2xl border bg-card p-3.5 text-center shadow-sm transition-colors hover:bg-muted/50">
          <Sparkles className="size-5 text-violet-600" />
          <span className="text-xs font-bold">Create</span>
        </Link>
      </div>

      {/* ---- Receipts ---- */}
      <h2 className="mt-1 text-sm font-bold">Receipts <span className="ml-1 font-medium text-muted-foreground">· {history.length} · −{spent} spent</span></h2>
      <ul className="space-y-2">
        {history.map(h => {
          const incoming = h.to === email
          const Icon = typeIcon(h.type)
          return (
            <li key={h._id} className="flex items-center gap-3 rounded-2xl border bg-card p-3 text-sm shadow-sm">
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${incoming ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>
                {incoming ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-bold capitalize">
                  <Icon className="size-3.5 text-muted-foreground" />{h.type.replace(/_/g, ' ')}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{h.reason} · {h.createdAt ? new Date(h.createdAt).toLocaleDateString() : ''}</span>
              </span>
              <span className={`shrink-0 font-extrabold ${incoming ? 'text-emerald-600' : 'text-red-500'}`}>{incoming ? `+${h.amount}` : `−${h.amount}`}</span>
            </li>
          )
        })}
      </ul>
      {!history.length && (
        <div className="rounded-2xl border border-dashed p-6 text-center">
          <Coins className="mx-auto size-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">No transactions yet — your 30-coin welcome grant lands here.</p>
        </div>
      )}
    </div>
  )
}
