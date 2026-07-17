'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Sparkles, ChevronDown } from 'lucide-react';
import { getUser, getToken } from '@/lib/auth';
import QuizModal from '@/components/QuizModal';

const WELCOME = `Hey there! 👋 I'm **Alex**, your study tutor. I can help you practice with past questions, explain concepts, and quiz you on any course.

Try saying:
• *"Give me a PHY 102 question"*
• *"Quiz me on citizenship"*
• *"What courses are available?"*
• *"Explain electrostatics"*`;

export default function AlexChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setUser(getUser());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'assistant', text: WELCOME }]);
    }
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

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
        body: JSON.stringify({ message: msg, userName: user?.name?.split(' ')[0] || '' }),
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
      setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, I couldn\'t reach the server. Try again!' }]);
    }

    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!mounted) return null;

  return (
    <>
      <QuizModal quiz={quiz} onClose={() => setQuiz(null)} />

      {/* Chat bubble button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-22 right-4 z-50 flex size-13 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 active:scale-95 sm:bottom-6"
        aria-label="Open Alex chat"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-38 right-4 z-50 flex w-[360px] max-w-[calc(100vw-32px)] flex-col rounded-2xl border bg-card shadow-2xl sm:bottom-20 sm:right-6 sm:h-[520px]">
          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 rounded-t-2xl border-b bg-gradient-to-r from-primary/10 to-primary/5 px-5 py-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              A
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">Alex</span>
                <span className="flex size-2 rounded-full bg-green-500" />
                <span className="text-[10px] text-muted-foreground">Online</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Sparkles className="size-3" />
                <span>Your study tutor</span>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown className="size-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/70 text-foreground'
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

          {/* Input */}
          <div className="flex shrink-0 items-center gap-2 border-t p-3">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Alex anything..."
              className="flex-1 rounded-xl border bg-muted/50 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              disabled={loading}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40"
            >
              <Send className="size-4.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
