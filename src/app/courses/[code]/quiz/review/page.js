'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';

export default function ReviewPage() {
  const params = useParams();
  const code = params.code?.toUpperCase() || '';
  const [data, setData] = useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('apex_review');
      if (raw) setData(JSON.parse(raw));
    } catch {}
  }, []);

  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-5 pb-24">
        <Card className="w-full max-w-lg flex items-center justify-center py-20 text-center">
          <div>
            <div className="mb-4 text-5xl">📋</div>
            <p className="text-muted-foreground">No review data found</p>
            <Link href={`/courses/${code.toLowerCase()}`} className="mt-5 inline-block">
              <Button className="mt-5 px-6">Back to Course</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const { answers, questions } = data;
  const correctCount = answers.filter(a => a.isCorrect).length;
  const total = answers.length;
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  return (
    <div className="flex min-h-dvh flex-col bg-background px-5 pb-24 pt-6">
      <div className="mx-auto w-full max-w-lg space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link href={`/courses/${code.toLowerCase()}/quiz`} className="flex size-10 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80">
            <ChevronLeft className="size-4" />
          </Link>
          <h1 className="text-lg font-bold">Answer Review</h1>
          <div className="size-10" />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {code} · {correctCount}/{total} ({pct}%)
        </p>

        <div className="space-y-3">
          {answers.map((a, i) => {
            const q = questions[a.questionIndex] || questions[i];
            if (!q) return null;
            const optKeys = Object.keys(q.options);
            return (
              <Card key={i} className="p-4">
                <div className="flex gap-3">
                  <div className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    a.isCorrect
                      ? 'bg-green-500/15 text-green-500'
                      : 'bg-red-500/15 text-red-500'
                  }`}>
                    {a.isCorrect ? '✓' : '✗'}
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <p className="text-sm font-semibold leading-relaxed">Q{i + 1}. {q.question}</p>
                    {(q.imageUrl || q.image_url) && !q.subQuestions && !q.pairs && (
                      <img src={q.imageUrl || q.image_url} alt="Question image" loading="lazy" className="max-h-48 w-full rounded-xl object-contain bg-black/5" />
                    )}
                    {(q.audioUrl || q.audio_url) && (
                      <audio controls preload="none" src={q.audioUrl || q.audio_url} className="w-full" style={{ height: 32 }} />
                    )}
                    {q.vignette && (
                      <div className="rounded-xl border-l-[3px] border-primary bg-muted/50 p-3 text-sm">
                        <strong className="text-foreground">Case: </strong><span className="whitespace-pre-line text-muted-foreground">{q.vignette}</span>
                      </div>
                    )}
                    {(q.subQuestions || q.subs) && (
                      <div className="space-y-2">
                        {(q.subQuestions || q.subs).map((s, si) => {
                          const mine = a.selected?.[si];
                          const ok = a.isCorrect || (s.answers ? (s.answers.includes(mine)) : String(mine || '').toLowerCase() === String(s.correctAnswer ?? s.correct_answer ?? '').toLowerCase());
                          return (
                            <div key={si} className={`rounded-xl border px-3 py-2 text-sm ${ok ? '' : 'border-red-500/30 bg-red-500/10'}`}>
                              <p className="font-semibold">Q{si + 1}. {s.q || s.question}</p>
                              {s.options ? (
                                <div className="mt-1 space-y-1">
                                  {Object.keys(s.options).map(k => {
                                    const ck = String(s.correctAnswer ?? s.correct_answer ?? '').toLowerCase();
                                    return (
                                      <div key={k} className={`flex items-center justify-between rounded-lg px-2 py-1 ${k.toLowerCase() === ck ? 'bg-green-500/10 text-green-600' : String(mine).toLowerCase() === k.toLowerCase() && !ok ? 'bg-red-500/10 text-red-500' : ''}`}>
                                        <span><strong>{k.toUpperCase()}.</strong> {s.options[k]}</span>
                                        <span>{k.toLowerCase() === ck ? '✓' : (String(mine).toLowerCase() === k.toLowerCase() ? '✗' : '')}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="mt-1 text-muted-foreground">Yours: <strong className="text-foreground">{String(mine ?? '—')}</strong> · Accepted: {(s.answers || s.blankAnswers || []).join(' · ')}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {(q.stages || []).length > 0 && (
                      <div className="space-y-2">
                        {q.stages.map((s, si) => (
                          <div key={si} className="rounded-xl border bg-muted/50 p-3 text-sm">
                            <p className="font-semibold">Stage {si + 1}</p>
                            <p className="whitespace-pre-line text-muted-foreground">{s.info}</p>
                            <p className="mt-1 font-semibold">{s.question}</p>
                            <p className="mt-1 whitespace-pre-line">Yours: {String(a.selected?.[si] ?? '—')}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {(q.rubric || q.modelAnswer) && (q.questionType === 'essay' || q.type === 'essay' || q.questionType === 'viva' || q.type === 'viva') && (
                      <div className="space-y-1.5 text-sm">
                        <p className="whitespace-pre-line rounded-xl border bg-muted/50 p-3">Yours: {String(a.selected ?? '—')}</p>
                        <div className="rounded-xl border-l-[3px] border-primary bg-muted/50 p-3">
                          <strong className="text-foreground">{q.questionType === 'viva' || q.type === 'viva' ? 'Model answer: ' : 'Rubric: '}</strong>
                          <span className="whitespace-pre-line text-muted-foreground">{q.rubric || q.modelAnswer}</span>
                        </div>
                      </div>
                    )}
                    {q.checklist && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your checklist ({Object.values(a.selected || {}).filter(Boolean).length}/{q.checklist.length})</p>
                        {q.checklist.map((c, ci) => (
                          <div key={ci} className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${a.selected?.[ci] ? 'bg-green-500/10' : ''}`}>
                            <span>{c.text}</span>
                            <span>{a.selected?.[ci] ? '✓' : '·'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {(q.imageUrl || q.image_url) && (
                      <img src={q.imageUrl || q.image_url} alt="Question image" loading="lazy" className="max-h-48 w-full rounded-xl object-contain bg-black/5" />
                    )}
                    {(q.questionType === 'mtf' || q.type === 'mtf') && (
                      <div className="space-y-1.5 text-sm">
                        {Object.keys(q.options || {}).map(k => {
                          const truthy = v => /^(true|t)$/i.test(String(v ?? ''));
                          const mine = a.selected?.[k];
                          const ok = mine && truthy(mine) === truthy(a.correctKey?.[k]);
                          return (
                            <div key={k} className={`flex items-center justify-between rounded-xl border px-3 py-2 ${ok ? '' : 'border-red-500/30 bg-red-500/10'}`}>
                              <span className="min-w-0 flex-1 truncate"><strong>{k.toUpperCase()}.</strong> {q.options[k]}</span>
                              <span className="shrink-0 text-xs font-bold">{mine ? (truthy(mine) ? 'T' : 'F') : '—'} / {(truthy(a.correctKey?.[k]) ? 'T' : 'F')} {ok ? '✓' : '✗'}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {!(q.questionType === 'mtf' || q.type === 'mtf') && ['fib', 'saq'].includes(q.questionType || q.type || 'fib') && (!q.options || Object.keys(q.options).length === 0) && (
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center justify-between rounded-xl border px-3 py-2">
                          <span>Your answer: <strong>{String(a.selected ?? '—')}</strong></span>
                          <span>{a.isCorrect ? '✓' : '✗'}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2">
                          <span>Accepted: <strong>{(q.blankAnswers || q.blank_answers || [a.correctKey]).filter(Boolean).join(' · ')}</strong></span>
                          <span>✓</span>
                        </div>
                      </div>
                    )}
                    {q.pairs && (
                      <div className="space-y-1.5 text-sm">
                        {q.pairs.map((p, pi) => {
                          const mine = a.selected?.[pi];
                          const ok = String(mine || '').toLowerCase() === String(p.answer || p.answerKey || '').toLowerCase();
                          return (
                            <div key={pi} className={`flex items-center justify-between rounded-xl border px-3 py-2 ${ok ? '' : 'border-red-500/30 bg-red-500/10'}`}>
                              <span className="min-w-0 flex-1 truncate">{p.stem} → <strong>{mine ? `${String(mine).toUpperCase()}. ${q.options?.[mine] ?? ''}` : '—'}</strong></span>
                              <span>{ok ? '✓' : '✗'}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {!(q.questionType === 'mtf' || q.type === 'mtf') && (!q.pairs && q.options && Object.keys(q.options).length > 0) && (
                    <div className="space-y-1.5">
                      {optKeys.map((k) => {
                        const correctKeys = Array.isArray(a.correctKey)
                          ? a.correctKey.map(v => String(v).toLowerCase())
                          : [String(a.correctKey).toLowerCase()];
                        const isCorrectKey = a.correctKey != null && correctKeys.includes(String(k).toLowerCase());
                        const picked = Array.isArray(a.selected) ? a.selected.map(v => String(v).toLowerCase()) : [String(a.selected).toLowerCase()];
                        const isSelected = picked.includes(String(k).toLowerCase());
                        let styles = 'border border-transparent';
                        if (isCorrectKey) styles = 'border border-green-500/30 bg-green-500/10';
                        else if (isSelected && !a.isCorrect) styles = 'border border-red-500/30 bg-red-500/10';
                        return (
                          <div key={k} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${styles}`}>
                            <span>
                              <strong>{k.toUpperCase()}.</strong> {q.options[k]}
                            </span>
                            <span className="text-sm">
                              {isCorrectKey ? '✓' : isSelected && !a.isCorrect ? '✗' : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    )}
                    {q.explanation && (
                      <div className="rounded-xl border-l-[3px] border-orange-500 bg-muted/50 p-3 text-sm text-muted-foreground">
                        <strong className="text-foreground">Explanation: </strong>{q.explanation}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="pt-4 text-center">
          <Link href={`/courses/${code.toLowerCase()}/quiz`}>
            <Button className="px-8 py-5 text-sm font-semibold">Back to Results</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
