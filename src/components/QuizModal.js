'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { X, Check, X as XIcon, Timer } from 'lucide-react';
import { gradeAnswer, typeOf } from '@/lib/quiz-types';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];

export default function QuizModal({ quiz, onClose }) {
  const [selected, setSelected] = useState(null);
  const [text, setText] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [answered, setAnswered] = useState(false);
  const timerRef = useRef(null);

  const qType = typeOf(quiz || {});
  const fullQuizHref = quiz?.courseCode ? `/courses/${String(quiz.courseCode).toLowerCase().replace(/\s+/g, '')}/quiz` : '/courses';

  const handleMtf = (key, val) => {
    if (revealed) return;
    setSelected(prev => ({ ...((prev && typeof prev === 'object' && !Array.isArray(prev)) ? prev : {}), [key]: val }));
  };
  const mtfDone = qType === 'mtf' && Object.keys(quiz?.options || {}).every(k => selected?.[k]);
  const mtfSubmit = () => {
    if (!mtfDone || revealed) return;
    setRevealed(true);
    setAnswered(true);
    clearInterval(timerRef.current);
  };

  useEffect(() => {
    if (!quiz) return;
    setSelected(null);
    setText('');
    setRevealed(false);
    setAnswered(false);
    setTimeLeft(30);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setRevealed(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [quiz]);

  if (!quiz) return null;

  const answerOf = () => {
    if (qType === 'fib') return text;
    if (qType === 'multi') return selected;
    return selected;
  };

  const handleSelect = (key) => {
    if (revealed) return;
    if (qType === 'multi') {
      setSelected(prev => {
        const arr = Array.isArray(prev) ? [...prev] : [];
        return arr.includes(key) ? arr.filter(k => k !== key) : [...arr, key];
      });
      return;
    }
    setSelected(key);
    setRevealed(true);
    setAnswered(true);
    clearInterval(timerRef.current);
  };

  const handleSubmitText = () => {
    if (revealed || !String(text).trim()) return;
    setRevealed(true);
    setAnswered(true);
    clearInterval(timerRef.current);
  };

  const isCorrect = gradeAnswer(quiz, answerOf());
  const handleClose = () => {
    clearInterval(timerRef.current);
    const result = answered ? { selected: answerOf(), correct: isCorrect, correctAnswer: quiz.correctAnswer ?? quiz.correct_answer, courseCode: quiz.courseCode } : null;
    setSelected(null);
    setText('');
    setRevealed(false);
    setAnswered(false);
    onClose(result);
  };

  const timerColor = timeLeft > 10 ? 'text-muted-foreground' : timeLeft > 5 ? 'text-amber-500' : 'text-red-500';
  const typeTag = { tf: 'True / False', multi: 'Pick all that apply', fib: 'Type the answer', match: 'Matching', image: 'Image question', mtf: 'True / False each', assertion: 'Assertion–Reason', saq: 'Short answer', essay: 'Essay', meq: 'Staged case', spotter: 'Spotter', osce: 'OSCE station', audio: 'Listen, then answer', viva: 'Viva practice', case: 'Case-based' }[qType];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="relative w-full max-w-lg rounded-2xl border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">A</span>
            <span className="text-sm font-bold">Alex Quiz</span>
            <span className="text-[10px] text-muted-foreground">· {quiz.courseCode}</span>
            {          typeTag && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{qType === 'mtf' ? 'True / False each' : typeTag}</span>}
          </div>
          <div className="flex items-center gap-3">
            {!revealed && (
              <div className={`flex items-center gap-1 text-xs font-medium ${timerColor}`}>
                <Timer className="size-3.5" />
                <span className="tabular-nums">{timeLeft}s</span>
              </div>
            )}
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Question */}
        <div className="px-6 py-5">
          {(quiz.imageUrl || quiz.image_url) && (
            <img src={quiz.imageUrl || quiz.image_url} alt="Question image" loading="lazy" className="mb-3 max-h-56 w-full rounded-xl object-contain bg-black/5" />
          )}
          {(quiz.audioUrl || quiz.audio_url) && (
            <audio controls preload="none" src={quiz.audioUrl || quiz.audio_url} className="mb-3 w-full" style={{ height: 36 }} />
          )}
          {qType === 'case' && quiz.vignette && (
            <p className="mb-3 rounded-xl border-l-4 border-primary bg-muted/50 p-3 text-left text-sm leading-relaxed">{quiz.vignette}</p>
          )}
          <p className="text-base font-medium leading-relaxed">{quiz.question}</p>
        </div>

        {/* Multiple True/False → judge every option */}
        {qType === 'mtf' && (
          <div className="space-y-2 px-6 pb-5">
            {Object.keys(quiz.options || {}).map((key, i) => {
              const picked = selected?.[key];
              const correctMap = quiz.correctAnswer ?? quiz.correct_answer ?? {};
              const truthy = v => /^(true|t)$/i.test(String(v ?? ''));
              return (
                <div key={key} className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-sm font-medium ${revealed ? (picked && truthy(picked) === truthy(correctMap[key]) ? 'border-emerald-500 bg-emerald-500/15' : 'border-red-500 bg-red-500/10') : 'border-muted'}`}>
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-black">{OPTION_LABELS[i] || key}</span>
                  <span className="min-w-0 flex-1">{quiz.options[key]}</span>
                  <div className="flex shrink-0 gap-1">
                    {['true', 'false'].map(v => (
                      <button key={v} disabled={revealed} onClick={() => handleMtf(key, picked === v ? undefined : v)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-black ${picked === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        {v === 'true' ? 'T' : 'F'}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {!revealed && (
              <button onClick={mtfSubmit} disabled={!mtfDone} className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
                Check
              </button>
            )}
          </div>
        )}

        {/* Big formats → full quiz (need the big layout) */}
        {['match', 'case', 'essay', 'meq', 'spotter', 'osce', 'viva'].includes(qType) ? (
          <div className="space-y-3 px-6 pb-5">
            <p className="text-center text-sm text-muted-foreground">This format plays best in the full quiz.</p>
            <Link href={fullQuizHref} className="block w-full rounded-xl bg-primary py-3 text-center text-sm font-bold text-primary-foreground">
              Open full quiz
            </Link>
          </div>
        ) : (qType === 'fib' || qType === 'saq' || (qType === 'audio' && (quiz.followupKind === 'fib' || !quiz.options || !Object.keys(quiz.options).length))) ? (
          <div className="space-y-3 px-6 pb-5">
            <input
              value={text}
              onChange={e => !revealed && setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmitText() }}
              placeholder="Type your answer…"
              disabled={revealed}
              className="w-full rounded-xl border bg-background px-4 py-3.5 text-center text-sm font-semibold outline-none focus:border-primary disabled:opacity-60"
            />
            {!revealed && (
              <button onClick={handleSubmitText} disabled={!String(text).trim()} className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
                Check
              </button>
            )}
            {revealed && (
              <p className="text-center text-xs text-muted-foreground">
                Accepted: {(quiz.blankAnswers || quiz.blank_answers || []).join(' · ')}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2 px-6 pb-5">
            {Object.entries(quiz.options || {}).map(([key, val], i) => {
              const picked = qType === 'multi' ? (selected || []).includes(key) : selected === key;
              let cls = 'flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-all cursor-pointer select-none';
              if (!revealed) cls += ' border-muted hover:border-primary/50 hover:bg-muted/60';
              else {
                const correctKeys = Array.isArray(quiz.correctAnswer ?? quiz.correct_answer)
                  ? (quiz.correctAnswer ?? quiz.correct_answer).map(v => String(v).toLowerCase())
                  : [String(quiz.correctAnswer ?? quiz.correct_answer).toLowerCase()];
                const isKey = correctKeys.includes(String(key).toLowerCase());
                if (isKey) cls += ' border-emerald-500 bg-emerald-500/15';
                else if (picked) cls += ' border-red-500 bg-red-500/10';
                else cls += ' border-muted opacity-40';
              }
              return (
                <div key={key} className={cls} onClick={() => handleSelect(key)}>
                  <span className={`flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-black uppercase ${
                    revealed ? 'bg-muted text-muted-foreground' : picked && qType === 'multi' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {revealed ? OPTION_LABELS[i] || key : (picked && qType === 'multi' ? <Check className="size-4" /> : OPTION_LABELS[i] || key)}
                  </span>
                  <span className="flex-1">{val}</span>
                  {revealed && (() => {
                    const correctKeys = Array.isArray(quiz.correctAnswer ?? quiz.correct_answer)
                      ? (quiz.correctAnswer ?? quiz.correct_answer).map(v => String(v).toLowerCase())
                      : [String(quiz.correctAnswer ?? quiz.correct_answer).toLowerCase()];
                    if (correctKeys.includes(String(key).toLowerCase())) return <Check className="size-4 shrink-0 text-green-500" />;
                    if (picked) return <XIcon className="size-4 shrink-0 text-red-500" />;
                    return null;
                  })()}
                </div>
              );
            })}
            {qType === 'multi' && !revealed && (
              <button onClick={() => { if ((selected || []).length) { setRevealed(true); setAnswered(true); clearInterval(timerRef.current) } }} disabled={!(selected || []).length} className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
                Check {(selected || []).length ? `(${(selected || []).length})` : ''}
              </button>
            )}
          </div>
        )}

        {/* Explanation */}
        {revealed && (
          <div className={`border-t px-6 py-4 ${isCorrect ? 'bg-green-50/50 dark:bg-green-950/10' : 'bg-red-50/50 dark:bg-red-950/10'}`}>
            <div className="flex items-start gap-2.5">
              <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
              }`}>
                {isCorrect ? <Check className="size-3.5" /> : <XIcon className="size-3.5" />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold mb-1">{isCorrect ? 'Correct!' : 'Not quite.'}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{quiz.explanation || 'No explanation available.'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Close button */}
        <div className="border-t px-6 py-3">
          <button
            onClick={handleClose}
            className="w-full rounded-xl bg-muted py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {revealed ? 'Got it' : 'Skip'}
          </button>
        </div>
      </div>
    </div>
  );
}
