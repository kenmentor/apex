'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, Film, ClipboardList, MessageSquare, X, ArrowLeft, Play, BookOpen, Layers, Share2, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchJson } from '@/lib/fetch-json';
import { Skeleton } from '@/components/ui/skeleton';
import VideoModal from '@/components/VideoModal';
import NoteReader from '@/components/NoteReader';
import CourseShareCard from '@/components/CourseShareCard';
import { stripHtml } from '@/components/Reader';

const COURSE_TABS = [
  { id: 'quizzes', label: 'Quizzes' },
  { id: 'theory', label: 'Theory' },
  { id: 'flashcards', label: 'Cards' },
  { id: 'notes', label: 'Notes' },
  { id: 'videos', label: 'Videos' },
];

const TAB_ANIM = {
  quizzes: 'anim-tab-quiz',
  theory: 'anim-tab-theory',
  flashcards: 'anim-tab-cards',
  notes: 'anim-tab-notes',
  videos: 'anim-tab-videos',
};

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const paramCode = (params.code || '').toUpperCase().replace(/-/g, '');
  const formattedCode = paramCode.replace(/^([A-Z]+)(\d+)$/, '$1 $2');

  const [course, setCourse] = useState(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [videos, setVideos] = useState([]);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('quizzes');
  const [fan, setFan] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackHover, setFeedbackHover] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [reading, setReading] = useState(null);

  const code = course?.code || formattedCode;
  const codeForUrl = code.toLowerCase().replace(/\s+/g, '');

  useEffect(() => {
    // One parallel batch: courses list + videos + readings + CCMAS curriculum + topics.
    Promise.all([
      fetchJson(`/api/courses?limit=20`).catch(() => ({})),
      fetchJson(`/api/videos?course=${encodeURIComponent(formattedCode)}`).catch(() => []),
      fetchJson(`/api/readings?course=${encodeURIComponent(formattedCode)}`).catch(() => []),
    ])
      .then(([data, vids, reads]) => {
        const docs = data.docs || [];
        const found = docs.find((c) => c.code.replace(/\s+/g, '').toUpperCase() === paramCode);
        if (found) {
          setCourse(found);
          setQuestionCount(found.questionCount || 0);
        }
        setVideos(Array.isArray(vids) ? vids : []);
        setReadings(Array.isArray(reads) ? reads : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [paramCode, formattedCode]);

  // When you land on Cards, the deck breathes open once.
  useEffect(() => {
    if (activeTab !== 'flashcards') return
    setFan(false)
    const t = setTimeout(() => setFan(true), 250)
    return () => clearTimeout(t)
  }, [activeTab]);

  // Manual rating via the header icon only — no auto popups.

  function getYouTubeId(url) {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
    return m ? m[1] : null;
  }

  async function submitFeedback() {
    if (feedbackRating === 0) return;
    setFeedbackSubmitting(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course: code,
          rating: feedbackRating,
          comment: feedbackComment.trim() || null,
        }),
      });
      setFeedbackSent(true);
      setTimeout(() => {
        setShowFeedback(false);
        setFeedbackSent(false);
        setFeedbackRating(0);
        setFeedbackComment('');
      }, 2000);
    } catch {
      // silently fail
    }
    setFeedbackSubmitting(false);
  }

  async function handleShare() {
    // The share sheet renders the course graphic — just open it.
    setShareOpen(true)
  }

  if (loading) {
    return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background pb-24">
        <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Link href="/courses" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="flex-1 text-center text-base font-bold">
            <Skeleton className="mx-auto h-5 w-20" />
          </h1>
          <div className="size-9" />
        </header>
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background pb-24">
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-4">
        <section className="space-y-1">
          <div className="flex items-center gap-1">
            <Link href="/courses" aria-label="Back to courses" className="flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted">
              <ArrowLeft className="size-4" />
            </Link>
            <p className="min-w-0 flex-1 truncate px-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{code}</p>
            <button
              onClick={handleShare}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted"
              title="Share this course"
            >
              <Share2 className="size-4" />
            </button>
            <button
              onClick={() => setShowFeedback(true)}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted"
              title="Rate this course"
            >
              <MessageSquare className="size-4" />
            </button>
          </div>
          <h1 className="px-1 text-xl font-extrabold leading-tight">{course?.title || 'Course'}</h1>
          <p className="px-1 text-xs text-muted-foreground">{questionCount || 0} questions · {videos.length} videos · {readings.length} notes</p>
        </section>

        <div className="flex gap-5 overflow-x-auto border-b px-1 text-sm font-bold">
          {COURSE_TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={'shrink-0 pb-2 ' + (activeTab === t.id ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground')}>
              {t.label}
            </button>
          ))}
        </div>

        <div key={activeTab} className={TAB_ANIM[activeTab]}>
        {activeTab === 'quizzes' && (
          <ActionCard icon={ClipboardList} tint="bg-amber-500 text-white" wash="[background:linear-gradient(180deg,rgba(245,158,11,0.10),transparent)]" title={`${code} Full Quiz`}
            meta={`${questionCount || 0} questions · timed`} cta={questionCount > 0 ? 'Start Quiz' : 'No questions yet'}
            disabled={!questionCount} onCta={() => router.push(`/courses/${codeForUrl}/quiz`)} />
        )}

        {activeTab === 'theory' && (
          <ActionCard icon={BookOpen} tint="bg-violet-600 text-white" wash="[background:linear-gradient(180deg,rgba(124,58,237,0.10),transparent)]" title={`${code} Theory Exam`}
            meta="Type or snap your answers" cta="Start Theory" onCta={() => router.push(`/courses/${codeForUrl}/theory`)} />
        )}

        {activeTab === 'flashcards' && (
          <div className="space-y-3">
            <button onClick={() => setFan(f => !f)} aria-label="Preview the deck" className="block w-full">
              <span className="relative mx-auto block h-64 w-full max-w-[340px]">
                {[0, 1, 2, 3].map(i => {
                  const r = fan ? [-13, -4, 4, 13][i] : [-7, -2, 2, 7][i]
                  const x = fan ? [-62, -20, 20, 62][i] : [-10, -3, 3, 10][i]
                  return (
                    <span
                      key={i}
                      style={{ transform: `translateX(${x}px) rotate(${r}deg)`, zIndex: i }}
                      className="absolute left-1/2 top-2 ml-[-72px] flex h-56 w-36 flex-col gap-1.5 rounded-xl border bg-card p-3 shadow-md transition-transform duration-300 ease-out"
                    >
                      <span className="flex size-6 items-center justify-center rounded-md bg-sky-600/15 font-serif text-sm italic text-sky-600">Q</span>
                      <span className="h-2 rounded-full bg-muted" style={{ width: `${88 - i * 9}%` }} />
                      <span className="h-2 rounded-full bg-muted" style={{ width: `${70 + i * 5}%` }} />
                      <span className="h-2 rounded-full bg-muted" style={{ width: `${55 + i * 8}%` }} />
                      <span className="h-2 w-1/2 rounded-full bg-muted" />
                      <span className="mt-auto truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{code}</span>
                    </span>
                  )
                })}
              </span>
            </button>
            <button onClick={() => router.push(`/courses/${codeForUrl}/flashcards`)}
              className="mx-auto flex items-center gap-1.5 rounded-full bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-700">
              <Layers className="size-4" /> Shuffle & study
            </button>
            <p className="text-center text-[11px] text-muted-foreground">Tap the deck to {fan ? 'stack' : 'spread'} it</p>
          </div>
        )}

        {activeTab === 'notes' && (
          readings.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <FileText className="size-12 opacity-40" />
              <p className="text-sm">No notes yet for {code}.</p>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-2xl border">
              {readings.map((r, i) => (
                <button key={r._id} onClick={() => setReading(r)} style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <FileText className="size-5 text-sky-600" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{r.title}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{stripHtml(r.content).slice(0, 120)}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          )
        )}

        {reading && (
          <NoteReader
            title={reading.title || 'Note'}
            subtitle={code}
            html={reading.content}
            savePayload={{
              name: reading.title, itemKind: 'notes',
              refId: String(reading._id || ''),
              href: null, url: null,
              courseCode: code, subtitle: code,
            }}
            onClose={() => setReading(null)}
          />
        )}

        {activeTab === 'videos' && (
          videos.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <Film className="size-12 opacity-40" />
              <p className="text-sm">No videos yet for {code}.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {videos.map((v, i) => {
                const vid = getYouTubeId(v.url);
                return (
                  <button key={v._id} onClick={() => setPlayingVideo(v)} style={{ animationDelay: `${Math.min(i, 6) * 45}ms` }} className="block w-full overflow-hidden rounded-2xl border bg-card text-left transition-colors hover:bg-muted/40">
                    {vid && (
                      <div className="relative aspect-video bg-black">
                        <img
                          src={`https://img.youtube.com/vi/${vid}/hqdefault.jpg`}
                          alt={v.title}
                          loading="lazy"
                          className="size-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex size-12 items-center justify-center rounded-full bg-black/70">
                            <Play className="size-5 text-white" fill="white" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="p-3">
                      <div className="line-clamp-2 text-sm font-semibold leading-snug">{v.title}</div>
                      {v.description && (
                        <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{v.description}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )
        )}
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">Rate this course</h3>
                <button onClick={() => { setShowFeedback(false); setFeedbackSent(false); }} className="rounded-lg p-1 hover:bg-muted">
                  <X className="size-4" />
                </button>
              </div>
              {feedbackSent ? (
                <p className="text-center text-sm text-green-600">Thanks for your feedback!</p>
              ) : (
                <>
                  <div className="mb-4 flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setFeedbackRating(star)}
                        onMouseEnter={() => setFeedbackHover(star)}
                        onMouseLeave={() => setFeedbackHover(0)}
                        className="text-2xl transition-colors"
                        style={{ color: star <= (feedbackHover || feedbackRating) ? '#f59e0b' : '#d1d5db' }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    placeholder="Optional comment..."
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    className="mb-4 w-full rounded-lg border p-3 text-sm outline-none focus:border-primary"
                    rows={3}
                  />
                  <Button
                    onClick={submitFeedback}
                    disabled={feedbackRating === 0 || feedbackSubmitting}
                    className="w-full"
                  >
                    {feedbackSubmitting ? 'Sending...' : 'Send Feedback'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Share toast */}
      {playingVideo && (
        <VideoModal
          item={{
            url: playingVideo.url || null,
            title: playingVideo.title || 'Video',
            subtitle: playingVideo.description || code || null,
            kind: 'video',
            id: playingVideo._id,
            href: playingVideo.url || null,
            courseCode: code || null,
          }}
          onClose={() => setPlayingVideo(null)}
        />
      )}

      <CourseShareCard
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        course={course}
        stats={{ questions: questionCount, videos: videos.length, notes: readings.length }}
      />
    </div>
  );
}

function ActionCard({ icon: Icon, tint, wash, title, meta, cta, onCta, disabled }) {
  return (
    <div className={`rounded-2xl border bg-card p-4 ${wash || ''}`}>
      <div className="flex items-center gap-3">
        <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${tint}`}>
          <Icon className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-extrabold leading-snug">{title}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{meta}</span>
        </span>
      </div>
      <button onClick={onCta} disabled={disabled}
        className="mt-3.5 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40">
        {cta}
      </button>
    </div>
  );
}
