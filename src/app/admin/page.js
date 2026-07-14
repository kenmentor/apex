'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, isAdmin, clearUser } from '@/lib/auth'
import Link from 'next/link'
import { ArrowLeft, BarChart3, Home, LogOut, Pencil, Trash2, Plus } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

const TABS = [
  { key: 'categories', label: 'Categories' },
  { key: 'courses', label: 'Courses' },
  { key: 'questions', label: 'Questions' },
  { key: 'videos', label: 'Videos' },
  { key: 'readings', label: 'Readings' },
]

function getAuthHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState('categories')
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editDoc, setEditDoc] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [visitorStats, setVisitorStats] = useState(null)

  useEffect(() => {
    if (!isAdmin()) {
      router.push('/auth')
      return
    }
    loadDocs()
    fetch('/api/visitors').then(r => r.json()).then(setVisitorStats).catch(() => {})
  }, [tab])

  async function loadDocs() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/${tab}`, { headers: getAuthHeaders() })
      const data = await res.json()
      setDocs(data.docs || [])
    } catch { setDocs([]) }
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this item?')) return
    try {
      await fetch(`/api/admin/${tab}/${id}`, { method: 'DELETE', headers: getAuthHeaders() })
      loadDocs()
    } catch { setMessage('Delete failed') }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    const form = new FormData(e.target)
    const data = Object.fromEntries(form.entries())
    if (data.options) {
      try { data.options = JSON.parse(data.options) }
      catch { setMessage('Options must be valid JSON'); setSaving(false); return }
    }
    try {
      const url = editDoc?._id ? `/api/admin/${tab}/${editDoc._id}` : `/api/admin/${tab}`
      const res = await fetch(url, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Save failed')
      setEditDoc(null)
      setMessage('Saved!')
      loadDocs()
    } catch (err) { setMessage(err.message) }
    setSaving(false)
  }

  function renderForm() {
    const fields = {
      categories: [
        { name: 'code', label: 'Code', required: true },
        { name: 'title', label: 'Title', required: true },
        { name: 'color', label: 'Color' },
      ],
      courses: [
        { name: 'code', label: 'Course Code', required: true },
        { name: 'title', label: 'Title', required: true },
        { name: 'description', label: 'Description' },
        { name: 'color', label: 'Color' },
      ],
      questions: [
        { name: 'courseCode', label: 'Course Code', required: true },
        { name: 'section', label: 'Section' },
        { name: 'question', label: 'Question', required: true },
        { name: 'options', label: 'Options (JSON object)' , required: true },
        { name: 'correctAnswer', label: 'Correct Answer', required: true },
        { name: 'explanation', label: 'Explanation' },
      ],
      videos: [
        { name: 'courseCode', label: 'Course Code', required: true },
        { name: 'title', label: 'Title', required: true },
        { name: 'url', label: 'YouTube URL', required: true },
        { name: 'description', label: 'Description' },
        { name: 'order', label: 'Order' },
      ],
      readings: [
        { name: 'courseCode', label: 'Course Code', required: true },
        { name: 'title', label: 'Title', required: true },
        { name: 'order', label: 'Order' },
        { name: 'content', label: 'Content (HTML)', required: true },
      ],
    }
    return (fields[tab] || []).map(f => (
      <div key={f.name} className="space-y-1.5">
        <Label htmlFor={f.name} className="text-xs">{f.label}</Label>
        {f.name === 'content' || f.name === 'options' ? (
          <Textarea
            id={f.name}
            name={f.name}
            defaultValue={f.name === 'options' && editDoc?.[f.name] ? JSON.stringify(editDoc[f.name], null, 2) : (editDoc?.[f.name] || '')}
            required={f.required}
            rows={f.name === 'content' ? 8 : 6}
            className="font-mono text-xs"
          />
        ) : (
          <Input
            id={f.name}
            name={f.name}
            defaultValue={editDoc?.[f.name] || ''}
            required={f.required}
          />
        )}
      </div>
    ))
  }

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background pb-24">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link href="/" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="flex-1 text-base font-bold">Admin Dashboard</h1>
        <Link href="/admin/analytics" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
          <BarChart3 className="size-4" />
        </Link>
      </header>

      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-4">
        {/* Stats */}
        {visitorStats && (
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{visitorStats.uniqueVisitors}</div>
                <div className="text-xs text-muted-foreground">Unique Visitors</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-500">{visitorStats.totalVisits}</div>
                <div className="text-xs text-muted-foreground">Total Visits</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => { setTab(v); setEditDoc(null) }}>
          <TabsList className="w-full overflow-x-auto flex-nowrap justify-start">
            {TABS.map(t => (
              <TabsTrigger key={t.key} value={t.key} className="text-xs">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={tab} className="mt-4 space-y-4">
            {/* Form */}
            <Card>
              <CardContent className="p-5">
                <h2 className="mb-4 text-sm font-bold">{editDoc ? 'Edit' : 'Add'} {tab.slice(0, -1)}</h2>
                <form onSubmit={handleSave} className="space-y-3">
                  {renderForm()}
                  <div className="flex gap-2 pt-2">
                    <Button type="submit" disabled={saving} size="sm">
                      {saving ? 'Saving...' : editDoc ? 'Update' : 'Create'}
                    </Button>
                    {editDoc && (
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditDoc(null)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
                {message && (
                  <p className={`mt-3 text-xs font-medium ${message === 'Saved!' ? 'text-green-500' : 'text-red-500'}`}>
                    {message}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* List */}
            <Card>
              <CardContent className="p-0">
                <div className="border-b px-4 py-3">
                  <span className="text-xs font-semibold text-muted-foreground">{docs.length} {tab}</span>
                </div>
                {loading ? (
                  <div className="space-y-3 p-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                  </div>
                ) : docs.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">No {tab} yet</div>
                ) : (
                  <div className="divide-y divide-border">
                    {docs.map(doc => (
                      <div key={doc._id} className="flex items-center justify-between px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{doc.title || doc.question || doc.code || doc.name || doc._id}</div>
                          {doc.code && <div className="text-[11px] text-muted-foreground">{doc.code}</div>}
                        </div>
                        <div className="flex gap-1.5 shrink-0 ml-3">
                          <Button variant="outline" size="sm" onClick={() => setEditDoc(doc)}>
                            <Pencil className="size-3" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(doc._id)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
