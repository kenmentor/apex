'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Check, X as XIcon, Timer } from 'lucide-react';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];

export default function QuizModal({ quiz, onClose }) {
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [answered, setAnswered] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!quiz) return;
    setSelected(null);
    setRevealed(false);
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

  const handleSelect = (key) => {
    if (revealed) return;
    setSelected(key);
    setRevealed(true);
    setAnswered(true);
    clearInterval(timerRef.current);
  };

  const isCorrect = selected === quiz.correctAnswer;
  const handleClose = () => {
    clearInterval(timerRef.current);
    const result = answered ? { selected, correct: isCorrect, correctAnswer: quiz.correctAnswer, courseCode: quiz.courseCode } : null;
    setSelected(null);
    setRevealed(false);
    setAnswered(false);
    onClose(result);
  };

  const timerColor = timeLeft > 10 ? 'text-muted-foreground' : timeLeft > 5 ? 'text-amber-500' : 'text-red-500';

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
          <p className="text-base font-medium leading-relaxed">{quiz.question}</p>
        </div>

        {/* Options */}
        <div className="space-y-2 px-6 pb-5">
          {Object.entries(quiz.options).map(([key, val]) => {
            let cls = 'flex items-center gap-3 rounded-xl border px-4 py-3.5 text-sm transition-all cursor-pointer select-none';
            if (!revealed) cls += ' hover:bg-accent hover:border-foreground/20';
            else if (key === quiz.correctAnswer) cls += ' border-green-500 bg-green-50 dark:bg-green-950/20';
            else if (key === selected) cls += ' border-red-500 bg-red-50 dark:bg-red-950/20';
            else cls += ' opacity-40';

            return (
              <div key={key} className={cls} onClick={() => handleSelect(key)}>
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  revealed && key === quiz.correctAnswer
                    ? 'bg-green-500 text-white'
                    : revealed && key === selected
                    ? 'bg-red-500 text-white'
                    : 'bg-muted text-foreground'
                }`}>
                  {revealed && key === quiz.correctAnswer ? <Check className="size-4" /> : revealed && key === selected ? <XIcon className="size-4" /> : OPTION_LABELS[Object.keys(quiz.options).indexOf(key)]}
                </span>
                <span className={revealed && key === quiz.correctAnswer ? 'text-green-700 dark:text-green-400 font-medium' : revealed && key === selected ? 'text-red-700 dark:text-red-400' : ''}>{val}</span>
              </div>
            );
          })}
        </div>

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
                <p className="text-sm font-semibold mb-1">{isCorrect ? 'Correct!' : 'Time\'s up!'}</p>
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
