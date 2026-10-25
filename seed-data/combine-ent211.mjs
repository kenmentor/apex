import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const cleaned = JSON.parse(readFileSync(join(__dirname, 'ent211-mcq.json'), 'utf-8'))
const bank = JSON.parse(readFileSync(join(__dirname, 'ent211-bank.json'), 'utf-8'))

const combined = {
  course_code: 'ENT 211',
  course_title: 'Entrepreneurship and Innovation',
  study_guide_title: 'ENT 211 Comprehensive Question Bank (Six Modules, Cleaned + Explanations)',
  sections: [...cleaned.sections, ...bank.sections],
}

writeFileSync(join(__dirname, 'ent211-full.json'), JSON.stringify(combined, null, 2), 'utf-8')

let total = 0
for (const s of combined.sections) total += s.questions.length
console.log(`Combined sections: ${combined.sections.length}, total questions: ${total}`)
