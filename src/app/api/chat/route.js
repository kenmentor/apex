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

const TOPIC_KEYWORDS = {
  'Electrostatics': ['charge', 'coulomb', 'electric field', 'potential', 'capacitor', 'dielectric', 'electrostatic'],
  'Magnetism': ['magnetic', 'flux', 'faraday', 'lenz', 'induction', 'solenoid', 'electromagnet'],
  'Nuclear Physics': ['binding energy', 'mass defect', 'fission', 'fusion', 'radioactive', 'nuclear'],
  'Optics': ['lens', 'mirror', 'refraction', 'reflection', 'diffraction', 'interference', 'wavelength', 'light', 'optic'],
  'Thermodynamics': ['heat', 'temperature', 'entropy', 'enthalpy', 'gas law', 'carnot', 'thermo'],
  'Waves': ['amplitude', 'frequency', 'wave', 'oscillation', 'pendulum', 'standing wave', 'wave'],
  'Citizenship': ['citizen', 'citizenship', 'birth', 'naturalisation', 'registration', 'constitution', 'alien', 'nationality'],
  'Nigeria': ['nigeria', 'africa', 'lagos', 'abuja', 'flag', 'anthem', 'coat of arms', 'amalgamation'],
  'Ethnic Groups': ['hausa', 'igbo', 'yoruba', 'fulani', 'tiv', 'ethnic', 'tribe', 'indigenous'],
  'Culture': ['culture', 'tradition', 'festival', 'language', 'heritage', 'moral', 'value', 'custom'],
  'Democracy': ['democracy', 'election', 'vote', 'governance', 'president', 'parliament', 'democratic'],
  'Development': ['development', 'economy', 'self-reliance', 'isi', 'eoi', 'industrialisation'],
  'Corruption': ['corruption', 'efcc', 'icpc', 'wai', 'indiscipline', 'accountable', 'bribe'],
  'Leadership': ['leader', 'leadership', 'integrity', 'vision', 'governance', 'management'],
  'History': ['amalgamation', '1914', 'independence', 'colonial', 'republic', 'lugard', '1960'],
  'Physics': ['force', 'energy', 'velocity', 'acceleration', 'mass', 'newton', 'momentum', 'kinetic', 'potential'],
  'Chemistry': ['atom', 'molecule', 'bond', 'element', 'compound', 'reaction', 'acid', 'base', 'periodic'],
  'Data Structures': ['array', 'linked list', 'stack', 'queue', 'tree', 'graph', 'sorting', 'algorithm'],
  'Electricity': ['current', 'voltage', 'resistance', 'ohm', 'circuit', 'series', 'parallel', 'capacitor'],
}

// Simple in-memory session: maps a session key to last quiz question
const sessions = new Map()

function getSession(email) {
  if (!email) return null
  if (!sessions.has(email)) sessions.set(email, {})
  return sessions.get(email)
}

function normalizeCourse(input) {
  const key = (input || '').trim().toLowerCase()
  if (COURSE_ALIASES[key]) return COURSE_ALIASES[key]
  const match = key.match(/^([a-z]+)\s*(\d+)$/)
  if (match) return match[1].toUpperCase() + ' ' + match[2]
  return null
}

function extractTopics(input) {
  const lower = input.toLowerCase()
  const found = []
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) { found.push(topic); break }
    }
  }
  return found
}

