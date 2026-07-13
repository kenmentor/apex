'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Palette, Upload, X } from 'lucide-react'
import { getUser, getToken } from '@/lib/auth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'

const COLORS = ['#130f40', '#1a5276', '#7d3c98', '#c0392b', '#27ae60', '#e67e22', '#2c3e50', '#8e44ad', '#1e272e', '#4834d4']

export default function CreateSpacePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [cover, setCover] = useState(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const u = getUser()
    setUser(u)
    setLoading(false)
    if (!u) router.push('/auth')
  }, [router])

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('folder', 'gss-quiz/spaces/covers')
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      })
      const data = await res.json()
      if (data.url) setCover(data.url)
    } catch {}
    setUploading(false)
  }

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ name, description, color, cover }),
      })
      const data = await res.json()
      if (data.id) router.push(`/spaces/${data.id}`)
    } catch {}
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center overflow-x-hidden pb-24">
        <Skeleton className="h-64 w-full max-w-sm rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background pb-24">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link href="/spaces" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="flex-1 text-base font-bold">Create Space</h1>
      </header>

      <div className="mx-auto w-full max-w-2xl space-y-6 px-5 pt-6">

        {/* Cover + Overlay Preview */}
        <div className="relative h-40 w-full overflow-hidden rounded-2xl">
          <div
            className="absolute inset-0"
            style={{
              background: cover
                ? `url(${cover}) center/cover`
                : `linear-gradient(135deg, ${color}, ${color}88)`,
            }}
          />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
            <div
              className="mb-2 flex size-14 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold backdrop-blur-sm"
            >
              {name ? name.slice(0, 2).toUpperCase() : '??'}
            </div>
            <div className="text-lg font-bold">{name || 'Space Name'}</div>
            {description && <div className="mt-1 text-xs text-white/70 line-clamp-1">{description}</div>}
          </div>
          <label className="absolute bottom-2 right-2 flex size-8 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60">
            <Upload className="size-4" />
            <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
          </label>
          {cover && (
            <button
              onClick={() => setCover(null)}
              className="absolute bottom-2 right-12 flex size-8 items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            >
              <X className="size-4" />
            </button>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
              <span className="text-sm text-white font-medium">Uploading...</span>
            </div>
          )}
        </div>

        {/* Color Picker */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Palette className="size-4 text-muted-foreground" />
            Theme Color
          </div>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`size-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Space Name *</label>
          <Input
            placeholder="e.g. GST 111 Past Questions"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={60}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            placeholder="What kind of materials will be shared here?"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            maxLength={300}
          />
        </div>

        <Button
          onClick={handleCreate}
          disabled={!name.trim() || saving}
          className="w-full"
          size="lg"
        >
          {saving ? 'Creating...' : 'Create Space'}
        </Button>
      </div>
    </div>
  )
}
