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

export async function gradeBatchWithText(questions, markingGuides, { model, temperature = 0.1 } = {}) {
  const prompt = buildBatchPrompt(questions, markingGuides)
  const messages = [
    { role: 'system', content: EXAMINER_SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ]
  const raw = await chatCompletion(messages, { model, temperature, maxTokens: 4096 })
  return parseBatchResponse(raw, questions.length)
}

export async function gradeBatchWithVision(questions, markingGuides, base64Images, { model, temperature = 0.1 } = {}) {
  const content = [
    { type: 'text', text: buildBatchPrompt(questions, markingGuides) },
    ...base64Images.map((img, i) => ({
      type: 'image_url',
      image_url: {
        url: img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`,
        detail: 'high',
      },
    })),
  ]

  const messages = [
    { role: 'system', content: EXAMINER_SYSTEM_PROMPT },
    { role: 'user', content },
  ]

  const raw = await chatCompletion(messages, { model, temperature, maxTokens: 4096 })
  return parseBatchResponse(raw, questions.length)
}

const EXAMINER_SYSTEM_PROMPT = `You are a strict university examination marker. You grade theory exam answers against a marking guide.

YOUR ROLE:
- You are not a tutor. You are an examiner.
- Do not be encouraging, comforting, or diplomatic.
- Do not say "good effort" or "well done" or "keep trying."
- State what is correct. State what is wrong. State what is missing.
- If an answer is poor, say so directly.
- If an answer is excellent, acknowledge it briefly without enthusiasm.
- Only provide a suggestion if the answer has a clear, specific deficiency that could be addressed. If the answer is already strong, leave suggestions empty.

GRADING RULES:
- Grade out of 6 points per question.
- 0 = Answer is completely wrong, irrelevant, or blank.
- 1-2 = Answer shows minimal understanding. Major concepts missing or incorrect.
- 3-4 = Partial understanding. Some key points covered but significant gaps.
- 5 = Good answer. Covers most key points with minor gaps.
- 6 = Excellent. Comprehensive, accurate, well-structured.
- Deduct for incorrect information.
- Deduct for irrelevant content padding.
- Deduct for answers that merely list keywords without demonstrating understanding.

Return ONLY valid JSON:
{
  "results": [
    {
      "questionIndex": 0,
      "points": 0-6,
      "remark": "<one sentence, factual, no emotion. Example: 'Answer is largely incorrect. Only X was correctly identified.' or 'Comprehensive. All key points addressed accurately.'>",
      "matchedConcepts": ["concept1"],
      "missingConcepts": ["concept2"],
      "suggestion": "<only if there is a clear specific deficiency, otherwise empty string>"
    }
  ]
}`

function buildBatchPrompt(questions, markingGuides) {
  let prompt = 'GRADE THE FOLLOWING EXAMINATION ANSWERS.\n\n'

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const g = markingGuides[i]
    prompt += `--- QUESTION ${i + 1} ---\n`
    prompt += `Question: ${g.question}\n`
    prompt += `Reference Answer: ${g.referenceAnswer}\n`
    prompt += `Key Concepts: ${g.keyConcepts.join('; ')}\n`
    prompt += `Student Answer: ${q.answerText || '(no answer provided)'}\n\n`
  }

  prompt += `Grade each question. Return JSON with results array in order.`
  return prompt
}

function parseBatchResponse(raw, count) {
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const json = JSON.parse(cleaned)
    if (json.results && Array.isArray(json.results)) {
      return json.results.map((r, i) => ({
        questionIndex: r.questionIndex ?? i,
        points: Math.min(6, Math.max(0, Number(r.points) || 0)),
        remark: r.remark || '',
        matchedConcepts: Array.isArray(r.matchedConcepts) ? r.matchedConcepts : [],
        missingConcepts: Array.isArray(r.missingConcepts) ? r.missingConcepts : [],
        suggestion: r.suggestion || '',
      }))
    }
  } catch {}

  const results = []
  for (let i = 0; i < count; i++) {
    const pattern = new RegExp(`"questionIndex"\\s*:\\s*${i}[^}]*"points"\\s*:\\s*(\\d+(?:\\.\\d+)?)`)
    const match = raw.match(pattern)
    results.push({
      questionIndex: i,
      points: match ? Math.min(6, Math.max(0, parseFloat(match[1]))) : 3,
      remark: 'Grade extracted from partial response.',
      matchedConcepts: [],
      missingConcepts: [],
      suggestion: '',
    })
  }
  return results
}
