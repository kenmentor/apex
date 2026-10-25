import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const MASTERY_BAR = 80

export function loadPilotPlan() {
  const raw = readFileSync(join(process.cwd(), 'data', 'plans', 'cos-200L.json'), 'utf-8')
  return JSON.parse(raw)
}

export function masteryForTopic(completions, topicId, bar = MASTERY_BAR) {
  const rows = (completions || []).filter(c => c.topicId === topicId && c.kind === 'prove')
  if (rows.length === 0) return { pct: 0, passed: false, attempts: 0 }
  const best = Math.max(...rows.map(r => r.percentage || 0))
  return { pct: best, passed: best >= bar, attempts: rows.length }
}

export function planProgress(plan, completions, bar = MASTERY_BAR) {
  let topics = 0
  let passed = 0
  for (const course of plan.courses || []) {
    for (const topic of course.topics || []) {
      topics += 1
      if (masteryForTopic(completions, topic.id, topic.passMark || bar).passed) passed += 1
    }
  }
  return { topics, passed, pct: topics === 0 ? 0 : Math.round((passed / topics) * 100) }
}

export function remedialForTopic(plan, topicId) {
  for (const course of plan.courses || []) {
    for (const topic of course.topics || []) {
      if (topic.id === topicId) return (topic.items || []).filter(i => i.kind !== 'prove')
    }
  }
  return []
}
