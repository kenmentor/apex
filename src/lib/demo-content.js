// Realistic demo content — used ONLY when the real APIs return nothing,
// so every tab and screen can be demoed end-to-end. Anything rendered
// from here carries a small "Demo" badge in the UI.

export function mockPlan() {
  const mkItems = (tid, kinds) => kinds.map((k, i) => ({ id: `${tid}-${k}`, kind: k, title: k === 'learn' ? 'Read notes' : k === 'drill' ? 'Drill: 10 questions' : 'Prove: timed quiz' }))
  const mkTopics = (code, titles) => titles.map((title, i) => ({
    id: `${code.toLowerCase().replace(/\s+/g, '')}-t${i + 1}`,
    title,
    items: mkItems(`${code}-t${i + 1}`, ['learn', 'drill', 'prove']),
  }))
  return {
    supported: true,
    demo: true,
    cohort: { department: 'Computer Science', level: '300 Level' },
    courses: [
      {
        code: 'COS 202',
        title: 'Computer Programming II',
        topics: mkTopics('COS 202', [
          'Arrays and Strings',
          'Pointers and References',
          'Functions and Recursion',
          'Structures and Unions',
          'File Handling in C',
          'Linked Lists Basics',
        ]),
      },
      {
        code: 'CSC 282',
        title: 'Data Structures',
        topics: mkTopics('CSC 282', [
          'Stacks and Queues',
          'Trees and Traversals',
          'Sorting Algorithms',
          'Searching Algorithms',
          'Graphs Basics',
        ]),
      },
      {
        code: 'STA 111',
        title: 'Introduction to Statistics',
        topics: mkTopics('STA 111', [
          'Data Presentation',
          'Measures of Central Tendency',
          'Probability Basics',
          'Random Variables',
        ]),
      },
    ],
  }
}

export function mockTopicContent(courseCode, topicTitle) {
  const t = topicTitle || 'Topic'
  const code = courseCode || 'COS 202'
  return {
    demo: true,
    topic: { id: 'demo', title: t, order: null, prev: null, next: null },
    counts: { quiz: 1, video: 2, audio: 2, pdf: 2, text: 2, other: 0 },
    tabs: {
      quiz: [{
        id: 'quiz-demo',
        questions: 12,
        minutes: 20,
        passMark: 50,
        best: 78,
        samples: [
          { q: `Which statement best describes ${t}?`, options: ['Option A', 'Option B', 'Option C', 'Option D'], answer: 1 },
          { q: `In ${t}, which of the following is always true?`, options: ['First claim', 'Second claim', 'Third claim', 'None of these'], answer: 0 },
          { q: `Choose the correct application of ${t}.`, options: ['Case one', 'Case two', 'Case three', 'Case four'], answer: 2 },
        ],
      }],
      video: [
        { id: 'v1', kind: 'video', title: `${t} — Full Explanation (Sample)`, url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', description: `Complete breakdown of ${t} with worked examples.` },
        { id: 'v2', kind: 'video', title: `${t} in 10 Minutes (Sample)`, url: 'https://www.youtube.com/watch?v=eRsGyueVLvQ', description: `Quick revision of ${t} for ${code}.` },
      ],
      audio: [
        { id: 'a1', kind: 'audio', title: `${t} — Audio Recap`, url: '', duration: '3:12' },
        { id: 'a2', kind: 'audio', title: `${code} Class Recording (Highlights)`, url: '', duration: '8:24' },
      ],
      pdf: [
        { id: 'p1', kind: 'pdf', title: `${code} — ${t} Past Questions 2024 (Sample)`, url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
        { id: 'p2', kind: 'pdf', title: `${t} — Lecture Note Pack (Sample)`, url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
      ],
      text: [
        { id: 'r1', kind: 'text', title: `${t} — Study Notes`, source: 'reading', content: `<p><strong>${t}</strong> is one of the highest-yield areas in ${code}. Start from the definition, master the core principles below, then attempt the quiz tab to lock it in.</p><ul><li>Definition and scope</li><li>Core principles with one example each</li><li>Common exam traps</li></ul>` },
        { id: 't1', kind: 'text', title: `Why does ${t} matter?`, source: 'theory', concepts: [`${t} connects directly to exam-style problem solving.`, `Most past questions test application, not recall.`, `Pair this note with the 10-minute video above.`], keywords: [code.toLowerCase(), 'exam', 'theory'] },
      ],
      other: [],
    },
  }
}
