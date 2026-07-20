'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { playClick, playCorrect, playWrong } from '@/lib/sound';
import { getUser, getToken } from '@/lib/auth';
import { getCachedQuestions, cacheQuestions } from '@/lib/questionCache';
import { trackQuizEvent } from '@/components/AnalyticsTracker';
import { trackEvent } from '@/lib/tracking';
import { trackAnswerSubmitted, trackSessionTerminated, trackExplanationViewed, trackTextCopied } from '@/lib/telemetry';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import CodeBlock from '@/components/CodeBlock';
import { ChevronLeft, Clock, Check, AlertTriangle } from 'lucide-react';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SEEN_KEY_PREFIX = 'apex_seen_'

const FUNNY_COMMENTS = {
  high: [
    "Department don officially fear me. 😎📚",
    "The examiner go think say I set the questions. 😂🔥",
    "Brain.exe running at 100%. 🚀🧠",
    "No be pride... na evidence. 😌🏆",
    "If this exam na football, na hat-trick be this. ⚽🔥",
    "ChatGPT fit rest today. 😂💯",
    "My village people missed today's meeting. 😂",
    "I no read finish... I conquered finish. 😤🔥",
    "The questions were asking me for answers. 😭😂",
    "Legend status unlocked. 🏅"
  ],
  good: [
    "We're cooking... just not Michelin star yet. 🍳😂",
    "Steady progress. GPA dey smile already. 📈",
    "Almost embarrassed the examiner. 😂",
    "One more attempt and it's over for this course. 😤",
    "Confidence: 📈 Marks: 📈 Happiness: 📈",
    "I came. I saw. I nearly conquered. 😂",
    "Na small remain make I become lecturer. 😭",
    "My calculator even proud of me. 😂",
    "No panic. Semester still dey. 💪",
    "The comeback has started. 🚀"
  ],
  mid: [
    "I understand the assignment... small. 😂",
    "The exam understood me more than I understood it. 😭",
    "Loading... intelligence 67%. ⏳😂",
    "We're making progress. Slowly but surely. 📚",
    "This one na warm-up. 😤",
    "At least I no submit blank. 😭",
    "The examiner won this round. 🤝😂",
    "Brain buffering... please wait. 🧠⏳",
    "Hope is still alive. 😂",
    "Revision and I need to become friends. 📖"
  ],
  low: [
    "The questions and I met for the first time today. 😭",
    "Even Google would need time for this one. 😂",
    "Respectfully... what was that? 💀",
    "The exam cooked me medium rare. 🔥😭",
    "Character development activated. 📚😂",
    "At least I now know what NOT to read. 😭",
    "This score is between me and God. 😂",
    "The examiner definitely knows me personally. 😭",
    "Mission failed... semester continues. 💪",
    "Round 2 loading... this time with vengeance. 😤"
  ]
}

function getFunnyComment(pct) {
  const list = pct >= 80 ? FUNNY_COMMENTS.high : pct >= 60 ? FUNNY_COMMENTS.good : pct >= 40 ? FUNNY_COMMENTS.mid : FUNNY_COMMENTS.low
  return list[Math.floor(Math.random() * list.length)]
}

