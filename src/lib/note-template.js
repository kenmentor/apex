// Note page templates (Samsung-style): plain / lined / grid / dots.
// Neutral grays so one style works in light + dark mode. The template id
// rides on library_nodes.color so reader + editor stay in sync.
export const NOTE_TEMPLATES = [
  { id: 'plain', label: 'Plain' },
  { id: 'lined', label: 'Lined' },
  { id: 'grid', label: 'Grid' },
  { id: 'dots', label: 'Dots' },
]

export function isNoteTemplate(v) {
  return NOTE_TEMPLATES.some(t => t.id === v)
}

export function templateBgStyle(id) {
  switch (id) {
    case 'lined':
      return {
        backgroundImage: 'repeating-linear-gradient(transparent 0px, transparent 27px, rgba(127,127,127,0.28) 27px, rgba(127,127,127,0.28) 28px)',
      }
    case 'grid':
      return {
        backgroundImage:
          'repeating-linear-gradient(transparent 0px, transparent 23px, rgba(127,127,127,0.20) 23px, rgba(127,127,127,0.20) 24px), repeating-linear-gradient(90deg, transparent 0px, transparent 23px, rgba(127,127,127,0.20) 23px, rgba(127,127,127,0.20) 24px)',
      }
    case 'dots':
      return {
        backgroundImage: 'radial-gradient(rgba(127,127,127,0.38) 1px, transparent 1.3px)',
        backgroundSize: '22px 22px',
      }
    default:
      return {}
  }
}

export function nextTemplate(id) {
  const i = NOTE_TEMPLATES.findIndex(t => t.id === id)
  return NOTE_TEMPLATES[(i + 1) % NOTE_TEMPLATES.length].id
}
