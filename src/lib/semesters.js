// First vs Second Semester, by standard NUC numbering: the last digit of
// the course number decides — odd (101, 201) = First Semester, even
// (102, 202) = Second Semester. Non-numeric codes sort with First so they
// never vanish behind a divider.
export function semesterOf(code) {
  const m = String(code || '').match(/(\d+)\s*$/)
  if (!m) return 1
  return Number(m[1].slice(-1)) % 2 === 0 ? 2 : 1
}

function codeNum(code) {
  const m = String(code || '').match(/(\d+)\s*$/)
  return m ? Number(m[1]) : 0
}

// Splits a course list into { first, second }, each sorted by course number.
// When one side is empty there is nothing to differentiate — render plain.
export function splitBySemester(courses) {
  const first = []
  const second = []
  for (const c of courses || []) {
    ;(semesterOf(c?.code) === 2 ? second : first).push(c)
  }
  const byNum = (a, b) => codeNum(a?.code) - codeNum(b?.code)
  first.sort(byNum)
  second.sort(byNum)
  return { first, second }
}