function getSeenIds(code) {
  try {
    const raw = localStorage.getItem(SEEN_KEY_PREFIX + code.toUpperCase().replace(/\s+/g, ''))
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function markSeenIds(code, ids) {
  try {
    const key = SEEN_KEY_PREFIX + code.toUpperCase().replace(/\s+/g, '')
    const existing = getSeenIds(code)
    const updated = [...new Set([...existing, ...ids])]
    localStorage.setItem(key, JSON.stringify(updated))
  } catch {}
}

function clearSeenIds(code) {
  try {
    localStorage.removeItem(SEEN_KEY_PREFIX + code.toUpperCase().replace(/\s+/g, ''))
  } catch {}
}

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code?.toUpperCase() || '';

  const [allQuestions, setAllQuestions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [playerSchool, setPlayerSchool] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [restoredProgress, setRestoredProgress] = useState(null);
  const [settings, setSettings] = useState({ questionLimit: 10, timePerQuestion: 30, offline: false });
  const [cheatWarning, setCheatWarning] = useState('')
  const [shareCardUrl, setShareCardUrl] = useState('')
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [revealAnswer, setRevealAnswer] = useState(false)
  const shareCommentRef = useRef('')
  const startTime = useRef(Date.now());
  const timerRef = useRef(null);

  const PROGRESS_KEY = `quiz_progress_${code.toLowerCase()}`;
  const stateRef = useRef({});
  const selectedIndicesRef = useRef([]);
  const unmountSaved = useRef(false);
  const prevAnswerCount = useRef(0);

  function loadProgress() {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }

  function clearProgress() {
    try { localStorage.removeItem(PROGRESS_KEY) } catch {}
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      const cached = await getCachedQuestions(code)
      if (cancelled) return
      if (cached && cached.length > 0) {
        setAllQuestions(cached)
        setLoading(false)
        const saved = loadProgress()
        if (saved && saved.currentIndex < saved.questionCount) {
          if (saved.settings) setSettings(saved.settings)
          setRestoredProgress(saved)
          setShowResumePrompt(true)
        } else {
          startTime.current = Date.now()
        }
      }
      if (settings.offline && cached?.length > 0) return
      try {
        const res = await fetch(`/api/questions?course=${encodeURIComponent(code)}`)
        const data = await res.json()
        if (cancelled) return
        let allQ = []
        if (data.sections) allQ = data.sections.flatMap((s) => s.questions)
        else if (Array.isArray(data)) allQ = data
        setAllQuestions(allQ)
        cacheQuestions(code, allQ)
        if (!cached || cached.length === 0) {
          const saved = loadProgress()
          if (saved && saved.currentIndex < saved.questionCount) {
            if (saved.settings) setSettings(saved.settings)
            setRestoredProgress(saved)
            setShowResumePrompt(true)
          } else {
            startTime.current = Date.now()
          }
        }
      } catch { /* offline - cached data already loaded */ }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [code, settings.offline])

  function handleResume(saved) {
    if (saved.settings) setSettings(saved.settings);
    const indices = saved.selectedIndices || [];
    if (indices.length > 0) {
      selectedIndicesRef.current = indices;
      setQuestions(indices.map(i => allQuestions[i]).filter(Boolean));
    } else {
      setQuestions(allQuestions);
    }
    setQuizStarted(true);
    setCurrentIndex(saved.currentIndex);
    setAnswers(saved.answers);
    setTimeLeft(Math.max(1, saved.timeLeft || saved.settings?.timePerQuestion || 30));
    setPlayerName(saved.playerName || '');
    setPlayerSchool(saved.playerSchool || '');
    startTime.current = Date.now() - (saved.timeElapsed || 0);
    setShowResumePrompt(false);
    setRestoredProgress(null);
  }

  function handleStartFresh() {
    clearProgress();
    startTime.current = Date.now();
    setShowResumePrompt(false);
    setRestoredProgress(null);
    setRevealAnswer(false);
  }

  function handleStartQuiz() {
    setRevealAnswer(false);
    let available = allQuestions;
    const seen = getSeenIds(code);
    let unseen = available.filter((q, idx) => !seen.includes(idx));
    if (unseen.length === 0) {
      clearSeenIds(code);
      unseen = available;
    }
    const limit = settings.questionLimit;
    if (limit > 0 && limit < unseen.length) {
      const selected = shuffleArray(unseen).slice(0, limit);
      selectedIndicesRef.current = selected.map(q => allQuestions.indexOf(q));
      setQuestions(selected);
    } else {
      selectedIndicesRef.current = unseen.map(q => allQuestions.indexOf(q));
      setQuestions(shuffleArray(unseen));
    }
    setQuizStarted(true);
    setTimeLeft(settings.timePerQuestion);
    startTime.current = Date.now();
    trackQuizEvent('quiz_started', { course: code, questionCount: settings.questionLimit, timePerQuestion: settings.timePerQuestion });
  }

  useEffect(() => {
    if (loading || !quizStarted || finished) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [loading, quizStarted, finished, currentIndex]);

  useEffect(() => {
    if (timeLeft === 0 && !finished && quizStarted && !revealAnswer) {
      handleNext(true);
    }
  }, [timeLeft]);

  useEffect(() => {
    stateRef.current = { currentIndex, answers, timeLeft, playerName, playerSchool, finished, questionCount: questions.length, settings };
  });

  useEffect(() => {
    if (!finished) return
    const generateCard = async () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 600
        canvas.height = 500
        const ctx = canvas.getContext('2d')

        const grad = ctx.createLinearGradient(0, 0, 0, 500)
        grad.addColorStop(0, '#130f40')
        grad.addColorStop(1, '#2c2c54')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, 600, 500)

        ctx.fillStyle = '#ff9f43'
        ctx.fillRect(0, 0, 600, 8)

        const comment = getFunnyComment(pct)
        shareCommentRef.current = comment
        ctx.font = 'bold 24px sans-serif'
        ctx.fillStyle = '#ff9f43'
        ctx.textAlign = 'center'
        ctx.fillText(comment, 300, 120)

        ctx.font = 'bold 28px sans-serif'
        ctx.fillStyle = '#ffffff'
        ctx.fillText('APEX', 300, 200)
        ctx.font = '13px sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.fillText('quiz.apex.app', 300, 218)

        const cardY = 255, cardH = 170
        ctx.beginPath()
        const cr = 20
        ctx.moveTo(40 + cr, cardY)
        ctx.lineTo(40 + 520 - cr, cardY)
        ctx.quadraticCurveTo(40 + 520, cardY, 40 + 520, cardY + cr)
        ctx.lineTo(40 + 520, cardY + cardH - cr)
        ctx.quadraticCurveTo(40 + 520, cardY + cardH, 40 + 520 - cr, cardY + cardH)
        ctx.lineTo(40 + cr, cardY + cardH)
        ctx.quadraticCurveTo(40, cardY + cardH, 40, cardY + cardH - cr)
        ctx.lineTo(40, cardY + cr)
        ctx.quadraticCurveTo(40, cardY, 40 + cr, cardY)
        ctx.closePath()
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.fill()

        ctx.textAlign = 'center'
        ctx.font = 'bold 64px sans-serif'
        ctx.fillStyle = '#ff9f43'
        ctx.fillText(`${correctCount}/${total}`, 300, cardY + 90)

        ctx.font = '18px sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.fillText(`${pct}% · ${formatTime(elapsedSeconds)} · ${code}`, 300, cardY + 135)

        ctx.font = '12px sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.3)'
        ctx.textAlign = 'center'
        ctx.fillText('Download Apex 👉 quiz.apex.app', 300, 470)
        ctx.textAlign = 'left'

        setShareCardUrl(canvas.toDataURL('image/png'))
      } catch {}
    }
    generateCard()
  }, [finished])

  useEffect(() => {
    if (quizStarted && !finished && answers.length > 0 && answers.length !== prevAnswerCount.current) {
      prevAnswerCount.current = answers.length;
      const data = {
        currentIndex,
        answers,
        timeLeft,
        playerName,
        playerSchool,
        questionCount: questions.length,
        selectedIndices: selectedIndicesRef.current,
        timeElapsed: Date.now() - startTime.current,
        settings,
        savedAt: Date.now(),
      }
      try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(data)) } catch {}
    }
  }, [answers, quizStarted, finished]);

  useEffect(() => {
    unmountSaved.current = false;
    return () => {
      if (!unmountSaved.current) {
        unmountSaved.current = true;
        const s = stateRef.current;
        if (!s.finished && s.answers?.length > 0) {
          const cfg = s.settings ?? {};
      const data = {
            currentIndex: s.currentIndex ?? 0,
            answers: s.answers ?? [],
            timeLeft: s.timeLeft ?? (cfg.timePerQuestion || 30),
            playerName: s.playerName ?? '',
            playerSchool: s.playerSchool ?? '',
            questionCount: s.questionCount ?? 0,
            selectedIndices: selectedIndicesRef.current,
            timeElapsed: Date.now() - startTime.current,
            settings: cfg,
            savedAt: Date.now(),
          }
          try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(data)) } catch {}
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!quizStarted || finished) return
    const block = (e) => { e.preventDefault(); return false }
    document.addEventListener('contextmenu', block)
    return () => {
      document.removeEventListener('contextmenu', block)
    }
  }, [quizStarted, finished])

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-5 pb-24">
        <Card className="w-full max-w-lg flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">Loading questions...</p>
        </Card>
      </div>
    );
  }

  if (allQuestions.length === 0) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-5 pb-24">
        <Card className="w-full max-w-lg flex items-center justify-center py-20 text-center">
          <div>
            <div className="mb-4 text-5xl">📚</div>
            <p className="text-muted-foreground">No questions for {code}</p>
            <Link href="/courses" className="mt-5 inline-block">
              <Button className="mt-5 px-6">Back to Courses</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // ─────────── RESUME PROMPT ───────────
  if (showResumePrompt && restoredProgress) {
    const answered = restoredProgress.answers.length;
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-5 pb-24">
        <Card className="w-full max-w-lg flex items-center justify-center py-16 px-8 text-center">
          <div className="space-y-4">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
              <span className="text-3xl">▶️</span>
            </div>
            <h2 className="text-xl font-bold">Resume Quiz?</h2>
            <p className="text-sm text-muted-foreground">
              You've answered {answered} question{answered !== 1 ? 's' : ''} so far.
            </p>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => handleResume(restoredProgress)} className="flex-1 py-5 text-base font-semibold">
                Resume
              </Button>
              <Button variant="outline" onClick={handleStartFresh} className="flex-1 py-5 text-base font-semibold">
                Start Fresh
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ─────────── SETTINGS SCREEN ───────────
  if (!quizStarted) {
    const limitOptions = [5, 10, 15, 20, 25, 30, 50, allQuestions.length];
    const timeOptions = [5, 10, 15, 20, 30, 45, 60, 90, 120];
    return (
      <div className="flex min-h-dvh flex-col bg-background px-5 pb-24 pt-6">
        <div className="mx-auto w-full max-w-lg">
          {/* Top bar */}
          <div className="mb-8 flex items-center justify-between">
            <Link href={`/courses/${code.toLowerCase()}`} className="flex size-10 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80">
              <ChevronLeft className="size-4" />
            </Link>
            <h1 className="text-lg font-bold">Quiz Settings</h1>
            <div className="size-10" />
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold">Number of Questions</label>
              <div className="flex flex-wrap gap-2">
                {limitOptions.map((n) => (
                  <Button
                    key={n}
                    variant={settings.questionLimit === n ? 'default' : 'outline'}
                    className="min-w-[60px] flex-1 text-sm"
                    onClick={() => setSettings(s => ({ ...s, questionLimit: n }))}
                  >
                    {n === allQuestions.length ? 'All' : n}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold">Time per Question</label>
              <div className="flex flex-wrap gap-2">
                {timeOptions.map((t) => (
                  <Button
                    key={t}
                    variant={settings.timePerQuestion === t ? 'default' : 'outline'}
                    className="min-w-[60px] flex-1 text-sm"
                    onClick={() => setSettings(s => ({ ...s, timePerQuestion: t }))}
                  >
                    {t}s
                  </Button>
                ))}
              </div>
            </div>

            {allQuestions.length > 0 && (
              <p className="text-center text-xs text-muted-foreground">
                {(() => {
                  const unseenCount = allQuestions.length - getSeenIds(code).length
                  return (
                    <>
                      {settings.questionLimit >= allQuestions.length
                        ? `All ${allQuestions.length} questions`
                        : `${settings.questionLimit} of ${allQuestions.length} questions (randomly selected)`}
                      {unseenCount > 0 && unseenCount < allQuestions.length && (
                        <span> · {unseenCount} new</span>
                      )}
                      {unseenCount === 0 && <span> · 🔄 all seen, repeating</span>}
                      <br />
                      {settings.timePerQuestion}s per question
                      {' · '}~{Math.round(settings.questionLimit * settings.timePerQuestion / 60)} min total
                    </>
                  )
                })()}
              </p>
            )}

            <div className="flex items-center justify-between rounded-xl border p-4">
              <div>
                <div className="text-sm font-semibold">Offline Mode</div>
                <div className="text-xs text-muted-foreground">Use cached questions (no internet)</div>
              </div>
              <button
                onClick={() => setSettings(s => ({ ...s, offline: !s.offline }))}
                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
                style={{ backgroundColor: settings.offline ? 'var(--color-primary)' : '#ccc' }}
              >
                <span
                  className="pointer-events-none inline-block size-5 rounded-full bg-white shadow-lg transition-transform"
                  style={{ transform: settings.offline ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </div>

            <Button onClick={handleStartQuiz} className="w-full py-6 text-base font-bold tracking-wide">
              START QUIZ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const total = questions.length;
  const question = questions[currentIndex];
  const optionKeys = Object.keys(question?.options || {});
  const correctKey = question?.correct_answer;
  const totalAnswered = answers.length;
  const correctCount = answers.reduce((count, a) => {
    const q = questions[a.questionIndex];
    return count + (a.selected != null && String(a.selected).toLowerCase() === String(q?.correct_answer).toLowerCase() ? 1 : 0);
  }, 0);
  const elapsedSeconds = Math.floor((Date.now() - startTime.current) / 1000);
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  function handleSelect(key) {
    if (revealAnswer) return;
    playClick();
    setSelected(key === selected ? null : key);
    if (key !== selected) trackQuizEvent('quiz_answer', { course: code, question: currentIndex, selected: key });
  }

  function handleShowAnswer() {
    clearInterval(timerRef.current);
    setRevealAnswer(true);
    if (question?.explanation) {
      trackExplanationViewed({ question_id: question._id || question.id || `${question.question?.slice(0, 30)}`, duration_ms: 0 });
    }
  }

  function handleNextAfterReveal() {
    setRevealAnswer(false);
    const newAnswers = [...answers, { selected: question?.correct_answer, questionIndex: currentIndex, question: question.question, options: question.options }];
    setAnswers(newAnswers);
    const finalCorrectCount = newAnswers.reduce((count, a) => {
      const q = questions[a.questionIndex];
      return count + (a.selected != null && String(a.selected).toLowerCase() === String(q?.correct_answer).toLowerCase() ? 1 : 0);
    }, 0);

    if (currentIndex + 1 < total) {
      setCurrentIndex(currentIndex + 1);
      setSelected(null);
      setTimeLeft(settings.timePerQuestion);
    } else {
      setFinished(true);
      clearInterval(timerRef.current);
      clearProgress();
      markSeenIds(code, selectedIndicesRef.current);
      trackQuizEvent('quiz_completed', { course: code, score: finalCorrectCount, total, timeSpent: Math.floor((Date.now() - startTime.current) / 1000), revealed: true });
      trackSessionTerminated({ quiz_id: code, last_completed_step: total, total_steps: total });
      const user = getUser();
      if (user) {
        setTimeout(() => handleAutoSave(finalCorrectCount, total), 100);
      } else {
        setShowSaveModal(true);
      }
    }
  }

  function handleNext(timedOut = false) {
    if (selected === null && !timedOut) return;
    clearInterval(timerRef.current);
    playClick();

    const answered = selected ?? null;
    const newAnswers = [...answers, { selected: answered, questionIndex: currentIndex, question: question.question, options: question.options }];
    setAnswers(newAnswers);

    // Telemetry per answer
    if (answered != null && question) {
      const correctAns = String(question.correct_answer).toLowerCase();
      const selectedOpt = String(answered).toLowerCase();
      const correctIndex = question.options ? Object.keys(question.options).findIndex(k => String(k).toLowerCase() === correctAns) : -1;
      const selectedIndex = question.options ? Object.keys(question.options).findIndex(k => k === answered) : -1;
      const timeSpent = settings.timePerQuestion - timeLeft;
      trackAnswerSubmitted({
        question_id: question._id || question.id || `${question.question?.slice(0, 30)}`,
        is_correct: selectedOpt === correctAns,
        time_spent_sec: Math.max(1, timeSpent),
        selected_option_index: selectedIndex,
        correct_option_index: correctIndex,
        course_code: code,
      });
    }

    const finalCorrectCount = newAnswers.reduce((count, a) => {
      const q = questions[a.questionIndex];
      return count + (a.selected != null && String(a.selected).toLowerCase() === String(q?.correct_answer).toLowerCase() ? 1 : 0);
    }, 0);

    if (currentIndex + 1 < total) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setSelected(null);
      setTimeLeft(settings.timePerQuestion);
    } else {
      setFinished(true);
      clearInterval(timerRef.current);
      clearProgress();
      markSeenIds(code, selectedIndicesRef.current);
      trackQuizEvent('quiz_completed', { course: code, score: finalCorrectCount, total, timeSpent: Math.floor((Date.now() - startTime.current) / 1000) });
      trackSessionTerminated({ quiz_id: code, last_completed_step: total, total_steps: total });
      const user = getUser();
      if (user) {
        setTimeout(() => handleAutoSave(finalCorrectCount, total), 100);
      } else {
        setShowSaveModal(true);
      }
    }
  }

  async function handleAutoSave(scoreOverride, totalOverride) {
    const elapsedSecs = Math.floor((Date.now() - startTime.current) / 1000);
    const user = getUser();
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          email: user.email,
          name: user.name,
          course: code,
          score: scoreOverride ?? correctCount,
          total: totalOverride ?? total,
          timeSpent: elapsedSecs,
          questionLimit: settings.questionLimit,
          timePerQuestion: settings.timePerQuestion,
        }),
      });
      if (!res.ok) {
        const data = await res.json()
        console.warn('Score save failed:', data)
        return;
      }
      clearProgress();
      setSaved(true);
    } catch { setSaved(true) }
  }

  function handleDownload() {
    if (!shareCardUrl) return
    const a = document.createElement('a')
    a.href = shareCardUrl
    a.download = 'apex-score.png'
    a.click()
    trackEvent('download_click', { filename: 'apex-score.png', source: 'quiz' })
  }

  async function handleShare() {
    const comment = shareCommentRef.current || `I scored ${correctCount}/${total} on ${code}!`
    const text = `${comment}\n\nDownload Apex 👉 https://quiz.apex.app`

    try {
      if (!shareCardUrl) throw new Error('no card')
      const blob = await (await fetch(shareCardUrl)).blob()
      const file = new File([blob], 'apex-score.png', { type: 'image/png' })

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My Apex Score', text })
        return
      }
    } catch {}

    const wa = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
    window.open(wa, '_blank')
  }

  function handleRestart() {
    playClick();
    clearProgress();
    setQuizStarted(false);
    setCurrentIndex(0);
    setSelected(null);
    setAnswers([]);
    setFinished(false);
    setRevealAnswer(false);
    setSaved(false);
    setPlayerName('');
    setPlayerSchool('');
    startTime.current = Date.now();
  }

  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  }

  // ─────────── RESULT / STATS SCREEN ───────────
  if (finished) {
    const emoji = pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪';
    const msg = pct >= 80 ? 'Excellent!' : pct >= 50 ? 'Good effort!' : 'Keep studying!';

    return (
      <div className="flex min-h-dvh flex-col bg-background px-5 pb-24 pt-6">
        <div className="mx-auto w-full max-w-lg space-y-6">
          {cheatWarning && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-yellow-100 p-3 text-sm text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
              <AlertTriangle className="size-4 shrink-0" />
              {cheatWarning}
            </div>
          )}

          <Card className="py-10 text-center">
            <div className="space-y-4">
              <div className="text-7xl">{emoji}</div>
              <p className="text-sm text-muted-foreground">Your Score</p>
              <p className="text-6xl font-bold tracking-tight">
                {correctCount}<span className="text-2xl font-medium text-muted-foreground">/{total}</span>
              </p>
              <p className="text-lg font-semibold">{msg}</p>
            </div>
          </Card>

          <Card className="divide-y p-0">
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-muted-foreground">Time Spent</span>
              <span className="text-sm font-bold text-orange-500">{formatTime(elapsedSeconds)}</span>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-muted-foreground">Questions Answered</span>
              <span className="text-sm font-bold">{totalAnswered}/{total}</span>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-muted-foreground">Correct Answers</span>
              <span className="text-sm font-bold text-green-500">{correctCount}</span>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-muted-foreground">Wrong Answers</span>
              <span className="text-sm font-bold text-red-500">{totalAnswered - correctCount}</span>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-muted-foreground">Percentage</span>
              <span className={`text-sm font-bold ${pct >= 80 ? 'text-green-500' : pct >= 50 ? 'text-orange-500' : 'text-red-500'}`}>{pct}%</span>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-muted-foreground">Course</span>
              <span className="text-sm font-medium">{code}</span>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-muted-foreground">Time/Question</span>
              <span className="text-sm font-bold">{settings.timePerQuestion}s</span>
            </div>
          </Card>

          <Button
            className="w-full py-6 text-base font-bold"
            onClick={() => {
              const reviewAnswers = answers.map((a) => {
                const q = questions[a.questionIndex];
                const isCorrect = a.selected != null && String(a.selected).toLowerCase() === String(q?.correct_answer).toLowerCase();
                return { ...a, correctKey: q?.correct_answer, isCorrect };
              });
              sessionStorage.setItem('apex_review', JSON.stringify({ answers: reviewAnswers, questions, code }))
              router.push(`/courses/${code.toLowerCase()}/quiz/review`)
            }}
          >
            REVIEW ANSWERS
          </Button>

          {!saved && showSaveModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm">
              <Card className="w-full max-w-sm space-y-4 py-8 text-center">
                <div className="text-5xl">🏆</div>
                <h3 className="text-xl font-bold">Save Your Score</h3>
                <p className="px-4 text-sm text-muted-foreground">
                  Sign in to save your result to the leaderboard.
                </p>
                <div className="space-y-2 px-6 pt-2">
                  <Link href="/auth" className="block">
                    <Button className="w-full py-5 text-sm font-semibold">Sign In</Button>
                  </Link>
                  <Button variant="ghost" className="w-full" onClick={() => setShowSaveModal(false)}>
                    Skip
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {saved && (
            <p className="text-center text-sm font-semibold text-green-500">
              ✓ Saved! Check the leaderboard.
            </p>
          )}

          {shareCardUrl && (
            <div className="text-center">
              <img src={shareCardUrl} alt="Score card" className="mx-auto max-w-full rounded-2xl shadow-lg" />
            </div>
          )}

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Button
                variant="outline"
                className="w-full py-5 text-sm font-semibold"
                onClick={() => setShowShareOptions(!showShareOptions)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                Share
              </Button>

              {showShareOptions && (
                <div className="absolute bottom-full left-1/2 z-10 mb-2 flex w-48 -translate-x-1/2 flex-col gap-0.5 rounded-2xl border bg-card p-1.5 shadow-lg animate-in fade-in slide-in-from-bottom-2">
                  <button
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
                    onClick={() => { handleDownload(); setShowShareOptions(false) }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download Image
                  </button>
                  <button
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
                    onClick={() => { handleShare(); setShowShareOptions(false) }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                    Share
                  </button>
                </div>
              )}
            </div>
            <Button variant="outline" className="flex-1 py-5 text-sm font-semibold" onClick={handleRestart}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────── QUIZ SCREEN ───────────
  return (
    <div className="flex min-h-dvh flex-col bg-background px-5 pb-24 pt-6">
      <div className="mx-auto w-full max-w-lg">
        {cheatWarning && (
          <div className="mb-3 flex items-center justify-center gap-2 rounded-xl bg-yellow-100 p-2 text-xs text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
            <AlertTriangle className="size-3.5 shrink-0" />
            {cheatWarning}
          </div>
        )}

        {/* Top bar */}
        <div className="mb-5 flex items-center justify-between">
          <Link href={`/courses/${code.toLowerCase()}`} className="flex size-10 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80">
            <ChevronLeft className="size-4" />
          </Link>
          <h1 className="text-lg font-bold">{code}</h1>
          <div className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 font-semibold text-red-500">
            <Clock className="size-4" />
            <span>{timeLeft}s</span>
          </div>
        </div>

        {/* Progress */}
        <p className="mb-2 text-sm text-muted-foreground">Question {currentIndex + 1}/{total}</p>
        <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-400 ease-out"
            style={{
              width: `${(currentIndex / total) * 100}%`,
              background: 'linear-gradient(90deg, #ff9f43, #ff4757)',
            }}
          />
        </div>

        {/* Question */}
        <Card className="mb-6 flex min-h-[120px] items-center justify-center px-7 py-9 text-center">
          <p className="text-base font-medium leading-relaxed">{question.question}</p>
        </Card>

        {/* Code block */}
        {question.code && (
          <CodeBlock code={question.code} />
        )}

        {/* Options */}
        <div className="mb-6 space-y-3">
          {optionKeys.map((key, idx) => {
            const isCorrect = key === correctKey;
            const isRevealedCorrect = revealAnswer && isCorrect;
            const isSelected = selected === key;

            let styles = 'border bg-muted/50 hover:bg-muted';
            if (isSelected) styles = 'border-2 border-primary bg-primary text-primary-foreground';
            if (isRevealedCorrect) styles = 'border-2 border-green-500 bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-300';

            return (
              <button
                key={key}
                onClick={() => handleSelect(key)}
                className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${styles}`}
              >
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                  isSelected ? 'bg-white/20 text-white' : isRevealedCorrect ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {OPTION_LABELS[idx] || key.toUpperCase()}
                </span>
                <span className="flex-1 text-sm">{question.options[key]}</span>
                {isRevealedCorrect && (
                  <Check className="size-5 shrink-0 text-green-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {revealAnswer && question.explanation && (
          <div className="mb-6 rounded-2xl border-l-4 border-primary bg-muted/50 p-4">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">Explanation</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{question.explanation}</p>
          </div>
        )}

        {/* Action */}
        {revealAnswer ? (
          <Button className="w-full py-6 text-base font-bold" onClick={handleNextAfterReveal}>
            {currentIndex + 1 < total ? 'NEXT' : 'FINISH'}
          </Button>
        ) : (
          <div className="space-y-3">
            <Button
              className="w-full py-6 text-base font-bold"
              disabled={selected === null}
              onClick={handleNext}
            >
              {currentIndex + 1 < total ? 'NEXT' : 'FINISH'}
            </Button>
            {!selected && !revealAnswer && (
              <button
                onClick={handleShowAnswer}
                className="block w-full text-center text-sm font-semibold text-orange-500 underline underline-offset-3 opacity-80 transition-opacity hover:opacity-100"
              >
                Show Answer
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
