import { gradeBatchWithText } from '@/lib/openrouter'

function buildMarkingGuide(reference) {
  return {
    question: reference.question,
    referenceAnswer: reference.referenceAnswer,
    keyConcepts: reference.mainConcepts || [],
  }
}

export async function gradeTheoryExam(answers, references) {
  const hasLlmKey = !!process.env.OPENROUTER_API_KEY

  if (!hasLlmKey) {
    return answers.map((a, i) => ({
      questionIndex: i,
      points: 0,
      remark: 'Examiner unavailable. No grade awarded.',
      matchedConcepts: [],
      missingConcepts: references[i]?.mainConcepts || [],
      suggestion: '',
      totalPoints: 0,
      percentage: 0,
    }))
  }

  const markingGuides = references.map(r => buildMarkingGuide(r))

  try {
    const llmResults = await gradeBatchWithText(answers, markingGuides)

    return llmResults.map((r, i) => ({
      questionIndex: i,
      points: r.points,
      remark: r.remark,
      matchedConcepts: r.matchedConcepts,
      missingConcepts: r.missingConcepts,
      suggestion: r.suggestion,
      totalPoints: r.points,
      percentage: Math.round((r.points / 6) * 100),
    }))
  } catch (err) {
    console.error('LLM batch grading failed:', err.message)
    return answers.map((a, i) => ({
      questionIndex: i,
      points: 0,
      remark: 'Examiner encountered an error. No grade awarded.',
      matchedConcepts: [],
      missingConcepts: [],
      suggestion: '',
      totalPoints: 0,
      percentage: 0,
    }))
  }
}
