const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

const DEFAULT_MODEL = 'google/gemini-2.5-flash-image'

export async function chatCompletion(messages, { model, temperature = 0.3, maxTokens = 1024 } = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured')

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.FRONTEND_URL || 'https://quiz.apex.app',
      'X-Title': 'Apex Theory Grader',
    },
    body: JSON.stringify({
      model: model || process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenRouter API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

export async function gradeWithVision(base64Image, markingGuide, { model, temperature = 0.2 } = {}) {
  const messages = [
    {
      role: 'system',
      content: `You are a strict university examiner grading a theory exam answer.
You will receive:
1. A marking guide (reference answer, keywords, and main concepts)
2. The student's answer (either as text or an image of their handwritten answer)

Your job is to grade the student's answer fairly based on the marking guide.

Rules:
- Award credit for correct concepts even if worded differently
- Partial credit for partially correct answers
- Deduct for incorrect information
- For images: read the handwriting as carefully as you can. If parts are illegible, note it.
- Be strict but fair — this is a university exam.

Return ONLY valid JSON with no extra text:
{
  "points": <number 0-6>,
  "breakdown": "<brief explanation of how points were awarded>",
  "matchedConcepts": ["concept1", "concept2"],
  "missingConcepts": ["concept3"],
  "illegible": ["<any parts you couldn't read from image, or empty array>"],
  "suggestions": "<one actionable improvement suggestion>"
}`
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `MARKING GUIDE:\n${JSON.stringify(markingGuide, null, 2)}\n\nSTUDENT ANSWER (IMAGE): See the attached photo of the student's handwritten answer.`
        },
        {
          type: 'image_url',
          image_url: {
            url: base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`,
            detail: 'high'
          }
        }
      ]
    }
  ]

  const raw = await chatCompletion(messages, { model, temperature, maxTokens: 1024 })
  return parseGradingResponse(raw)
}

export async function gradeWithText(studentAnswer, markingGuide, { model, temperature = 0.2 } = {}) {
  const messages = [
    {
      role: 'system',
      content: `You are a strict university examiner grading a theory exam answer.
You will receive:
1. A marking guide (reference answer, keywords, and main concepts)
2. The student's text answer

Your job is to grade the student's answer fairly based on the marking guide.

Rules:
- Award credit for correct concepts even if worded differently
- Partial credit for partially correct answers
- Deduct for incorrect information
- Be strict but fair — this is a university exam.

Return ONLY valid JSON with no extra text:
{
  "points": <number 0-6>,
  "breakdown": "<brief explanation of how points were awarded>",
  "matchedConcepts": ["concept1", "concept2"],
  "missingConcepts": ["concept3"],
  "suggestions": "<one actionable improvement suggestion>"
}`
    },
    {
      role: 'user',
      content: `MARKING GUIDE:\n${JSON.stringify(markingGuide, null, 2)}\n\nSTUDENT ANSWER:\n${studentAnswer}`
    }
  ]

  const raw = await chatCompletion(messages, { model, temperature, maxTokens: 1024 })
  return parseGradingResponse(raw)
}

function parseGradingResponse(raw) {
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const json = JSON.parse(cleaned)
    return {
      points: Math.min(6, Math.max(0, Number(json.points) || 0)),
      breakdown: json.breakdown || '',
      matchedConcepts: Array.isArray(json.matchedConcepts) ? json.matchedConcepts : [],
      missingConcepts: Array.isArray(json.missingConcepts) ? json.missingConcepts : [],
      illegible: Array.isArray(json.illegible) ? json.illegible : [],
      suggestions: json.suggestions || '',
    }
  } catch {
    const pointsMatch = raw.match(/"points"\s*:\s*(\d+(?:\.\d+)?)/)
    return {
      points: pointsMatch ? Math.min(6, Math.max(0, parseFloat(pointsMatch[1]))) : 3,
      breakdown: 'Score auto-extracted from response',
      matchedConcepts: [],
      missingConcepts: [],
      illegible: [],
      suggestions: '',
    }
  }
}
