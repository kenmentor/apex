'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Zap, Timer, ListChecks, Trophy, Film, Music, FileText, BookOpen, Square, Volume2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import TikTokTabs from '@/components/TikTokTabs'
import MediaCard from '@/components/MediaCard'
import { FullscreenReader, useSpeech, stripHtml } from '@/components/Reader'
import { TextCard } from '@/components/TopicContent'
import { getUser } from '@/lib/auth'
import { mockPlan, mockTopicContent } from '@/lib/demo-content'

export const BLOCK_COLORS = ['#2563EB', '#7C3AED', '#F59E0B', '#059669', '#E11D48', '#0284C7'];

export function colorFor(code) {
  let h = 0
  for (const c of String(code || '?')) h = (h * 31 + c.charCodeAt(0)) % BLOCK_COLORS.length
  return BLOCK_COLORS[h]
}

const TABS = [
  { id: 'quiz', label: 'Quiz', icon: Zap },
  { id: 'video', label: 'Video', icon: Film },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'text', label: 'Text', icon: BookOpen },
  { id: 'pdf', label: 'PDF', icon: FileText },
]

function fmtClock(secs) {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function CoursePlanPage({ params }) {
  const { course: slug } = use(params)
  const [plan, setPlan] = useState(null)
  const [completions, setCompletions] = useState([])
  const [content, setContent] = useState(null)
  const [tab, setTab] = useState('video')
  const [loading, setLoading] = useState(true)
  const [demoMode, setDemoMode] = useState(false)

  useEffect(() => {
    try { setDemoMode(new URLSearchParams(window.location.search).get('demo') === '1') } catch {}
  }, [])

  useEffect(() => {
    const u = getUser()
    const planReq = u?.email
      ? fetch('/api/plans?email=' + encodeURIComponent(u.email), { cache: 'no-store' }).then(r => r.json()).catch(() => null)
      : Promise.resolve(null)
    const compReq = u?.email
      ? fetch('/api/completions?email=' + encodeURIComponent(u.email), { cache: 'no-store' }).then(r => (Array.isArray(r) ? r : r.json()).catch(() => []))
      : Promise.resolve([])
    Promise.all([
      planReq,
      compReq,
      fetch('/api/course-content?course=' + encodeURIComponent(slug), { cache: 'no-store' }).then(r => r.json()).catch(() => null),
    ]).then(([p, c, cc]) => {
      if (p && p.supported) { setPlan(p); setCompletions(Array.isArray(c) ? c : []) }
      if (cc?.courseCode) setContent(cc)
      setLoading(false)
    }).catch(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return <div className="flex min-h-dvh items-center justify-center pb-24"><Skeleton className="h-64 w-full max-w-md rounded-xl" /></div>

  const P = plan || mockPlan()
  const planCourse = (P.courses || []).find(c => String(c.code || '').toLowerCase().replace(/\s+/g, '') === String(slug || '').toLowerCase())
  const code = planCourse?.code || content?.courseCode || String(slug || '').toUpperCase()
  const title = planCourse?.title || 'Course content'

  const doneIds = new Set((completions || []).map(c => `${c.topicId}:${c.itemId}`))
  const color = colorFor(code)

  // Sections: plan topics matched to content by id, then title.
  // No plan entry (or no id/title match) → fall back to content topics.
  // No topics at all but course has media → one flat "All content" block.
  // Empty course (topics but zero media anywhere, e.g. CSC 309) → auto-fill
  // every real topic heading with sample content so the layout is visible.
  // Same for ?demo=1. Always badged "Demo content".
  const contentTopics = content?.topics || []
  const planTopics = planCourse?.topics || []
  const baseTopics = contentTopics.length
    ? contentTopics
    : planTopics.map(pt => ({ id: pt.id, title: pt.title, order: null, tabs: { video: [], audio: [], pdf: [], text: [], other: [] }, counts: {} }))
  const hasAnyMedia = baseTopics.some(t => ['video', 'audio', 'pdf', 'text'].some(k => (t.tabs?.[k] || []).length > 0))
    || (content?.all && Object.values(content.all).some(a => a.length))
  const showDemo = demoMode || (content && !hasAnyMedia && baseTopics.length > 0)
  const topicsForDisplay = showDemo
    ? baseTopics.map((t, i) => {
        const mock = mockTopicContent(code, t.title || `Topic ${i + 1}`)
        const tabs = mock.tabs
        if (tabs.text?.[0]) tabs.text[0] = { ...tabs.text[0], coverUrl: `https://picsum.photos/seed/${slug}-${i}/800/450` }
        return { ...t, tabs, counts: mock.counts }
      })
    : baseTopics
  let sections = []
  if (planCourse) {
    const byId = new Map(topicsForDisplay.map(t => [String(t.id), t]))
    sections = (planCourse.topics || []).map(pt => ({
      plan: pt,
      content: byId.get(String(pt.id)) || topicsForDisplay.find(ct => ct.title === pt.title) || null,
    })).filter(s => s.content)
  }
  if (!sections.length && topicsForDisplay.length) {
    sections = topicsForDisplay.map(ct => ({ plan: { id: ct.id, title: ct.title, items: [] }, content: ct }))
  }
  const flat = !sections.length && content?.all && Object.values(content.all).some(a => a.length)
    ? [{ plan: { id: 'all', title: 'All content', items: [] }, content: { id: 'all', title: 'All content', tabs: content.all } }]
    : []
  const blocks = sections.length ? sections : flat

  const totalItems = planTopics.reduce((n, t) => n + (t.items || []).length, 0)
  const doneItems = planTopics.reduce((n, t) => n + (t.items || []).filter(it => doneIds.has(`${t.id}:${it.id}`)).length, 0)
  const coursePct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0

  const visible = tab === 'quiz' ? blocks : blocks.filter(s => (s.content.tabs?.[tab] || []).length > 0)

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 px-5 pb-24 pt-4">
      <div className="flex items-center gap-2">
        <Link href="/plan" className="flex size-8 items-center justify-center rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-sm font-bold">{code}</h1>
      </div>

      <div className="rounded-3xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)` }}>
        <p className="text-2xl font-extrabold">{code}</p>
        <p className="truncate text-xs text-white/75">{title}</p>
        {showDemo && (
          <span className="mt-2 inline-block rounded-full bg-white/25 px-2.5 py-0.5 text-[10px] font-bold">Demo content — uploads will replace this</span>
        )}
        {totalItems > 0 && (
          <>
            <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-white/25">
              <span className="block h-full rounded-full bg-white transition-all" style={{ width: `${coursePct}%` }} />
            </span>
            <p className="mt-1.5 text-[11px] text-white/75">{planTopics.length} topics · {doneItems}/{totalItems} done</p>
          </>
        )}
      </div>

      <div className="border-b">
        <TikTokTabs
          tabs={TABS.map(t => ({ id: t.id, label: t.label }))}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'quiz' && <QuizCard course={String(slug).toLowerCase()} title={code} />}

      {tab !== 'quiz' && visible.map(s => (
        <TopicSection key={s.plan.id} planTopic={s.plan} content={s.content} tab={tab} course={String(slug).toLowerCase()} doneIds={doneIds} flat={s.plan.id === 'all'} />
      ))}

      {tab !== 'quiz' && visible.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-muted-foreground">
          <p className="text-xs">No {tab} content in this course yet — new uploads will appear here.</p>
        </div>
      )}
    </div>
  )
}

function QuizCard({ course, title }) {
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Zap className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold">{title} Quiz</p>
          <p className="text-[11px] text-muted-foreground">Timed · scored · course question bank</p>
        </div>
      </div>
      <div className="mt-3 flex gap-4 text-center">
        <div className="flex-1 rounded-xl bg-background/60 py-2">
          <Timer className="mx-auto size-4 text-muted-foreground" />
          <p className="mt-0.5 text-sm font-extrabold">Timed</p>
        </div>
        <div className="flex-1 rounded-xl bg-background/60 py-2">
          <ListChecks className="mx-auto size-4 text-muted-foreground" />
          <p className="mt-0.5 text-sm font-extrabold">Mixed</p>
        </div>
        <div className="flex-1 rounded-xl bg-background/60 py-2">
          <Trophy className="mx-auto size-4 text-muted-foreground" />
          <p className="mt-0.5 text-sm font-extrabold">—</p>
        </div>
      </div>
      <Button asChild className="mt-3 h-12 w-full text-base">
        <Link href={`/courses/${course}/quiz`}>Start quiz</Link>
      </Button>
    </div>
  )
}

