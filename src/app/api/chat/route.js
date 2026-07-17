import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

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

const sessions = new Map()

function getSession(email) {
  if (!email) return null
  if (!sessions.has(email)) sessions.set(email, { history: [] })
  return sessions.get(email)
}

function normalizeCourse(input) {
  const key = (input || '').trim().toLowerCase()
  if (COURSE_ALIASES[key]) return COURSE_ALIASES[key]
  const match = key.match(/^([a-z]+)\s*(\d+)$/)
  if (match) return match[1].toUpperCase() + ' ' + match[2]
  return null
}

async function fetchRandomQuestion(courseCode) {
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
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  })

  if (!res.ok) return null

  const data = await res.json()
  return data.choices?.[0]?.message?.content || null
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { message, userName, sessionEmail } = body
    if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

    const msg = message.trim()
    const lower = msg.toLowerCase()
    const email = sessionEmail || 'anonymous'
    const session = getSession(email)

    const coursesCol = await getCollection('courses')
    const allCourses = await coursesCol.find({}).sort({ code: 1 }).toArray()
    const courseList = allCourses.map(c => `${c.code} — ${c.title || ''}`).join('\n')

    // --- ANSWER CHECKING (server-side, precise) ---
    const answerMatch = lower.match(/(?:the answer is|answer is|it is|i think|i choose|my answer|is it|answer)\s*[:.]?\s*([a-d])/i)

    if (answerMatch && session.lastQuiz) {
      const userAnswer = answerMatch[1].toLowerCase()
      const correct = session.lastQuiz.correctAnswer
      const isCorrect = userAnswer === correct

      const response = isCorrect
        ? `✅ **Correct!** Well done!${session.lastQuiz.explanation ? `\n\n**Explanation:** ${session.lastQuiz.explanation}` : ''}`
        : `❌ **Not quite.** The correct answer is **${correct.toUpperCase()}**.${session.lastQuiz.explanation ? `\n\n**Explanation:** ${session.lastQuiz.explanation}\n\nDon't worry, keep practicing!` : ' Keep practicing!'}`

      session.lastQuiz = null

      return NextResponse.json({
        messages: [{ role: 'assistant', text: response }],
      })
    }

    // Answer pattern but no active quiz
    if (answerMatch) {
      return NextResponse.json({
        messages: [{ role: 'assistant', text: `I'd love to check your answer! First, ask me for a question like *"Give me a PHY 102 question"* and then tell me your answer.` }],
      })
    }

    // --- QUESTION FETCHING (server-side, precise) ---
    const courseCode = normalizeCourse(msg)

    // Explicit question request for a specific course
    if (courseCode && (lower.includes('question') || lower.includes('quiz') || lower.includes('give') || lower.includes('random') || lower.includes('practice') || lower.includes('test') || lower.includes('ask'))) {
      const q = await fetchRandomQuestion(courseCode)
      if (!q) {
        return NextResponse.json({
          messages: [{ role: 'assistant', text: `I couldn't find any questions for **${courseCode}**. Here are available courses:\n\n${courseList}\n\nWhich one interests you?` }],
        })
      }
      const optionsList = Object.entries(q.options || {}).map(([k, v]) => `**${k.toUpperCase()}.** ${v}`).join('\n')
      session.lastQuiz = { correctAnswer: q.correctAnswer, explanation: q.explanation, courseCode: q.courseCode }
      return NextResponse.json({
        messages: [{ role: 'assistant', text: `Here's a question from **${q.courseCode}** (*${q.section || ''}*):\n\n**${q.question}**\n\n${optionsList}\n\nWhat do you think? Tell me *"The answer is B"*` }],
        quiz: {
          id: q.id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          courseCode: q.courseCode,
        },
      })
    }

    // Generic quiz request
    if ((lower.includes('quiz') || lower.includes('test me') || lower.includes('practice') || lower.includes('ask me') || lower.includes('question')) && !courseCode) {
      const codes = allCourses.map(c => c.code)
      const q = await fetchRandomQuestion(codes[Math.floor(Math.random() * codes.length)])
      if (q) {
        const optionsList = Object.entries(q.options || {}).map(([k, v]) => `**${k.toUpperCase()}.** ${v}`).join('\n')
        session.lastQuiz = { correctAnswer: q.correctAnswer, explanation: q.explanation, courseCode: q.courseCode }
        return NextResponse.json({
          messages: [{ role: 'assistant', text: `Sure! Here's a random question:\n\n**${q.question}**\n\n${optionsList}\n\nWhat's your answer?` }],
          quiz: {
            id: q.id,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            courseCode: q.courseCode,
          },
        })
      }
    }

    // --- AI-POWERED RESPONSE ---
    const systemPrompt = `You are **Alex**, a friendly and knowledgeable tutor for Apex — a university exam prep app. You help students practice past questions, explain concepts, and prepare for exams.

**Available courses:**
${courseList}

**Your capabilities:**
- Answer questions about courses, topics, and concepts
- Explain difficult ideas in simple terms
- Give study advice and exam tips
- When a student asks for a question or quiz, ask which course or topic they want
- Be encouraging and supportive
- Keep responses concise and helpful (2-4 paragraphs max)

**Rules:**
- When a student asks "what courses are available", list the courses above
- If they ask about a topic you don't know, admit it honestly and suggest related courses
- Never make up quiz questions or answers — use the app's question system
- If they want a specific question, ask for the course code first
- Be warm and use occasional emojis but don't overdo it
- The user's name is ${userName || 'Student'}
- Respond naturally as a knowledgeable tutor`

    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...(session.history || []).slice(-10),
      { role: 'user', content: msg },
    ]

    // Try AI response
    let aiReply = null
    try {
      aiReply = await queryAI(aiMessages)
    } catch {}

    if (aiReply) {
      session.history.push({ role: 'user', content: msg })
      session.history.push({ role: 'assistant', content: aiReply })
      return NextResponse.json({
        messages: [{ role: 'assistant', text: aiReply }],
      })
    }

    // --- FALLBACK (no AI key or AI failed) ---
    const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'sup', 'yo']
    if (greetings.some(g => lower === g || lower.startsWith(g + ' ') || lower === g + '!')) {
      return NextResponse.json({
        messages: [{ role: 'assistant', text: `Hey${userName ? ' ' + userName : ''}! 👋 Ready to study?\n\n• *"Quiz me on citizenship"* — practice a topic\n• *"Teach me about electrostatics"* — learn a concept\n• *"Give me a PHY 102 question"* — specific course practice` }],
      })
    }

    return NextResponse.json({
      messages: [{ role: 'assistant', text: `I'm here to help you study! Try:\n\n📝 **Practice** — *"Give me a PHY 102 question"*\n📖 **Explain** — *"Explain electrostatics"*\n📚 **Courses** — *"What courses are available?"*` }],
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
