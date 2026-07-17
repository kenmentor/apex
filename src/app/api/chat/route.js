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
  'electrostatics': ['charge', 'coulomb', 'electric field', 'potential', 'capacitor', 'dielectric'],
  'magnetism': ['magnetic', 'flux', 'faraday', 'lenz', 'induction', 'solenoid'],
  'nuclear': ['binding energy', 'mass defect', 'fission', 'fusion', 'radioactive'],
  'optics': ['lens', 'mirror', 'refraction', 'reflection', 'diffraction', 'interference', 'wavelength'],
  'thermodynamics': ['heat', 'temperature', 'entropy', 'enthalpy', 'gas law', 'carnot'],
  'waves': ['amplitude', 'frequency', 'wave', 'oscillation', 'pendulum', 'standing wave'],
  'citizenship': ['citizen', 'citizenship', 'birth', 'naturalisation', 'registration', 'constitution'],
  'nigeria': ['nigeria', 'africa', 'lagos', 'abuja', 'flag', 'anthem', 'coat of arms'],
  'ethnic': ['hausa', 'igbo', 'yoruba', 'fulani', 'tiv', 'ethnic', 'tribe', 'indigenous'],
  'culture': ['culture', 'tradition', 'festival', 'language', 'heritage', 'moral', 'value'],
  'democracy': ['democracy', 'election', 'vote', 'governance', 'president', 'parliament'],
  'development': ['development', 'economy', 'self-reliance', 'isi', 'eoi', 'industrialisation'],
  'corruption': ['corruption', 'efcc', 'icpc', 'wai', 'indiscipline', 'accountability'],
  'leadership': ['leader', 'leadership', 'integrity', 'vision', 'governance', 'management'],
  'history': ['amalgamation', '1914', 'independence', 'colonial', 'republic', 'lugard'],
  'physics': ['force', 'energy', 'velocity', 'acceleration', 'mass', 'newton', 'momentum'],
  'chemistry': ['atom', 'molecule', 'bond', 'element', 'compound', 'reaction', 'acid', 'base'],
  'data structures': ['array', 'linked list', 'stack', 'queue', 'tree', 'graph', 'sorting'],
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

