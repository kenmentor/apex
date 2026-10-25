'use client'

import { useState, useEffect } from 'react'

export default function GroupProgress({ spaceId, isMember }) {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    if (!isMember) return
    fetch(`/api/spaces/progress?id=${spaceId}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]))
  }, [spaceId, isMember])

  if (!isMember || rows === null) return null
  if (!rows.length) return null

  return (
    <div className="mb-4 rounded-xl border p-4">
      <h3 className="mb-3 text-sm font-bold">Member progress</h3>
      <ul className="space-y-2">
        {rows.map(m => (
          <li key={m.email} className="flex items-center gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate font-medium">{m.name}</span>
            {m.trend !== null && m.trend >= 50 && m.mastery < 80 && (
              <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-600">📈 climbing</span>
            )}
            <span className="text-xs text-muted-foreground">{m.mastery}% · 🔥{m.streak}</span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${m.mastery}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
