import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'

const COURSE_ALIASES = {
  'phy 102': 'PHY 102', 'physics ii': 'PHY 102', 'gen phys ii': 'PHY 102', 'general physics ii': 'PHY 102',
  'phy 108': 'PHY 108', 'physics 108': 'PHY 108', 'physics for engineers': 'PHY 108',
  'chm 101': 'CHM 101', 'chemistry': 'CHM 101', 'general chemistry': 'CHM 101',
  'gss 101': 'GSS 101', 'use of english': 'GSS 101', 'english': 'GSS 101',
  'gss 112': 'GSS 112', 'gst 112': 'GSS 112', 'nigerian people': 'GSS 112', 'nigeria culture': 'GSS 112', 'citizenship': 'GSS 112',
  'gss 212': 'GSS 212', 'philosophy': 'GSS 212', 'logic': 'GSS 212',
  'sta 111': 'STA 111', 'statistics': 'STA 111', 'intro to stats': 'STA 111',
  'ins 202': 'INS 202', 'insurance': 'INS 202',
  'cos 202': 'COS 202', 'computer org': 'COS 202', 'computer organization': 'COS 202',
  'csc 102': 'CSC 102', 'problem solving': 'CSC 102', 'intro to problem solving': 'CSC 102',
  'csc 162': 'CSC 162', 'electronics': 'CSC 162', 'computer hardware': 'CSC 162',
  'csc 182': 'CSC 182', 'c++': 'CSC 182', 'computer lab': 'CSC 182',
  'csc 282': 'CSC 282', 'data structures': 'CSC 282',
}

function normalizeCourse(input) {
  const key = (input || '').trim().toLowerCase()
  if (COURSE_ALIASES[key]) return COURSE_ALIASES[key]
  const match = key.match(/^([a-z]+)\s*(\d+)$/)
  if (match) return match[1].toUpperCase() + ' ' + match[2]
  return null
}

async function fetchQuestion(courseCode) {
  const questionsCol = await getCollection('questions')
  const total = await questionsCol.countDocuments({ courseCode })
  if (total === 0) return null
  const skip = Math.floor(Math.random() * total)
  const docs = await questionsCol.find({ courseCode }).skip(skip).limit(1).toArray()
  return docs[0] || null
}

async function queryAI(messages) {
  const apiKey = process.env.OPENROUTER_API_KEY
  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-image'
  if (!apiKey) return null

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://apex-tau-gules.vercel.app',
      'X-Title': 'Apex Tutor',
    },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 1024 }),
  })

  if (!res.ok) return null
  const data = await res.json()
  return data.choices?.[0]?.message?.content || null
}

async function loadHistory(email) {
  const col = await getCollection('chat_messages')
  return col.find({ userEmail: email }).sort({ createdAt: -1 }).limit(30).toArray()
}

async function saveMessage(email, role, text) {
  const col = await getCollection('chat_messages')
  await col.insertOne({ userEmail: email, role, text, createdAt: new Date().toISOString() })
}

async function handleTodoAction(action, user) {
  const col = await getCollection('todos')
  if (action === 'list') {
    const todos = await col.find({ userEmail: user.email, done: false }).sort({ createdAt: -1 }).limit(10).toArray()
    if (todos.length === 0) return "You don't have any pending todos."
    return todos.map((t, i) => `${i + 1}. ${t.text}`).join('\n')
  }
  if (action.startsWith('add:')) {
    const text = action.slice(4).trim()
    if (!text) return "What should I add to your todo?"
    await col.insertOne({ userEmail: user.email, text, done: false, createdAt: new Date().toISOString() })
    return `Added "${text}" to your todo list.`
  }
  if (action.startsWith('done:')) {
    const num = parseInt(action.slice(5).trim())
    const todos = await col.find({ userEmail: user.email, done: false }).sort({ createdAt: -1 }).limit(10).toArray()
    const target = todos[num - 1]
    if (!target) return `Todo #${num} not found.`
    await col.updateOne({ _id: target._id }, { $set: { done: true } })
    return `Marked "${target.text}" as done. ✅`
  }
  if (action === 'clear') {
    await col.deleteMany({ userEmail: user.email, done: true })
    return 'Cleared all completed todos.'
  }
  return null
}