function buildLesson(topic, question, explanation) {
  const lines = [`## 📖 ${topic}`]
  if (question) lines.push('', `**Question to test yourself:** ${question}`)
  if (explanation) lines.push('', `**Explanation:** ${explanation}`)
  return lines.join('\n')
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { message, userName, courseContext, sessionEmail } = body
    if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

    const msg = message.trim()
    const lower = msg.toLowerCase()

    const questionsCol = await getCollection('questions')
    const coursesCol = await getCollection('courses')
    const theoryCol = await getCollection('theory_references')

    const email = sessionEmail || 'anonymous'
    const session = getSession(email)

    // --- HELP ---
    if (lower === '/help' || lower === 'help' || lower === 'what can you do' || lower === 'commands') {
      return NextResponse.json({
        messages: [{ role: 'assistant', text: `Here's what I can do:

📝 **Quiz me** — *"Give me a PHY 102 question"* or *"Quiz me"*
📖 **Teach me** — *"Teach me about citizenship"* or *"Explain electrostatics"*
✅ **Check my answer** — *"The answer is B"* (after I show you a question)
🔍 **Search topics** — *"Questions about leadership"*
📚 **List courses** — *"What courses are available?"*
💡 **Help** — Type **/help** anytime

Just ask naturally and I'll help you learn!` }],
      })
    }

    const courseCode = normalizeCourse(msg)
    const topics = extractTopics(msg)

    // --- LIST COURSES ---
    if ((lower.includes('course') || lower.includes('subject')) && (lower.includes('available') || lower.includes('list') || lower.includes('what') || lower.includes('show') || lower.includes('all'))) {
      const allCourses = await coursesCol.find({}).sort({ code: 1 }).toArray()
      const list = allCourses.map(c => `• **${c.code}** — ${c.title || ''}`).join('\n')
      return NextResponse.json({
        messages: [{ role: 'assistant', text: `Here are all available courses:\n\n${list}\n\nSay *"Give me [course] question"* to practice!` }],
      })
    }

    // --- TEACH / EXPLAIN a concept ---
    const teachTriggers = ['teach', 'explain', 'what is', 'what are', 'define', 'meaning of', 'tell me about', 'learn', 'understand', 'what does']
    const isTeachRequest = teachTriggers.some(t => lower.startsWith(t) || lower.includes(t + ' '))

    if (isTeachRequest && (topics.length > 0 || courseCode)) {
      // First try to find theory references matching the topic
      const topicName = topics[0] || (courseCode ? courseCode + ' concepts' : '')
      let theoryRefs = []
      try {
        theoryRefs = await theoryCol.find({
          courseCode: courseCode ? courseCode : { $exists: true },
          $or: topics.map(t => ({
            $or: [
              { section: { $regex: t, $options: 'i' } },
              { question: { $regex: t, $options: 'i' } },
              { mainConcepts: { $regex: t, $options: 'i' } },
            ],
          })),
        }).toArray()
      } catch {}

      if (theoryRefs.length > 0) {
        const ref = theoryRefs[0]
        const concepts = (ref.mainConcepts || []).map(c => `• ${c}`).join('\n')
        return NextResponse.json({
          messages: [{ role: 'assistant', text: `## 📖 ${ref.section || topicName}\n\n${ref.referenceAnswer || ''}\n\n**Key concepts:**\n${concepts}` }],
        })
      }

      // Fallback: search questions for the topic and build a lesson
      let filter = {}
      if (courseCode) filter.courseCode = courseCode

      const allQs = await questionsCol.find(filter).toArray()
      const relevant = allQs.filter(q => {
        const text = (q.question + ' ' + (q.explanation || '') + ' ' + (q.section || '')).toLowerCase()
        return topics.some(t => TOPIC_KEYWORDS[t]?.some(kw => text.includes(kw))) || text.includes(lower.slice(0, 25))
      })

      if (relevant.length > 0) {
        // Combine explanations to form a lesson
        const explanations = relevant.slice(0, 3).map(q => q.explanation).filter(Boolean)
        const uniqueExplanations = [...new Set(explanations)]
        const lesson = uniqueExplanations.length > 0
          ? uniqueExplanations.join('\n\n')
          : `Questions about **${topicName}** found! Try one out below.`

        const pick = relevant[0]
        const optionsList = Object.entries(pick.options || {}).map(([k, v]) => `**${k.toUpperCase()}.** ${v}`).join('\n')

        session.lastQuiz = { correctAnswer: pick.correctAnswer, explanation: pick.explanation, courseCode: pick.courseCode }

        return NextResponse.json({
          messages: [{ role: 'assistant', text: `## 📖 ${topicName}\n\n${lesson}` }],
        })
      }

      // No topic match but we have a course code — teach from questions
      if (courseCode) {
        const total = await questionsCol.countDocuments({ courseCode })
        if (total > 0) {
          const docs = await questionsCol.find({ courseCode }).limit(5).toArray()
          const sampleQuestions = docs.slice(0, 3).map(q => `• **${q.question}** — *${q.explanation || ''}*`).join('\n')
          return NextResponse.json({
            messages: [{ role: 'assistant', text: `## 📖 ${courseCode}\n\nHere are some key questions and concepts from this course:\n\n${sampleQuestions}\n\nWant me to quiz you on any of these?` }],
          })
        }
      }
    }

    // --- ANSWER CHECKING ---
    const answerMatch = lower.match(/(?:the answer is|answer is|it is|i think|i choose|my answer|is it|answer)\s*[:.]?\s*([a-d])/i)
    if (answerMatch && session.lastQuiz) {
      const userAnswer = answerMatch[1].toLowerCase()
      const correct = session.lastQuiz.correctAnswer
      const isCorrect = userAnswer === correct
      const explanation = session.lastQuiz.explanation || ''

      const response = isCorrect
        ? `✅ **Correct!** Well done!\n\n${explanation ? `**Explanation:** ${explanation}` : ''}`
        : `❌ **Not quite.** The correct answer is **${correct.toUpperCase()}**.\n\n${explanation ? `**Explanation:** ${explanation}\n\nDon't worry, keep practicing!` : 'Keep practicing!'}`

      session.lastQuiz = null

      return NextResponse.json({
        messages: [{ role: 'assistant', text: response }],
      })
    }

    // Answer checking without active quiz
    if (answerMatch) {
      return NextResponse.json({
        messages: [{ role: 'assistant', text: `I'd love to check your answer! First, ask me for a question like *"Give me a PHY 102 question"* and then tell me your answer.` }],
      })
    }

    // --- RANDOM QUESTION from a specific course ---
    if (courseCode && (lower.includes('question') || lower.includes('quiz') || lower.includes('give') || lower.includes('random') || lower.includes('practice') || lower.includes('test') || lower.match(/^(give|show|get|a)\s/))) {
      const total = await questionsCol.countDocuments({ courseCode })
      if (total === 0) {
        return NextResponse.json({
          messages: [{ role: 'assistant', text: `I couldn't find any questions for **${courseCode}**. Check the code or try *"What courses are available?"*` }],
        })
      }
      const skip = Math.floor(Math.random() * total)
      const docs = await questionsCol.find({ courseCode }).skip(skip).limit(1).toArray()
      if (!docs.length) {
        return NextResponse.json({ messages: [{ role: 'assistant', text: `No questions found for **${courseCode}**.` }] })
      }

      const q = docs[0]
      const optionsList = Object.entries(q.options || {}).map(([k, v]) => `**${k.toUpperCase()}.** ${v}`).join('\n')

      // Save to session for answer checking
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

    // --- TOPIC SEARCH ---
    if (topics.length > 0) {
      let filter = {}
      if (courseCode) filter.courseCode = courseCode

      const allQuestions = await questionsCol.find(filter).toArray()
      const relevant = allQuestions.filter(q => {
        const text = (q.question + ' ' + (q.explanation || '') + ' ' + (q.section || '')).toLowerCase()
        for (const topic of topics) {
          if (TOPIC_KEYWORDS[topic]?.some(kw => text.includes(kw))) return true
        }
        return false
      })

      if (relevant.length > 0) {
        const pick = relevant[Math.floor(Math.random() * Math.min(relevant.length, 5))]
        const topicLabel = topics[0]
        const optionsList = Object.entries(pick.options || {}).map(([k, v]) => `**${k.toUpperCase()}.** ${v}`).join('\n')

        session.lastQuiz = { correctAnswer: pick.correctAnswer, explanation: pick.explanation, courseCode: pick.courseCode }

        return NextResponse.json({
          messages: [{ role: 'assistant', text: `I found a question about **${topicLabel}** from **${pick.courseCode}**:\n\n**${pick.question}**\n\n${optionsList}\n\nTap to answer or tell me your choice!` }],
          quiz: {
            id: pick.id,
            question: pick.question,
            options: pick.options,
            correctAnswer: pick.correctAnswer,
            explanation: pick.explanation,
            courseCode: pick.courseCode,
          },
        })
      }

      // Check theory refs for the topic
      let theoryRefs = []
      try {
        theoryRefs = await theoryCol.find({
          $or: topics.map(t => ({
            $or: [
              { section: { $regex: t, $options: 'i' } },
              { question: { $regex: t, $options: 'i' } },
              { keywords: { $in: topics.map(tk => new RegExp(tk, 'i')) } },
            ],
          })),
        }).limit(1).toArray()
      } catch {}

      if (theoryRefs.length > 0) {
        const ref = theoryRefs[0]
        return NextResponse.json({
          messages: [{ role: 'assistant', text: `## 📖 ${ref.section || topics[0]}\n\n${ref.referenceAnswer || ''}` }],
        })
      }

      // Fallback: random question
      const allCourses = await coursesCol.find({}).toArray()
      const codes = allCourses.map(c => c.code)
      const total = await questionsCol.countDocuments({ courseCode: { $in: codes } })
      if (total > 0) {
        const skip = Math.floor(Math.random() * total)
        const docs = await questionsCol.find({ courseCode: { $in: codes } }).skip(skip).limit(1).toArray()
        if (docs.length > 0) {
          const pick = docs[0]
          const optionsList = Object.entries(pick.options || {}).map(([k, v]) => `**${k.toUpperCase()}.** ${v}`).join('\n')
          session.lastQuiz = { correctAnswer: pick.correctAnswer, explanation: pick.explanation, courseCode: pick.courseCode }
          return NextResponse.json({
            messages: [{ role: 'assistant', text: `I don't have a direct match for that topic, but here's a question from **${pick.courseCode}**:\n\n**${pick.question}**\n\n${optionsList}` }],
            quiz: {
              id: pick.id,
              question: pick.question,
              options: pick.options,
              correctAnswer: pick.correctAnswer,
              explanation: pick.explanation,
              courseCode: pick.courseCode,
            },
          })
        }
      }
    }

    // --- GENERIC QUIZ REQUEST ---
    if (lower.includes('quiz') || lower.includes('test me') || lower.includes('practice') || lower.includes('ask me') || lower.includes('question')) {
      const allCourses = await coursesCol.find({}).toArray()
      const codes = allCourses.map(c => c.code)
      const total = await questionsCol.countDocuments({ courseCode: { $in: codes } })
      if (total > 0) {
        const skip = Math.floor(Math.random() * total)
        const docs = await questionsCol.find({ courseCode: { $in: codes } }).skip(skip).limit(1).toArray()
        if (docs.length > 0) {
          const q = docs[0]
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
    }

    // --- GREETING ---
    const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'sup', 'yo']
    if (greetings.some(g => lower === g || lower.startsWith(g + ' ') || lower === g + '!')) {
      return NextResponse.json({
        messages: [{ role: 'assistant', text: `Hey${userName ? ' ' + userName : ''}! 👋 Ready to study?\n\n• *"Quiz me on citizenship"* — practice a topic\n• *"Teach me about electrostatics"* — learn a concept\n• *"Give me a PHY 102 question"* — specific course practice\n• Type **/help** for all commands` }],
      })
    }

    // --- FALLBACK ---
    let response = `I'm not sure I understood that. Here's what I can help with:\n\n`
    response += `📝 **Practice** — *"Give me a PHY 102 question"*\n`
    response += `📖 **Learn** — *"Teach me about citizenship"*\n`
    response += `✅ **Answer check** — *"The answer is B"* (after a question)\n`
    response += `📚 **Courses** — *"What courses are available?"*\n`
    response += `💡 **Help** — Type **/help**\n`

    return NextResponse.json({
      messages: [{ role: 'assistant', text: response }],
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
