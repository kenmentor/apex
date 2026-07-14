import { gradeWithText, gradeWithVision } from '@/lib/openrouter'

function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stemWord(word) {
  if (word.length <= 4) return word
  let stem = word
  const suffixes = ['tion', 'sion', 'ment', 'ness', 'able', 'ible', 'ful', 'less', 'ive', 'ing', 'ally', 'ous', 'ity', 'ence', 'ance', 'er', 'ed', 'ly', 'es', 's']
  for (const suffix of suffixes) {
    if (stem.endsWith(suffix) && stem.length - suffix.length >= 3) {
      stem = stem.slice(0, -suffix.length)
      break
    }
  }
  return stem
}

function extractWords(text) {
  return normalizeText(text).split(' ').filter(Boolean)
}

function stemMatch(word, keyword) {
  const w = normalizeText(word)
  const k = normalizeText(keyword)
  if (!w || !k) return false
  if (w === k) return true
  if (w.includes(k) || k.includes(w)) return true
  const wStem = stemWord(w)
  const kStem = stemWord(k)
  return wStem === kStem || wStem.includes(kStem) || kStem.includes(wStem)
}

function scoreKeywords(answer, keywords) {
  if (!keywords || keywords.length === 0) return { score: 0, matched: [], maxScore: 0 }

  const words = extractWords(answer)
  const matched = []

  let totalWeight = 0
  let matchedWeight = 0

  for (const kw of keywords) {
    const kwNorm = normalizeText(kw)
    if (!kwNorm) continue
    const weight = 1.0
    totalWeight += weight

    let found = false
    let matchType = null

    for (const word of words) {
      if (normalizeText(word) === kwNorm) {
        found = true
        matchType = 'exact'
        break
      }
    }

    if (!found) {
      for (const word of words) {
        if (stemMatch(word, kwNorm)) {
          found = true
          matchType = 'stem'
          break
        }
      }
    }

    if (!found) {
      const fullAnswer = normalizeText(answer)
      if (fullAnswer.includes(kwNorm)) {
        found = true
        matchType = 'substring'
      }
    }

    if (found) {
      matchedWeight += weight
      matched.push({ keyword: kw, type: matchType })
    }
  }

  const score = totalWeight > 0 ? (matchedWeight / totalWeight) * 4 : 0
  return {
    score: Math.round(Math.min(4, Math.max(0, score)) * 100) / 100,
    matched: matched.map(m => m.keyword),
    maxScore: 4,
  }
}

function buildMarkingGuide(reference) {
  return {
    question: reference.question,
    referenceAnswer: reference.referenceAnswer,
    keyConcepts: reference.mainConcepts || [],
    keywords: reference.keywords || [],
  }
}

export async function gradeTheoryAnswer(answer, reference, answerType = 'text') {
  const keywordResult = scoreKeywords(answer, reference.keywords || [])

  let llmResult = { points: 0, breakdown: '', matchedConcepts: [], missingConcepts: [], suggestions: '', illegible: [] }

  const hasLlmKey = !!process.env.OPENROUTER_API_KEY

  if (hasLlmKey) {
    try {
      const markingGuide = buildMarkingGuide(reference)

      if (answerType === 'image') {
        llmResult = await gradeWithVision(answer, markingGuide)
      } else {
        llmResult = await gradeWithText(answer, markingGuide)
      }
    } catch (err) {
      console.error('LLM grading failed:', err.message)
      llmResult = {
        points: 0,
        breakdown: 'LLM grading unavailable',
        matchedConcepts: [],
        missingConcepts: reference.mainConcepts || [],
        illegible: [],
        suggestions: '',
      }
    }
  } else {
    const conceptMatched = []
    const conceptMissing = []
    const answerWords = extractWords(answer)

    for (const concept of (reference.mainConcepts || [])) {
      const conceptWords = extractWords(concept)
      const matchCount = conceptWords.filter(cw =>
        answerWords.some(aw => stemMatch(aw, cw))
      ).length
      const matchRatio = conceptWords.length > 0 ? matchCount / conceptWords.length : 0
      if (matchRatio >= 0.4) {
        conceptMatched.push(concept)
      } else {
        conceptMissing.push(concept)
      }
    }

    llmResult = {
      points: 0,
      breakdown: 'LLM not configured — keyword scoring only',
      matchedConcepts: conceptMatched,
      missingConcepts: conceptMissing,
      illegible: [],
      suggestions: '',
    }
  }

  const totalPoints = Math.round(Math.min(10, keywordResult.score + llmResult.points) * 100) / 100
  const percentage = Math.round((totalPoints / 10) * 100)

  return {
    keywordScore: keywordResult.score,
    llmScore: llmResult.points,
    totalPoints,
    percentage,
    llmFeedback: {
      breakdown: llmResult.breakdown,
      matchedConcepts: llmResult.matchedConcepts,
      missingConcepts: llmResult.missingConcepts,
      illegible: llmResult.illegible || [],
      suggestions: llmResult.suggestions,
    },
    keywordMatched: keywordResult.matched,
  }
}