// Keep a simple in-memory session for active quiz tracking
const sessions = new Map()
function getSession(email) {
  if (!email) return null
  if (!sessions.has(email)) sessions.set(email, {})
  return sessions.get(email)
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { message, userName, sessionEmail } = body
    if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

    const user = await getUserFromToken(request)
    const email = user?.email || sessionEmail || 'anonymous'
    const name = userName || user?.name?.split(' ')[0] || ''
    const session = getSession(email)

    // --- ANSWER CHECKING ---
    const lower = message.trim().toLowerCase()
    const answerMatch = lower.match(/(?:the answer is|answer is|it is|i think|i choose|my answer|is it|answer)\s*[:.]?\s*([a-d])/i)
    if (answerMatch && session.lastQuiz) {
      const userAnswer = answerMatch[1].toLowerCase()
      const correct = session.lastQuiz.correctAnswer
      const isCorrect = userAnswer === correct
      const reply = isCorrect
        ? `✅ **Correct!** Well done!${session.lastQuiz.explanation ? `\n\n**Explanation:** ${session.lastQuiz.explanation}` : ''}`
        : `❌ **Not quite.** The correct answer is **${correct.toUpperCase()}**.${session.lastQuiz.explanation ? `\n\n**Explanation:** ${session.lastQuiz.explanation}\n\nKeep practicing!'` : ' Keep practicing!'}`
      session.lastQuiz = null
      if (email !== 'anonymous') { saveMessage(email, 'user', message.trim()); saveMessage(email, 'assistant', reply) }
      return NextResponse.json({ messages: [{ role: 'assistant', text: reply }] })
    }
    if (answerMatch) {
      const reply = "I'd love to check your answer! Ask me for a question first like *'Quiz me on PHY 102'*";
      if (email !== 'anonymous') { saveMessage(email, 'user', message.trim()); saveMessage(email, 'assistant', reply) }
      return NextResponse.json({ messages: [{ role: 'assistant', text: reply }] })
    }

    // --- DIRECT QUESTION FETCH (keyword shortcut) ---
    const courseCode = normalizeCourse(message)
    if (courseCode && (lower.includes('question') || lower.includes('quiz') || lower.includes('give') || lower.includes('random') || lower.includes('practice') || lower.includes('test') || lower.includes('ask'))) {
      const q = await fetchQuestion(courseCode)
      if (!q) {
        const coursesCol = await getCollection('courses')
        const all = await coursesCol.find({}).sort({ code: 1 }).toArray()
        const list = all.map(c => `${c.code} — ${c.title || ''}`).join('\n')
        const reply = `I couldn't find questions for **${courseCode}**. Available courses:\n\n${list}`
        if (email !== 'anonymous') { saveMessage(email, 'user', message.trim()); saveMessage(email, 'assistant', reply) }
        return NextResponse.json({ messages: [{ role: 'assistant', text: reply }] })
      }
      const optionsList = Object.entries(q.options || {}).map(([k, v]) => `**${k.toUpperCase()}.** ${v}`).join('\n')
      session.lastQuiz = { correctAnswer: q.correctAnswer, explanation: q.explanation, courseCode: q.courseCode }
      const reply = `Here's a question from **${q.courseCode}** (*${q.section || ''}*):\n\n**${q.question}**\n\n${optionsList}\n\nWhat do you think? Tell me *"The answer is B"*`
      if (email !== 'anonymous') { saveMessage(email, 'user', message.trim()); saveMessage(email, 'assistant', reply) }
      return NextResponse.json({
        messages: [{ role: 'assistant', text: reply }],
        quiz: { id: q.id, question: q.question, options: q.options, correctAnswer: q.correctAnswer, explanation: q.explanation, courseCode: q.courseCode },
      })
    }

    if ((lower.includes('quiz') || lower.includes('test me') || lower.includes('practice') || lower.includes('ask me') || lower.includes('question')) && !courseCode) {
      const coursesCol = await getCollection('courses')
      const all = await coursesCol.find({}).toArray()
      const codes = all.map(c => c.code)
      const q = await fetchQuestion(codes[Math.floor(Math.random() * codes.length)])
      if (q) {
        const optionsList = Object.entries(q.options || {}).map(([k, v]) => `**${k.toUpperCase()}.** ${v}`).join('\n')
        session.lastQuiz = { correctAnswer: q.correctAnswer, explanation: q.explanation, courseCode: q.courseCode }
        const reply = `Sure! Here's a random question:\n\n**${q.question}**\n\n${optionsList}\n\nWhat's your answer?`
        if (email !== 'anonymous') { saveMessage(email, 'user', message.trim()); saveMessage(email, 'assistant', reply) }
        return NextResponse.json({
          messages: [{ role: 'assistant', text: reply }],
          quiz: { id: q.id, question: q.question, options: q.options, correctAnswer: q.correctAnswer, explanation: q.explanation, courseCode: q.courseCode },
        })
      }
    }

    // --- AI-POWERED RESPONSE ---
    const coursesCol = await getCollection('courses')
    const allCourses = await coursesCol.find({}).sort({ code: 1 }).toArray()
    const courseList = allCourses.map(c => `${c.code} — ${c.title || ''}`).join('\n')

    // Load chat history for context
    let history = []
    if (email !== 'anonymous') {
      const raw = await loadHistory(email)
      history = raw.reverse().slice(-20).map(m => ({ role: m.role, content: m.text }))
    }

    const systemPrompt = `You are **Alex**, a friendly university tutor for the Apex exam prep app. You help students practice, explain concepts, and stay organized.

**Available courses:**
${courseList}

**You can do all of these naturally:**
1. **Quiz students** — When they ask for a quiz or question, ask which course. Then use: [QUIZ:courseCode] (e.g. [QUIZ:PHY 102]) and I'll fetch a real question.
2. **Explain concepts** — Use your knowledge to teach. Be clear and concise (2-4 paragraphs).
3. **Manage todos** — You can add/list/complete todos for the student:
   - To add: [TODO:add:Buy textbooks]
   - To list: [TODO:list]
   - To mark done: [TODO:done:1] (number from list)
   - To clear done: [TODO:clear]
4. **Answer checking** — The app handles this automatically when the student says "the answer is B".
5. **List courses** — When asked, list from above.

**Personality:** Warm, encouraging, knowledgeable. Use occasional emojis. Call the student ${name || 'friend'}. Be concise.

**Rules:**
- NEVER make up quiz questions — always use [QUIZ:code] to fetch real ones
- When a student asks for a question, ask which course first if they haven't specified
- Keep responses helpful and not too long
- If they greet you, greet back warmly and offer to help`

    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message.trim() },
    ]

    let aiReply = null
    try { aiReply = await queryAI(aiMessages) } catch {}

    if (aiReply) {
      let finalText = aiReply
      let quizData = null

      // Process [QUIZ:...] markers
      const quizMatch = finalText.match(/\[QUIZ:([^\]]+)\]/i)
      if (quizMatch) {
        const askedCourse = normalizeCourse(quizMatch[1]) || quizMatch[1].trim().toUpperCase()
        const q = await fetchQuestion(askedCourse)
        if (q) {
          const optionsList = Object.entries(q.options || {}).map(([k, v]) => `**${k.toUpperCase()}.** ${v}`).join('\n')
          finalText = finalText.replace(quizMatch[0], `Here's a question from **${q.courseCode}**:\n\n**${q.question}**\n\n${optionsList}\n\nWhat do you think?`)
          session.lastQuiz = { correctAnswer: q.correctAnswer, explanation: q.explanation, courseCode: q.courseCode }
          quizData = { id: q.id, question: q.question, options: q.options, correctAnswer: q.correctAnswer, explanation: q.explanation, courseCode: q.courseCode }
        } else {
          finalText = finalText.replace(quizMatch[0], `I couldn't find questions for **${askedCourse}**. Try a different course!`)
        }
      }

      // Process [TODO:...] markers
      const todoMatch = finalText.match(/\[TODO:([^\]]+)\]/i)
      if (todoMatch && user) {
        const result = await handleTodoAction(todoMatch[1], user)
        if (result) finalText = finalText.replace(todoMatch[0], result)
      }

      if (email !== 'anonymous') {
        saveMessage(email, 'user', message.trim())
        saveMessage(email, 'assistant', finalText)
      }

      return NextResponse.json({
        messages: [{ role: 'assistant', text: finalText }],
        ...(quizData ? { quiz: quizData } : {}),
      })
    }

    // === FALLBACK ===
    const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'sup', 'yo']
    if (greetings.some(g => lower === g || lower.startsWith(g + ' ') || lower === g + '!')) {
      const reply = `Hey${name ? ' ' + name : ''}! 👋 Ready to study?\n\n• *"Quiz me on citizenship"* — practice a topic\n• *"Explain electrostatics"* — learn a concept\n• *"Give me a PHY 102 question"* — specific practice\n• *"Add buy textbooks to my todo"* — stay organized`
      if (email !== 'anonymous') { saveMessage(email, 'user', message.trim()); saveMessage(email, 'assistant', reply) }
      return NextResponse.json({ messages: [{ role: 'assistant', text: reply }] })
    }

    const reply = `I'm here to help! Try:\n\n📝 **Practice** — *"Quiz me on GSS 112"*\n📖 **Explain** — *"Explain citizenship"*\n📋 **Tod** — *"Add review notes to my todo"*\n📚 **Courses** — *"What courses are available?"*`
    if (email !== 'anonymous') { saveMessage(email, 'user', message.trim()); saveMessage(email, 'assistant', reply) }
    return NextResponse.json({ messages: [{ role: 'assistant', text: reply }] })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ messages: [] })
    const raw = await loadHistory(user.email)
    const messages = raw.reverse().map(m => ({ role: m.role, text: m.text }))
    return NextResponse.json({ messages })
  } catch {
    return NextResponse.json({ messages: [] })
  }
}
