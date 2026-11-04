import Link from 'next/link'
import { Search, FolderOpen, Home, Compass } from 'lucide-react'

export const metadata = {
  title: 'Lost? | Apex',
  description: 'That page wandered off. Find your way back to studying.',
}

const LINKS = [
  { href: '/courses', icon: Compass, title: 'Courses', sub: 'Pick up where you left off' },
  { href: '/search', icon: Search, title: 'Search', sub: 'Find anything in the bank' },
  { href: '/folders', icon: FolderOpen, title: 'My Files', sub: 'Your saved notes and uploads' },
  { href: '/', icon: Home, title: 'Home', sub: 'Back to your dashboard' },
]

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 pb-24 pt-16 text-center">
      <p className="text-6xl font-black tracking-tight">404</p>
      <div className="space-y-1">
        <h1 className="text-lg font-extrabold">This page wandered off</h1>
        <p className="text-sm text-muted-foreground">
          It may have moved, or the link has a typo. Your notes and streak are safe.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-2 text-left">
        {LINKS.map(l => (
          <Link key={l.href} href={l.href} className="flex items-center gap-3 rounded-2xl border bg-card p-3 transition-colors hover:bg-muted/40">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <l.icon className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{l.title}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{l.sub}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
