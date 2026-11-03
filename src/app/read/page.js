'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, FileText } from 'lucide-react'
import PdfReader from '@/components/PdfReader'

function ReadContent() {
  const sp = useSearchParams()
  const url = sp.get('url') || ''
  const title = sp.get('title') || 'Reading'
  if (!url) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <FileText className="size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No file to read.</p>
        <Link href="/folders" className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold">
          <ArrowLeft className="size-4" /> My Files
        </Link>
      </div>
    )
  }
  return <PdfReader url={url} title={title} />
}

export default function ReadPage() {
  return (
    <Suspense>
      <ReadContent />
    </Suspense>
  )
}
