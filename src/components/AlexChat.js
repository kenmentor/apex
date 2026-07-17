'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Sparkles, ArrowLeft } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser, getToken } from '@/lib/auth';
import QuizModal from '@/components/QuizModal';

const WELCOME = `Hey there! 👋 I'm **Alex**, your study tutor. I can help you practice with past questions, explain concepts, and quiz you on any course.

Try saying:
• *"Give me a PHY 102 question"*
• *"Quiz me on citizenship"*
• *"What courses are available?"*
• *"Explain electrostatics"*`;

function ChatPanel({ messages, loading, input, setInput, send, listRef, inputRef }) {
  return (
    <>
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted/70 text-foreground'
            }`}>
              <div className="prose prose-sm dark:prose-invert max-w-none [&_strong]:font-semibold">
                {m.text.split('\n').map((line, j) => (
                  <p key={j} className={j < m.text.split('\n').length - 1 ? 'mb-1.5' : ''}>
                    {line.startsWith('•') ? line : (line.match(/^\*\*(.*?)\*\*/) ? line : line)}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl bg-muted/70 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="size-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '0ms' }} />
                <div className="size-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '150ms' }} />
                <div className="size-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t p-3">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Ask Alex anything..."
          className="flex-1 rounded-xl border bg-muted/50 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          disabled={loading}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </div>
    </>
  );
}

export default function AlexChat({ fullPage }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();

  const isAlexPage = pathname === '/alex';

  useEffect(() => {
    setUser(getUser());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (fullPage && messages.length === 0) {
      setMessages([{ role: 'assistant', text: WELCOME }]);
    }
  }, [fullPage]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (fullPage) inputRef.current?.focus();
  }, [fullPage]);

  const send = async (text) => {
    const msg = text || input;
    if (!msg.trim() || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(user?.email ? { Authorization: `Bearer ${getToken()}` } : {}) },
        body: JSON.stringify({ message: msg, userName: user?.name?.split(' ')[0] || '', sessionEmail: user?.email || '' }),
      });
      const data = await res.json();

      if (data.messages) {
        setMessages(prev => [...prev, ...data.messages]);
      } else if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', text: `Sorry, something went wrong: ${data.error}` }]);
      }

      if (data.quiz) {
        setQuiz(data.quiz);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I couldn't reach the server. Try again!" }]);
    }

    setLoading(false);
  };

  if (!mounted) return null;

  // Full page mode (used on /alex)
  if (fullPage) {
    return (
      <>
        <QuizModal quiz={quiz} onClose={() => setQuiz(null)} />
        <div className="mx-auto flex min-h-dvh max-w-3xl flex-col pb-24">
          <div className="flex shrink-0 items-center gap-3 border-b bg-gradient-to-r from-primary/10 to-primary/5 px-5 py-4">
            <Link href="/" className="flex size-9 items-center justify-center rounded-xl hover:bg-muted transition-colors">
              <ArrowLeft className="size-5 text-muted-foreground" />
            </Link>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">A</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold">Alex</span>
                <span className="flex size-2 rounded-full bg-green-500" />
                <span className="text-xs text-muted-foreground">Online</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="size-3" />
                <span>Your study tutor — ask me anything about your courses</span>
              </div>
            </div>
          </div>
          <ChatPanel messages={messages} loading={loading} input={input} setInput={setInput} send={send} listRef={listRef} inputRef={inputRef} />
        </div>
      </>
    );
  }

  // Floating bubble: just a nav button to /alex
  if (isAlexPage) return null;

  return (
    <>
      <QuizModal quiz={quiz} onClose={() => setQuiz(null)} />
      <button
        onClick={() => router.push('/alex')}
        className="fixed bottom-22 right-4 z-50 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 active:scale-95 sm:bottom-6"
        aria-label="Open Alex"
      >
        <MessageCircle className="size-5" />
      </button>
    </>
  );
}
