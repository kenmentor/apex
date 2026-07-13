'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, PlayCircle, Star, Film, ClipboardList, MessageSquare, X, ArrowLeft, Bookmark, Play } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackHover, setFeedbackHover] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const code = course?.code || formattedCode;
  const codeForUrl = code.toLowerCase().replace(/\s+/g, '');

  useEffect(() => {
    fetch(`/api/courses?limit=20`)
      .then((r) => r.json())
      .then((data) => {
        const docs = data.docs || [];
        const found = docs.find((c) => c.code.replace(/\s+/g, '').toUpperCase() === paramCode);
        if (found) {
          setCourse(found);
          setQuestionCount(found.questionCount || 0);
        }
        fetch(`/api/videos?course=${encodeURIComponent(formattedCode)}`)
          .then((r) => r.json())
          .then(setVideos)
          .catch(() => {});
        fetch(`/api/readings?course=${encodeURIComponent(formattedCode)}`)
          .then((r) => r.json())
          .then(setReadings)
          .catch(() => {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [paramCode, formattedCode]);

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
        <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Link href="/courses" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="flex-1 text-center text-base font-bold">
            <Skeleton className="mx-auto h-5 w-20" />
          </h1>
          <div className="size-9" />
        </header>

      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="quizzes" className="flex-1">
              <Star className="mr-1 size-3" />
              Quizzes
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex-1">
              <FileText className="mr-1 size-3" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex-1">
              <PlayCircle className="mr-1 size-3" />
              Videos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quizzes" className="mt-4">
            <div className="space-y-4">
              <Card
                className="overflow-hidden border-0 text-white"
                style={{ background: `linear-gradient(135deg, ${course?.color || '#130f40'}, #2c2c54)` }}
              >
                <CardContent className="p-6 text-center">
                  <ClipboardList className="mx-auto mb-2 size-9" />
                  <h3 className="text-lg font-bold">{code} Full Quiz</h3>
                  <p className="mb-4 text-sm text-white/70">{questionCount || 0} questions</p>
                  {questionCount > 0 ? (
                    <Button
                      onClick={() => router.push(`/courses/${codeForUrl}/quiz`)}
                      className="bg-white text-black hover:bg-white/90"
                      size="lg"
                    >
                      Start Quiz
                    </Button>
                  ) : (
                    <p className="text-sm text-white/60">No questions available yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="mt-4">
            <ScrollArea className="max-h-[calc(100dvh-200px)]">
              {readings.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                  <FileText className="size-12 opacity-40" />
                  <p className="text-sm">No notes yet for {code}.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {readings.map((r) => (
                    <Card key={r._id}>
                      <CardContent className="p-5">
                        <h2 className="mb-3 text-lg font-bold">{r.title}</h2>
                        <div
                          className="prose prose-sm max-w-none text-muted-foreground"
                          dangerouslySetInnerHTML={{ __html: r.content }}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="videos" className="mt-4">
            <ScrollArea className="max-h-[calc(100dvh-200px)]">
              {videos.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                  <Film className="size-12 opacity-40" />
                  <p className="text-sm">No videos yet for {code}.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {videos.map((v) => {
                    const vid = getYouTubeId(v.url);
                    return (
                      <a key={v._id} href={v.url} target="_blank" rel="noopener noreferrer" className="block">
                        <Card className="overflow-hidden transition-colors hover:bg-accent">
                          {vid && (
                            <div className="relative aspect-video bg-black">
                              <img
                                src={`https://img.youtube.com/vi/${vid}/hqdefault.jpg`}
                                alt={v.title}
                                className="size-full object-cover"
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="flex size-12 items-center justify-center rounded-full bg-black/70">
                                  <Play className="size-5 text-white" fill="white" />
                                </div>
                              </div>
                            </div>
                          )}
                          <CardContent className="p-3">
                            <div className="text-sm font-semibold">{v.title}</div>
                            {v.description && (
                              <div className="mt-1 text-xs text-muted-foreground">{v.description}</div>
                            )}
                          </CardContent>
                        </Card>
                      </a>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
