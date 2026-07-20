const COURSES = {
  'GSS 112': { title: 'Peace & Conflict Resolution' },
  'GSS 212': { title: 'Philosophy & Logic' },
  'CSC 101': { title: 'Introduction to Computing' },
  'CSC 102': { title: 'Introduction to Computing' },
  'CSC 162': { title: 'Computer Programming' },
  'CSC 182': { title: 'Data Structures & Algorithms' },
  'CSC 203': { title: 'Discrete Structure' },
  'PHY 102': { title: 'General Physics II' },
  'PHY 108': { title: 'General Physics III' },
  'MTH 101': { title: 'General Mathematics I' },
  'BCM 242': { title: 'Carbohydrate Metabolism' },
}

function getOrigin() {
  const u = process.env.NEXT_PUBLIC_BASE_URL || process.env.FRONTEND_URL
  if (u) return u.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'https://apex-tau-gules.vercel.app'
}

export async function generateMetadata({ params }) {
  const code = (params.code || '').toUpperCase().replace(/-/g, '')
  const formattedCode = code.replace(/^([A-Z]+)(\d+)$/, '$1 $2')
  const course = COURSES[formattedCode] || { title: '' }
  const pageTitle = formattedCode + (course.title ? ` - ${course.title}` : '')
  const origin = getOrigin()
  const ogUrl = `${origin}/api/og?code=${encodeURIComponent(formattedCode)}`
  const pageUrl = `${origin}/courses/${params.code}`

  return {
    title: pageTitle,
    metadataBase: new URL(origin),
    openGraph: {
      title: `${pageTitle} | Apex`,
      description: `Practice ${formattedCode} past questions and theory answers. Ace your exams with Apex!${course.title ? ` ${course.title}` : ''}`,
      url: pageUrl,
      siteName: 'Apex',
      type: 'website',
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${pageTitle} | Apex`,
      description: `Practice ${formattedCode} past questions and theory answers. Ace your exams with Apex!${course.title ? ` ${course.title}` : ''}`,
      images: [ogUrl],
    },
  }
}

export default function Layout({ children }) {
  return children
}