function TopicSection({ planTopic, content, tab, course, doneIds, flat }) {
  const [reader, setReader] = useState(null)
  const speech = useSpeech()

  const items = content.tabs?.[tab] || []
  const rows = planTopic.items || []
  const tDone = rows.filter(i => doneIds.has(`${planTopic.id}:${i.id}`)).length
  const tAll = rows.length > 0 && tDone === rows.length

  function itemSpeechText(item) {
    if (!item) return ''
    if (item.content) return stripHtml(item.content)
    return [item.title || '', ...((item.concepts || []))].join('. ')
  }

  const topicSpeech = ((content.tabs?.text || []).map(itemSpeechText).join('\n\n')).slice(0, 8000)

  return (
    <section className="space-y-2">
      {!flat && (
        <div className="flex items-center gap-2.5 px-1 pt-2">
          {tAll ? (
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-500">
              <Check className="size-4 text-white" strokeWidth={3} />
            </span>
          ) : (
            <span className="size-6 shrink-0 rounded-full border-2 border-muted-foreground/40" />
          )}
          <h2 className="min-w-0 flex-1 text-[15px] font-bold">{content.title}</h2>
          {rows.length > 0 && <span className="shrink-0 text-[11px] text-muted-foreground">{tDone}/{rows.length}</span>}
        </div>
      )}

      {tab === 'video' && items.map(v => <MediaCard key={v.id} item={v} />)}

      {tab === 'audio' && (
        <>
          {topicSpeech && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => speech.toggle(topicSpeech)}
                  aria-label={speech.speaking ? 'Stop' : 'Listen'}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-green-500 text-white transition hover:bg-green-600"
                >
                  {speech.speaking ? <Square className="size-4" fill="white" /> : <Volume2 className="size-5" />}
                </button>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold">Listen to this topic</span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {speech.speaking || speech.elapsed > 0 ? `▶ ${fmtClock(speech.elapsed)} · generated audio` : 'Generated audio from the notes'}
                  </span>
                </span>
              </div>
            </div>
          )}
          {items.filter(a => a.url).map(a => <MediaCard key={a.id} item={{ ...a, type: 'audio' }} />)}
          {items.filter(a => !a.url).map(a => (
            <div key={a.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <Music className="size-4 text-muted-foreground" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{a.title}</span>
                <span className="text-[11px] text-muted-foreground">Sample · coming soon</span>
              </span>
            </div>
          ))}
        </>
      )}

      {tab === 'text' && items.map(t => <TextCard key={t.id} item={t} onOpen={(item) => { speech.stop(); setReader({ kind: 'text', item }) }} />)}

      {tab === 'pdf' && items.map(p => (
        <MediaCard key={p.id} item={{ ...p, type: 'pdf' }} onOpenPdf={(item) => { speech.stop(); setReader({ kind: 'pdf', item }) }} />
      ))}

      {reader && (
        <FullscreenReader
          title={reader.item.title}
          subtitle={reader.kind === 'pdf' ? 'PDF reader' : 'Fullscreen reading'}
          onClose={() => { speech.stop(); setReader(null) }}
          actions={
            <div className="flex shrink-0 items-center gap-1">
              {reader.kind === 'text' && (
                <button
                  onClick={() => speech.toggle(itemSpeechText(reader.item))}
                  aria-label={speech.speaking ? 'Stop reading aloud' : 'Read aloud'}
                  className="flex size-8 items-center justify-center rounded-lg hover:bg-muted"
                >
                  {speech.speaking ? <Square className="size-4" /> : <Volume2 className="size-4" />}
                </button>
              )}
              {reader.kind === 'pdf' && reader.item.url && (
                <a href={reader.item.url} target="_blank" rel="noopener noreferrer" aria-label="Open externally"
                  className="flex size-8 items-center justify-center rounded-lg hover:bg-muted">
                  <ExternalLink className="size-4" />
                </a>
              )}
            </div>
          }
        >
          {reader.kind === 'pdf' ? (
            <div className="h-full">
              <iframe src={reader.item.url} title={reader.item.title} className="h-full w-full border-0" />
            </div>
          ) : (
            <div className="mx-auto w-full max-w-2xl px-5 py-5">
              <h2 className="text-lg font-extrabold">{reader.item.title}</h2>
              {reader.item.content ? (
                <div className="prose mt-3 max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: reader.item.content }} />
              ) : (
                <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
                  {(reader.item.concepts || []).map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              )}
            </div>
          )}
        </FullscreenReader>
      )}
    </section>
  )
}
