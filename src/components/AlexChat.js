'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Sparkles, ArrowLeft, Check, Plus, Trash2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser, getToken } from '@/lib/auth';
import QuizModal from '@/components/QuizModal';

function TodoItem({ todo, onToggle, onDelete }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
      <button
        onClick={() => onToggle(todo._id)}
        className={`flex size-5 shrink-0 items-center justify-center rounded border transition-colors ${
          todo.done ? 'bg-green-500 border-green-500 text-white' : 'hover:bg-accent'
        }`}
      >
        {todo.done && <Check className="size-3" />}
      </button>
      <span className={`flex-1 min-w-0 truncate ${todo.done ? 'line-through text-muted-foreground' : ''}`}>
        {todo.text}
      </span>
      <button onClick={() => onDelete(todo._id)} className="text-muted-foreground hover:text-red-500 transition-colors shrink-0">
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

function TodoPanel({ todos, setTodos, onClose }) {
  const [newText, setNewText] = useState('');

  const addTodo = async () => {
    if (!newText.trim()) return;
    const token = getToken();
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'add', text: newText.trim() }),
    });
    const data = await res.json();
    if (data.todo) setTodos(prev => [data.todo, ...prev]);
    setNewText('');
  };

  const toggleTodo = async (id) => {
    const token = getToken();
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'toggle', id }),
    });
    const data = await res.json();
    if (data.success) setTodos(prev => prev.map(t => t._id === id ? { ...t, done: data.done } : t));
  };

  const deleteTodo = async (id) => {
    const token = getToken();
    await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'delete', id }),
    });
    setTodos(prev => prev.filter(t => t._id !== id));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="relative w-full max-w-md rounded-2xl border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <span className="text-sm font-bold">📋 My Todos</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" />
          </button>
        </div>
        <div className="space-y-2 px-5 py-4 max-h-80 overflow-y-auto">
          {todos.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No todos yet. Ask Alex to add some!</p>}
          {todos.map(t => <TodoItem key={t._id} todo={t} onToggle={toggleTodo} onDelete={deleteTodo} />)}
        </div>
        <div className="border-t px-5 py-3">
          <div className="flex gap-2">
            <input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addTodo() }}
              placeholder="Add a todo..."
              className="flex-1 rounded-xl border bg-muted/50 px-3.5 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/50"
            />
            <button onClick={addTodo} disabled={!newText.trim()} className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40">
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatPanel({ messages, loading, input, setInput, send, listRef, inputRef }) {
  return (
    <>
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted/70 text-foreground'
            }`}>
              <div className="[&_strong]:font-semibold whitespace-pre-wrap">
                {m.text}
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
  const [todos, setTodos] = useState([]);
  const [showTodos, setShowTodos] = useState(false);
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();

  const isAlexPage = pathname === '/alex';

  useEffect(() => {
    const u = getUser();
    setUser(u);
    setMounted(true);

    // Load chat history
    if (u?.email) {
      fetch('/api/chat', {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
        .then(r => r.json())
        .then(data => {
          if (data.messages?.length > 0) {
            setMessages(data.messages);
          } else if (fullPage) {
            setMessages([{ role: 'assistant', text: `Hey there! 👋 I'm **Alex**, your study tutor. I can help you practice with past questions, explain concepts, quiz you with a timer, and manage your todo list.\n\nTry:\n• *"Quiz me on PHY 102"*\n• *"Explain citizenship"*\n• *"Add review notes to my todo"*` }]);
          }
          setHistoryLoaded(true);
        })
        .catch(() => {
          if (fullPage) {
            setMessages([{ role: 'assistant', text: `Hey there! 👋 I'm **Alex**...` }]);
          }
          setHistoryLoaded(true);
        });
    } else {
      if (fullPage) {
        setMessages([{ role: 'assistant', text: `Hey there! 👋 I'm **Alex**, your study tutor...` }]);
      }
      setHistoryLoaded(true);
    }
  }, [fullPage]);

  // Load todos on mount
  useEffect(() => {
    if (!user?.email) return;
    fetch('/api/todos', {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.docs) setTodos(data.docs);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (fullPage && historyLoaded) inputRef.current?.focus();
  }, [fullPage, historyLoaded]);

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

      // Refresh todos (AI may have modified them)
      if (user?.email) {
        fetch('/api/todos', {
          headers: { Authorization: `Bearer ${getToken()}` },
        })
          .then(r => r.json())
          .then(data => { if (data.docs) setTodos(data.docs); })
          .catch(() => {});
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I couldn't reach the server. Try again!" }]);
    }

    setLoading(false);
  };

  if (!mounted) return null;

  if (fullPage) {
    return (
      <>
        <QuizModal quiz={quiz} onClose={(result) => { setQuiz(null); if (result) send(`/answered ${result.selected} on ${result.courseCode} (${result.correct ? 'correct' : 'wrong'}, correct was ${result.correctAnswer})`); }} />
        {showTodos && <TodoPanel todos={todos} setTodos={setTodos} onClose={() => setShowTodos(false)} />}
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
                <span>AI tutor · timer quizzes · todo lists</span>
              </div>
            </div>
            <button
              onClick={() => setShowTodos(true)}
              className="relative flex size-9 items-center justify-center rounded-xl hover:bg-muted transition-colors"
              title="Todos"
            >
              <Plus className="size-4 text-muted-foreground" />
              {todos.filter(t => !t.done).length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
                  {todos.filter(t => !t.done).length}
                </span>
              )}
            </button>
          </div>
          <ChatPanel messages={messages} loading={loading} input={input} setInput={setInput} send={send} listRef={listRef} inputRef={inputRef} />
        </div>
      </>
    );
  }

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