function buildGreeting(name) {
  return {
    role: 'assistant',
    text: `Hey${name ? ' ' + name : ''}! 👋 I'm **Alex**, your study tutor. I can help you with:\n\n• 📚 **Practice questions** from any course\n• 💡 **Explain concepts** and answers\n• 🔍 **Search** past questions by topic\n• 📝 **Quiz you** on the spot\n\nTry saying: *"Give me a PHY 102 question"* or *"What's citizenship?"* or *"Quiz me on electrostatics"*`,
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { message, userName, courseContext } = body
    if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

    const msg = message.trim()
    const lower = msg.toLowerCase()

    const questionsCol = await getCollection('questions')
    const coursesCol = await getCollection('courses')

    // Help
    if (lower === '/help' || lower === 'help' || lower === 'what can you do' || lower === 'commands') {
      return NextResponse.json({
        messages: [
          { role: 'assistant', text: `Here's what I can do:\n\n• **Quiz me** — I'll give you a random question from any course\n• **Explain** [topic] — I'll find and explain questions about that topic\n• **Search** [keyword] — Find questions matching a keyword\n• **Courses** — List all available courses\n• **/help** — Show this menu\n\nJust ask naturally!` },
        ],
      })
    }

    const courseCode = normalizeCourse(msg)
    const topics = extractTopics(msg)

    // Ask for available courses
    if (lower.includes('course') && (lower.includes('available') || lower.includes('list') || lower.includes('what') || lower.includes('show'))) {
      const allCourses = await coursesCol.find({}).toArray()
      const list = allCourses.map(c => `• **${c.code}** — ${c.title || ''}`).join('\n')
      return NextResponse.json({
        messages: [
          { role: 'assistant', text: `Here are the available courses:\n\n${list}\n\nAsk me for a question from any of these!` },
        ],
      })
    }

    // Random question from a specific course
    if (courseCode && (lower.includes('question') || lower.includes('quiz') || lower.includes('give') || lower.includes('random') || lower.includes('practice') || lower.match(/^(give|show|get|a)\s/))) {
      const total = await questionsCol.countDocuments({ courseCode })
      if (total === 0) {
        return NextResponse.json({
          messages: [
            { role: 'assistant', text: `I couldn't find any questions for **${courseCode}**. Check the course code and try again.` },
          ],
        })
      }
      const skip = Math.floor(Math.random() * total)
      const docs = await questionsCol.find({ courseCode }).skip(skip).limit(1).toArray()
      if (docs.length === 0) {
        return NextResponse.json({
          messages: [
            { role: 'assistant', text: `No questions found for **${courseCode}**.` },
          ],
        })
      }

      const q = docs[0]
      const optionsList = Object.entries(q.options || {}).map(([k, v]) => `**${k.toUpperCase()}.** ${v}`).join('\n')
      return NextResponse.json({
        messages: [
          { role: 'assistant', text: `Here's a question from **${q.courseCode}** (*${q.section || ''}*):\n\n**${q.question}**\n\n${optionsList}\n\nWhat do you think the answer is?` },
        ],
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

    // Tutor mode: answer the question if they respond to a quiz
    const answerMatch = lower.match(/^(the answer is|answer is|it is|i think|i choose|my answer|is it|answer)\s*[:.]?\s*([a-d])$/i)
    if (answerMatch) {
      // They're answering a previous question - but without state we can't verify.
      // Instead, check if there's a specific answer they're giving
      return NextResponse.json({
        messages: [
          { role: 'assistant', text: `To check your answer, I need you to ask me for a question first using the quiz modal option. Try saying *"Give me a PHY 102 question"* and I'll show it in a clickable quiz!` },
        ],
      })
    }

    // Search by topic keywords across all courses
    if (topics.length > 0) {
      let filter = {}
      if (courseCode) filter.courseCode = courseCode

      const allQuestions = await questionsCol.find(filter).toArray()
      const relevant = allQuestions.filter(q => {
        const qText = (q.question + ' ' + (q.explanation || '') + ' ' + (q.section || '')).toLowerCase()
        for (const topic of topics) {
          const keywords = TOPIC_KEYWORDS[topic] || [topic]
          for (const kw of keywords) {
            if (qText.includes(kw)) return true
          }
        }
        return qText.includes(lower.slice(0, 30))
      })

      if (relevant.length > 0) {
        const pick = relevant[Math.floor(Math.random() * Math.min(relevant.length, 5))]
        const topicLabel = topics[0].charAt(0).toUpperCase() + topics[0].slice(1)
        const optionsList = Object.entries(pick.options || {}).map(([k, v]) => `**${k.toUpperCase()}.** ${v}`).join('\n')
        return NextResponse.json({
          messages: [
            { role: 'assistant', text: `I found a question about **${topicLabel}** from **${pick.courseCode}**:\n\n**${pick.question}**\n\n${optionsList}\n\nTap the quiz below to answer!` },
          ],
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

      // If no direct match, search explanations for answers
      if (!courseCode) {
        const courseList = await coursesCol.find({}).toArray()
        const codes = courseList.map(c => c.code)
        const anyQs = await questionsCol.find({ courseCode: { $in: codes } }).limit(3).toArray()
        if (anyQs.length > 0) {
          const pick = anyQs[Math.floor(Math.random() * anyQs.length)]
          const optionsList = Object.entries(pick.options || {}).map(([k, v]) => `**${k.toUpperCase()}.** ${v}`).join('\n')
          return NextResponse.json({
            messages: [
              { role: 'assistant', text: `I don't have a specific match for that topic, but here's a random question from **${pick.courseCode}**:\n\n**${pick.question}**\n\n${optionsList}` },
            ],
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

    // Ask for a quiz (generic)
    if (lower.includes('quiz') || lower.includes('test') || lower.includes('practice question') || lower.includes('ask me')) {
      const allCourses = await coursesCol.find({}).toArray()
      const codes = allCourses.map(c => c.code)
      const total = await questionsCol.countDocuments({ courseCode: { $in: codes } })
      if (total > 0) {
        const skip = Math.floor(Math.random() * total)
        const docs = await questionsCol.find({ courseCode: { $in: codes } }).skip(skip).limit(1).toArray()
        if (docs.length > 0) {
          const q = docs[0]
          const optionsList = Object.entries(q.options || {}).map(([k, v]) => `**${k.toUpperCase()}.** ${v}`).join('\n')
          return NextResponse.json({
            messages: [
              { role: 'assistant', text: `Sure! Here's a random question:\n\n**${q.question}**\n\n${optionsList}\n\nTap to answer!` },
            ],
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

    // Generic response with helpful suggestions
    let response = `I'm not sure I understood that. Could you try one of these?\n\n`
    response += `• *"Give me a PHY 102 question"*\n`
    response += `• *"Quiz me on electrostatics"*\n`
    response += `• *"What courses are available?"*\n`
    response += `• *"Explain citizenship"*\n`
    response += `• Type **/help** to see everything I can do`

    return NextResponse.json({
      messages: [
        { role: 'assistant', text: response },
      ],
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
