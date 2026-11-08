// Shared course titles + accents for metadata and OG images.
// Edge-safe: plain data, no node APIs.

export const COURSE_TITLES = {
  'GSS 112': 'Peace & Conflict Resolution',
  'GSS 212': 'Philosophy & Logic',
  'GSS 101': 'Citizenship Education',
  'GST 112': 'Nigerian People & Culture',
  'CSC 101': 'Introduction to Computing Sciences',
  'CSC 102': 'Introduction to Computing',
  'CSC 162': 'Computer Programming',
  'CSC 182': 'Data Structures & Algorithms',
  'CSC 203': 'Discrete Structure',
  'CSC 282': 'Java OOP',
  'COS 101': 'Introduction to Computing Sciences',
  'COS 102': 'Problem Solving',
  'COS 103': 'Introduction to Computer Technology',
  'COS 201': 'Computer Programming I',
  'COS 202': 'Computer Programming II',
  'MTH 101': 'Elementary Mathematics I',
  'MTH 102': 'Elementary Mathematics II',
  'MTH 103': 'Elementary Mathematics III',
  'MTH 201': 'Mathematical Methods I',
  'MTH 202': 'Elementary Differential Equations',
  'STA 111': 'Descriptive Statistics',
  'STA 112': 'Probability I',
  'STA 121': 'Statistical Inference I',
  'IFT 211': 'Digital Logic Design',
  'IFT 212': 'Computer Architecture & Organisation',
  'PHY 102': 'General Physics II',
  'PHY 108': 'General Physics III',
  'BCM 242': 'Carbohydrate Metabolism',
  'MLS 161': 'MLS & Lab Safety',
  'CHM 101': 'General Chemistry I',
  'INS 202': 'Insurance',
  'ENT 211': 'Entrepreneurship & Innovation',
  'CLP 211': 'Chemical Pathology',
  'ANA 201': 'Anatomy of Upper/Lower Limbs',
  'ANA 202': 'Histology of Basic Tissues',
  'ANA 203': 'General and Systemic Embryology',
  'ANA 204': 'Anatomy of Thorax, Abdomen, Pelvis & Perineum',
  'BCH 201': 'General Biochemistry I',
  'BCH 202': 'General Biochemistry II',
}

export const COURSE_ACCENTS = {
  'GSS 112': '#38BDF8',
  'GSS 212': '#A78BFA',
  'GSS 101': '#34D399',
  'GST 112': '#7DD3FC',
  'CSC 101': '#22D3EE',
  'CSC 102': '#22D3EE',
  'CSC 162': '#4ADE80',
  'CSC 182': '#FBBF24',
  'CSC 203': '#FB923C',
  'CSC 282': '#F87171',
  'COS 101': '#22D3EE',
  'COS 102': '#4ADE80',
  'COS 103': '#2DD4BF',
  'COS 201': '#60A5FA',
  'COS 202': '#D8B4FE',
  'MTH 101': '#FACC15',
  'MTH 102': '#FB923C',
  'MTH 103': '#F472B6',
  'MTH 201': '#E879F9',
  'MTH 202': '#C084FC',
  'STA 111': '#93C5FD',
  'STA 112': '#60A5FA',
  'STA 121': '#818CF8',
  'IFT 211': '#FBBF24',
  'IFT 212': '#E879F9',
  'PHY 102': '#60A5FA',
  'PHY 108': '#818CF8',
  'BCM 242': '#F472B6',
  'MLS 161': '#2DD4BF',
  'CHM 101': '#FDBA74',
  'INS 202': '#A3E635',
  'ENT 211': '#C7F800',
  'CLP 211': '#F43F5E',
}

// 'cos202' -> 'COS 202' (plan slugs); 'COS202' -> 'COS 202' (route codes).
export function formatCourseCode(raw) {
  const up = String(raw || '').toUpperCase().replace(/-/g, '')
  return up.replace(/^([A-Z]+)(\d+)$/, '$1 $2')
}

export function courseTitle(code) {
  return COURSE_TITLES[code] || ''
}

export function courseAccent(code) {
  return COURSE_ACCENTS[code] || '#C7F800'
}
