'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SettingsContent } from '@/app/settings/page'

export default function ProfileSettingsPage() {
  return (
    <div className="min-h-dvh bg-background pb-28">
      <div className="mx-auto w-full max-w-xl px-4 pt-4">
        <div className="flex items-center gap-3 py-2">
          <Link href="/profile" aria-label="Go back" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-bold tracking-tight">Profile settings</h1>
        </div>
        <SettingsContent bare />
      </div>
    </div>
  )
}
