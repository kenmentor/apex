'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { playClick, playCorrect, playWrong } from '@/lib/sound';
import { getUser, getToken } from '@/lib/auth';
import { getCachedQuestions, cacheQuestions } from '@/lib/questionCache';

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
      // Skip API fetch if offline mode is on and we have cached data
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
  }

  function handleStartQuiz() {
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
    if (timeLeft === 0 && !finished && quizStarted) {
      handleNext();
    }
  }, [timeLeft]);

  useEffect(() => {
    stateRef.current = { currentIndex, answers, timeLeft, playerName, playerSchool, finished, questionCount: questions.length, settings };
  });

  // ─── Generate share card when finished ───
  useEffect(() => {
    if (!finished) return
    const generateCard = async () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 600
        canvas.height = 500
        const ctx = canvas.getContext('2d')

        // Background
        const grad = ctx.createLinearGradient(0, 0, 0, 500)
        grad.addColorStop(0, '#130f40')
        grad.addColorStop(1, '#2c2c54')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, 600, 500)

        // Orange top accent
        ctx.fillStyle = '#ff9f43'
        ctx.fillRect(0, 0, 600, 8)

        // Meme emoji
        const memes = pct >= 90 ? ['🏆', '🧠', '🔥'] : pct >= 70 ? ['💪', '🎯', '⚡'] : pct >= 50 ? ['👍', '😅', '📚'] : ['💀', '😭', '🫠']
        const meme = memes[Math.floor(Math.random() * memes.length)]
        ctx.font = '80px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(meme, 300, 110)

        // Funny comment
        const comment = getFunnyComment(pct)
        shareCommentRef.current = comment
        ctx.font = 'bold 20px sans-serif'
        ctx.fillStyle = '#ff9f43'
        ctx.fillText(comment, 300, 155)

        // Brand
        ctx.font = 'bold 28px sans-serif'
        ctx.fillStyle = '#ffffff'
        ctx.fillText('APEX', 300, 200)
        ctx.font = '13px sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.fillText('quiz.apex.app', 300, 218)

        // Score card
        const cardY = 255, cardH = 170
        ctx.beginPath()
        // manual rounded rect for compatibility
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

        // Score big
        ctx.textAlign = 'center'
        ctx.font = 'bold 64px sans-serif'
        ctx.fillStyle = '#ff9f43'
        ctx.fillText(`${correctCount}/${total}`, 300, cardY + 90)

        // Percentage + time + course
        ctx.font = '18px sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.fillText(`${pct}% · ${formatTime(elapsedSeconds)} · ${code}`, 300, cardY + 135)

        // Bottom link
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

  // ─── Anti-cheat: tab visibility → auto-submit ───
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

  // ─── Anti-cheat: tab visibility → auto-submit ───
  const handleVisibility = useCallback(() => {
    if (document.hidden && quizStarted && !finished) {
      setCheatWarning('Tab switch detected! Quiz will be submitted.')
      setTimeout(() => {
        if (!finished && quizStarted) {
          setFinished(true)
          clearProgress()
        }
      }, 500)
    }
  }, [quizStarted, finished])

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [handleVisibility])

  // ─── Anti-cheat: disable right-click, copy, paste ───
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
      <div className="app-wrapper">
        <div className="quiz-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 16 }}>Loading questions...</div>
        </div>
      </div>
    );
  }

  if (allQuestions.length === 0) {
    return (
      <div className="app-wrapper">
        <div className="quiz-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 16 }}>No questions for {code}</div>
            <Link href="/courses" className="btn-restart" style={{ marginTop: 20, padding: '12px 32px', fontSize: 14, textDecoration: 'none' }}>
              Back to Courses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─────────── RESUME PROMPT ───────────
  if (showResumePrompt && restoredProgress) {
    const answered = restoredProgress.answers.length;
    return (
      <div className="app-wrapper">
        <div className="quiz-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ textAlign: 'center', padding: '0 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>▶️</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Resume Quiz?</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              You've answered {answered} question{answered !== 1 ? 's' : ''} so far.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn-next" onClick={() => handleResume(restoredProgress)}>Resume</button>
              <button className="btn-restart" onClick={handleStartFresh}>Start Fresh</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────── SETTINGS SCREEN ───────────
  if (!quizStarted) {
    const limitOptions = [5, 10, 20, 30, allQuestions.length];
    const timeOptions = [10, 15, 30, 45, 60];
    return (
      <div className="app-wrapper">
        <div className="quiz-container" style={{ justifyContent: 'center' }}>
          <div className="top-bar">
            <Link href={`/courses/${code.toLowerCase()}`} className="back-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Link>
            <div className="screen-title-center">Quiz Settings</div>
            <div className="back-btn" style={{ background: 'none' }}></div>
          </div>

          <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <label style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-dark)' }}>Number of Questions</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {limitOptions.map((n) => (
                  <button
                    key={n}
                    onClick={() => setSettings(s => ({ ...s, questionLimit: n }))}
                    className={`option-item ${settings.questionLimit === n ? 'selected' : ''}`}
                    style={{ flex: 1, minWidth: 60, textAlign: 'center', border: '2px solid', borderColor: settings.questionLimit === n ? 'var(--primary-orange)' : '#e2e8f0', padding: '10px 8px' }}
                  >
                    {n === allQuestions.length ? 'All' : n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-dark)' }}>Time per Question (seconds)</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {timeOptions.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSettings(s => ({ ...s, timePerQuestion: t }))}
                    className={`option-item ${settings.timePerQuestion === t ? 'selected' : ''}`}
                    style={{ flex: 1, minWidth: 60, textAlign: 'center', border: '2px solid', borderColor: settings.timePerQuestion === t ? 'var(--primary-orange)' : '#e2e8f0', padding: '10px 8px' }}
                  >
                    {t}s
                  </button>
                ))}
              </div>
            </div>

            {allQuestions.length > 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
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
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8f9fa', borderRadius: 14, padding: '14px 18px' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-dark)' }}>Offline Mode</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Use cached questions (no internet)</div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 46, height: 24, cursor: 'pointer' }}>
                <input type="checkbox" checked={settings.offline} onChange={() => setSettings(s => ({ ...s, offline: !s.offline }))} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{
                  position: 'absolute', inset: 0, borderRadius: 24, transition: '0.3s',
                  background: settings.offline ? 'var(--space-purple)' : '#ccc',
                }}></span>
                <span style={{
                  position: 'absolute', top: 2, left: settings.offline ? 24 : 2,
                  width: 20, height: 20, borderRadius: '50%', background: 'white', transition: '0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}></span>
              </label>
            </div>

            <button className="btn-next" onClick={handleStartQuiz} style={{ marginTop: 8 }}>
              START QUIZ
            </button>
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
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const elapsedSeconds = Math.floor((Date.now() - startTime.current) / 1000);
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  function handleSelect(key) {
    playClick();
    setSelected(key === selected ? null : key);
  }

  function handleNext() {
    if (selected === null) return;
    clearInterval(timerRef.current);
    const isCorrect = selected === correctKey;
    if (isCorrect) playCorrect(); else playWrong();

    const newAnswers = [...answers, { selected, correctKey, isCorrect, question: question.question, options: question.options }];
    setAnswers(newAnswers);

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
      const user = getUser();
      if (user) {
        setTimeout(() => handleAutoSave(), 100);
      } else {
        setShowSaveModal(true);
      }
    }
  }

  async function handleAutoSave() {
    const elapsedSecs = Math.floor((Date.now() - startTime.current) / 1000);
    const user = getUser();
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          email: user.email,
          course: code,
          score: correctCount,
          total,
          timeSpent: elapsedSecs,
          questionLimit: settings.questionLimit,
          timePerQuestion: settings.timePerQuestion,
        }),
      });
      if (!res.ok) {
        const data = await res.json()
        console.warn('Score save failed:', data)
      }
      clearProgress();
      setSaved(true);
    } catch { setSaved(true) }
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

    // Fallback: open WhatsApp with text
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
      <div className="app-wrapper">
        <div className="quiz-container" style={{ minHeight: 'auto' }}>
          <div className="result-container">
            {cheatWarning && (
              <div style={{ background: '#fff3cd', color: '#856404', padding: '8px 16px', borderRadius: 10, fontSize: 13, marginBottom: 12, width: '100%', textAlign: 'center' }}>
                ⚠ {cheatWarning}
              </div>
            )}
            <div className="result-emoji">{emoji}</div>
            <div className="result-score-label">Your Score</div>
            <div className="result-score">
              {correctCount}<span>/{total}</span>
            </div>
            <div className="result-label">{msg}</div>

            <table className="stats-table">
              <tbody>
                <tr>
                  <td className="stats-label">Time Spent</td>
                  <td className="stats-value orange">{formatTime(elapsedSeconds)}</td>
                </tr>
                <tr>
                  <td className="stats-label">Questions Answered</td>
                  <td className="stats-value">{totalAnswered}/{total}</td>
                </tr>
                <tr>
                  <td className="stats-label">Correct Answers</td>
                  <td className="stats-value green">{correctCount}</td>
                </tr>
                <tr>
                  <td className="stats-label">Wrong Answers</td>
                  <td className="stats-value red">{totalAnswered - correctCount}</td>
                </tr>
                <tr>
                  <td className="stats-label">Percentage</td>
                  <td className="stats-value" style={{ color: pct >= 80 ? 'var(--success-green)' : pct >= 50 ? 'var(--primary-orange)' : 'var(--error-red)' }}>{pct}%</td>
                </tr>
                <tr>
                  <td className="stats-label">Course</td>
                  <td className="stats-value" style={{ fontWeight: 500 }}>{code}</td>
                </tr>
                <tr>
                  <td className="stats-label">Time/Question</td>
                  <td className="stats-value">{settings.timePerQuestion}s</td>
                </tr>
              </tbody>
            </table>

            <button className="btn-next" onClick={() => {
              sessionStorage.setItem('apex_review', JSON.stringify({ answers, questions, code }))
              router.push(`/courses/${code.toLowerCase()}/quiz/review`)
            }} style={{ marginTop: 16 }}>
              REVIEW ANSWERS
            </button>

            {!saved && showSaveModal && (
              <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
                <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
                  <h3>Save Your Score</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
                    Sign in to save your result to the leaderboard.
                  </p>
                  <Link href="/auth" className="btn-next" style={{ textDecoration: 'none', display: 'inline-block', padding: '12px 32px', marginBottom: 8 }}>
                    Sign In
                  </Link>
                  <button className="btn-skip" onClick={() => setShowSaveModal(false)} style={{ display: 'block', width: '100%', textAlign: 'center' }}>Skip</button>
                </div>
              </div>
            )}

            {saved && (
              <p style={{ color: 'var(--success-green)', fontWeight: 600, fontSize: 14, marginTop: 8 }}>
                ✓ Saved! Check the leaderboard.
              </p>
            )}

            {shareCardUrl && (
              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <img src={shareCardUrl} alt="Score card" style={{ maxWidth: '100%', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} />
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="btn-restart" onClick={handleShare} style={{ marginTop: 0, background: 'var(--primary-orange)', color: '#130f40', padding: '14px 36px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 6 }}>
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                Share
              </button>
              <button className="btn-restart" onClick={handleRestart} style={{ marginTop: 0 }}>Try Again</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────── QUIZ SCREEN ───────────
  return (
    <div className="app-wrapper">
      <div className="quiz-container">
        {cheatWarning && (
          <div style={{ background: '#fff3cd', color: '#856404', padding: '6px 14px', borderRadius: 10, fontSize: 12, marginBottom: 10, textAlign: 'center' }}>
            ⚠ {cheatWarning}
          </div>
        )}
        <div className="top-bar">
          <Link href={`/courses/${code.toLowerCase()}`} className="back-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div className="screen-title-center">{code}</div>
          <div className="timer-badge">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>{timeLeft}s</span>
          </div>
        </div>

        <div className="question-counter">Question {currentIndex + 1}/{total}</div>

        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${(currentIndex / total) * 100}%` }} />
        </div>

        <div className="question-card">{question.question}</div>

        <div className="options-list">
          {optionKeys.map((key, idx) => (
            <div
              key={key}
              className={`option-item ${selected === key ? 'selected' : ''}`}
              onClick={() => handleSelect(key)}
            >
              <span className="option-letter">{OPTION_LABELS[idx] || key.toUpperCase()}</span>
              {question.options[key]}
            </div>
          ))}
        </div>

        <button className="btn-next" onClick={handleNext} disabled={selected === null} style={{ opacity: selected === null ? 0.5 : 1 }}>
          {currentIndex + 1 < total ? 'NEXT' : 'FINISH'}
        </button>
      </div>
    </div>
  );
}
