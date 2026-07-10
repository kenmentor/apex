'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, isAdmin, getUser, clearUser } from '@/lib/auth'
import Link from 'next/link'

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
        { name: 'options', label: 'Options (JSON object, e.g. {"a":"...","b":"..."})', required: true },
        { name: 'correctAnswer', label: 'Correct Answer', required: true },
        { name: 'explanation', label: 'Explanation' },
      ],
      videos: [
        { name: 'courseCode', label: 'Course Code', required: true },
        { name: 'title', label: 'Title', required: true },
        { name: 'url', label: 'YouTube URL', required: true },
        { name: 'description', label: 'Description' },
        { name: 'order', label: 'Order (number)' },
      ],
      readings: [
        { name: 'courseCode', label: 'Course Code', required: true },
        { name: 'title', label: 'Title', required: true },
        { name: 'order', label: 'Order (number)' },
        { name: 'content', label: 'Content (HTML)', required: true },
      ],
    }
    return (fields[tab] || []).map(f => (
      <div key={f.name} style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--text-dark)' }}>{f.label}</label>
        {f.name === 'content' ? (
          <textarea name={f.name} defaultValue={editDoc?.[f.name] || ''} required={f.required} rows={8}
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'monospace' }}
          />
        ) : f.name === 'options' ? (
          <textarea name={f.name}
            defaultValue={editDoc?.[f.name] ? JSON.stringify(editDoc[f.name], null, 2) : ''}
            required={f.required} rows={6}
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'monospace' }}
          />
        ) : (
          <input name={f.name} defaultValue={editDoc?.[f.name] || ''} required={f.required}
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
          />
        )}
      </div>
    ))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Admin Dashboard</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/" style={{ fontSize: 13, color: '#666' }}>Home</Link>
            <button onClick={() => { clearUser(); router.push('/auth') }} style={{ fontSize: 13, color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer' }}>Sign Out</button>
          </div>
        </div>

        {visitorStats && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#130f40' }}>{visitorStats.uniqueVisitors}</div>
              <div style={{ fontSize: 12, color: '#999' }}>Unique Visitors</div>
            </div>
            <div style={{ flex: 1, background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#ff9f43' }}>{visitorStats.totalVisits}</div>
              <div style={{ fontSize: 12, color: '#999' }}>Total Visits</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: '#fff', borderRadius: 12, padding: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setEditDoc(null) }}
              style={{ flex: 1, padding: '10px 16px', border: 'none', borderRadius: 8, cursor: 'pointer',
                background: tab === t.key ? '#130f40' : 'transparent', color: tab === t.key ? '#fff' : '#666',
                fontWeight: 600, fontSize: 13, transition: 'all 0.2s' }}
            >{t.label}</button>
          ))}
        </div>

        {/* Form */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{editDoc ? 'Edit' : 'Add'} {tab.slice(0, -1)}</h2>
          <form onSubmit={handleSave}>
            {renderForm()}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="submit" disabled={saving}
                style={{ padding: '10px 24px', border: 'none', borderRadius: 8, background: '#130f40', color: '#fff',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >{saving ? 'Saving...' : editDoc ? 'Update' : 'Create'}</button>
              {editDoc && (
                <button type="button" onClick={() => setEditDoc(null)}
                  style={{ padding: '10px 24px', border: '1px solid #ddd', borderRadius: 8, background: '#fff',
                    fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >Cancel</button>
              )}
            </div>
          </form>
          {message && <p style={{ marginTop: 12, fontSize: 13, color: message === 'Saved!' ? '#27ae60' : '#e74c3c' }}>{message}</p>}
        </div>

        {/* List */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ padding: 16, borderBottom: '1px solid #f1f2f6', fontSize: 14, fontWeight: 600, color: '#666' }}>
            {docs.length} {tab}
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading...</div>
          ) : docs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>No {tab} yet</div>
          ) : (
            docs.map(doc => (
              <div key={doc._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f8f9fa' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{doc.title || doc.question || doc.code || doc.name || doc._id}</div>
                  {doc.code && <div style={{ fontSize: 12, color: '#999' }}>{doc.code}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setEditDoc(doc)}
                    style={{ padding: '6px 14px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}
                  >Edit</button>
                  <button onClick={() => handleDelete(doc._id)}
                    style={{ padding: '6px 14px', border: '1px solid #e74c3c', borderRadius: 6, background: '#fff', color: '#e74c3c', cursor: 'pointer', fontSize: 12 }}
                  >Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
