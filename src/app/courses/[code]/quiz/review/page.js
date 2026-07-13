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
                    <div className="space-y-1.5">
                      {optKeys.map((k) => {
                        let styles = 'border bg-transparent';
                        if (k === a.correctKey) styles = 'border border-green-500/30 bg-green-500/10';
                        else if (k === a.selected && !a.isCorrect) styles = 'border border-red-500/30 bg-red-500/10';
                        return (
                          <div key={k} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${styles}`}>
                            <span>
                              <strong>{k.toUpperCase()}.</strong> {q.options[k]}
                            </span>
                            <span className="text-sm">
                              {k === a.correctKey ? '✓' : k === a.selected && !a.isCorrect ? '✗' : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
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
