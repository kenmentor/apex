'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Film, Music, FileText, BookOpen, Layers, Zap, Timer, ListChecks, Trophy, Square, Volume2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import TikTokTabs from '@/components/TikTokTabs'
import MediaCard from '@/components/MediaCard'
import { FullscreenReader, useSpeech, stripHtml } from '@/components/Reader'
import { mockTopicContent } from '@/lib/demo-content'

const TABS = [
  { id: 'quiz', label: 'Quiz', icon: Zap },
  { id: 'video', label: 'Video', icon: Film },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'pdf', label: 'PDF', icon: FileText },
  { id: 'text', label: 'Text', icon: BookOpen },
  { id: 'other', label: 'Other', icon: Layers },
]

const EMPTY_COPY = {
  video: 'No videos for this topic yet.',
  audio: 'No audio for this topic yet — new uploads will appear here.',
  pdf: 'No PDFs for this topic yet — new uploads will appear here.',
  text: 'No reading for this topic yet.',
  other: 'Nothing else here.',
}

function fmtClock(secs) {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function thumbHue(s) {
  let h = 0
  for (const c of String(s || '?')) h = (h * 31 + c.charCodeAt(0)) % 360
  return h
}

export function TextCard({ item, onOpen }) {
  const h = thumbHue(item.title)
  return (
    <button onClick={() => onOpen(item)} className="block w-full overflow-hidden rounded-xl border bg-card text-left transition hover:bg-muted/50">
      <span
        className="relative block aspect-[16/9] w-full overflow-hidden"
        style={item.coverUrl ? undefined : { background: `linear-gradient(135deg, hsl(${h} 65% 45%), hsl(${(h + 50) % 360} 70% 30%))` }}
      >
        {item.coverUrl && (
          <img src={item.coverUrl} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" draggable={false} />
        )}
        <span className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
            {item.source === 'theory' ? 'Theory' : 'Reading'}
          </span>
          <span className="line-clamp-2 text-left text-lg font-extrabold leading-snug text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.6)]">
            {item.title}
          </span>
        </span>
      </span>
    </button>
  )
}

// Inline topic body: same content as the topic page, no page chrome.
// Used embedded in /plan (instant swap-render) and by the topic page itself.
export default function TopicContent({ course, topic, titleHint = '' }) {
  const [data, setData] = useState(null)
  const [demo, setDemo] = useState(false)
  const [tab, setTab] = useState('quiz')
  const [loading, setLoading] = useState(true)
  const [reader, setReader] = useState(null)
  const speech = useSpeech()

  const displayCode = String(course || '').replace(/^([a-z]+)(\d+)$/i, (_, a, b) => `${a.toUpperCase()} ${b}`)

  function openReader(kind, item) {
    speech.stop()
    setReader({ kind, item })
  }

  function closeReader() {
    speech.stop()
    setReader(null)
  }

  function itemSpeechText(item) {
    if (!item) return ''
    if (item.content) return stripHtml(item.content)
    return [item.title || '', ...((item.concepts || []))].join('. ')
  }

  const topicSpeech = ((data?.tabs?.text || []).map(itemSpeechText).join('\n\n')).slice(0, 8000)

  useEffect(() => {
    setLoading(true)
    setDemo(false)
    fetch(`/api/topic-content?course=${encodeURIComponent(course)}&topic=${encodeURIComponent(topic)}&title=${encodeURIComponent(titleHint)}`)
      .then(r => r.json())
      .then(d => {
        const tabs = d.tabs || {}
        const empty = ['video', 'audio', 'pdf', 'text', 'other'].every(k => (tabs[k] || []).length === 0)
        if (empty) {
          setData(mockTopicContent(displayCode, d.topic?.title || titleHint || 'Topic'))
          setDemo(true)
        } else {
          setData(d)
        }
        setTab('quiz')
        setLoading(false)
      })
      .catch(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, topic])

  if (loading) {
    return (
      <div className="space-y-3 py-2">
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  const tabs = data?.tabs || {}
  const quiz = (tabs.quiz || [])[0] || null

  return (
    <div className="space-y-3 py-2">
      {demo && (
        <span className="inline-block rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">Demo</span>
      )}

      <div className="border-b">
        <TikTokTabs
          tabs={TABS.map(t => ({ id: t.id, label: t.label }))}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'quiz' && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Zap className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold">{data?.topic?.title} Quiz</p>
                <p className="text-[11px] text-muted-foreground">
                  {quiz ? `${quiz.questions} questions · ${quiz.minutes} min · pass ${quiz.passMark}%` : 'Timed · scored · course question bank'}
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-4 text-center">
              <div className="flex-1 rounded-xl bg-background/60 py-2">
                <Timer className="mx-auto size-4 text-muted-foreground" />
                <p className="mt-0.5 text-sm font-extrabold">{quiz ? `${quiz.minutes}:00` : 'Timed'}</p>
              </div>
              <div className="flex-1 rounded-xl bg-background/60 py-2">
                <ListChecks className="mx-auto size-4 text-muted-foreground" />
                <p className="mt-0.5 text-sm font-extrabold">{quiz ? quiz.questions : 'Mixed'}</p>
              </div>
              <div className="flex-1 rounded-xl bg-background/60 py-2">
                <Trophy className="mx-auto size-4 text-muted-foreground" />
                <p className="mt-0.5 text-sm font-extrabold">{quiz?.best !== undefined ? `${quiz.best}%` : '—'}</p>
              </div>
            </div>
            <Button asChild className="mt-3 h-12 w-full text-base">
              <Link href={`/courses/${course}/quiz`}>Start quiz</Link>
            </Button>
          </div>
          {(quiz?.samples || []).length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Sample questions</p>
              {quiz.samples.map((s, i) => (
                <div key={i} className="rounded-xl border p-3">
                  <p className="text-sm font-semibold">{i + 1}. {s.q}</p>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {s.options.map((op, j) => (
                      <span key={j} className={`rounded-lg px-2 py-1.5 text-xs ${j === s.answer ? 'bg-green-500/10 font-bold text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                        {op}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'video' && (
        (tabs.video || []).length === 0 ? (
          <EmptyTab tab="video" />
        ) : (
          <div className="space-y-3">
            {(tabs.video || []).map(v => <MediaCard key={v.id} item={v} />)}
          </div>
        )
      )}

      {tab === 'audio' && (
        <div className="space-y-2">
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
                {speech.speaking && (
                  <span className="relative flex size-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-green-500" />
                  </span>
                )}
              </div>
              {(speech.speaking || speech.elapsed > 0) && (
                <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-green-500/20">
                  <div className="h-full rounded-full bg-green-500 transition-[width]" style={{ width: `${Math.round(speech.progress * 100)}%` }} />
                </div>
              )}
            </div>
          )}
          {(tabs.audio || []).filter(a => a.url).map(a => (
            <MediaCard key={a.id} item={{ ...a, type: 'audio' }} />
          ))}
          {(tabs.audio || []).filter(a => !a.url).map(a => (
            <div key={a.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <Music className="size-4 text-muted-foreground" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{a.title}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  {a.duration && <span className="rounded bg-muted px-1.5 py-0.5 font-semibold tabular-nums">{a.duration}</span>}
                  <span>Sample · coming soon</span>
                </span>
              </span>
            </div>
          ))}
          {!topicSpeech && (tabs.audio || []).length === 0 && (
            <EmptyTab tab="audio" />
          )}
        </div>
      )}

      {tab === 'pdf' && (
        (tabs.pdf || []).length === 0 ? (
          <EmptyTab tab="pdf" />
        ) : (
          <div className="space-y-2">
            {(tabs.pdf || []).map(p => (
              <MediaCard key={p.id} item={{ ...p, type: 'pdf' }} onOpenPdf={(item) => openReader('pdf', item)} />
            ))}
          </div>
        )
      )}

      {tab === 'text' && (
        (tabs.text || []).length === 0 ? (
          <EmptyTab tab="text" />
        ) : (
          <div className="space-y-2">
            {(tabs.text || []).map(t => <TextCard key={t.id} item={t} onOpen={(item) => openReader('text', item)} />)}
          </div>
        )
      )}

      {tab === 'other' && (
        (tabs.other || []).length === 0 ? (
          <EmptyTab tab="other" />
        ) : (
          <div className="space-y-2">
            {(tabs.other || []).map(o => (
              o.url
                ? <MediaCard key={o.id} item={o} onOpenPdf={(item) => openReader('pdf', item)} />
                : <TextCard key={o.id} item={o} onOpen={(item) => openReader('text', item)} />
            ))}
          </div>
        )
      )}

      {reader && (
        <FullscreenReader
          title={reader.item.title}
          subtitle={reader.kind === 'pdf' ? 'PDF reader' : 'Fullscreen reading'}
          onClose={closeReader}
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
                <a
                  href={reader.item.url} target="_blank" rel="noopener noreferrer" aria-label="Open externally"
                  className="flex size-8 items-center justify-center rounded-lg hover:bg-muted"
                >
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
    </div>
  )
}

function EmptyTab({ tab }) {
  const meta = TABS.find(t => t.id === tab)
  const Icon = meta?.icon || BookOpen
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-muted-foreground">
      <Icon className="size-8 opacity-40" />
      <p className="text-xs">{EMPTY_COPY[tab]}</p>
    </div>
  )
}
