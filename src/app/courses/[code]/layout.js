import { getCollection } from '@/lib/db'

export async function generateMetadata({ params }) {
  const code = (params.code || '').toUpperCase().replace(/-/g, '')
  const formattedCode = code.replace(/^([A-Z]+)(\d+)$/, '$1 $2')

  let title = formattedCode
  let courseTitle = ''
  try {
    const coursesCol = await getCollection('courses')
    const course = await coursesCol.findOne({ code: formattedCode })
    if (course) {
      courseTitle = course.title || ''
      title = `${formattedCode} - ${course.title}`
    }
  } catch {
    title = formattedCode
  }

  const ogUrl = `/api/og?code=${encodeURIComponent(formattedCode)}`

  return {
    title,
    openGraph: {
      title: `${title} | Apex`,
      description: `Practice ${formattedCode} past questions and theory answers. Ace your exams with Apex!${courseTitle ? ` ${courseTitle}` : ''}`,
      siteName: 'Apex',
      type: 'website',
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Apex`,
      description: `Practice ${formattedCode} past questions and theory answers. Ace your exams with Apex!${courseTitle ? ` ${courseTitle}` : ''}`,
      images: [ogUrl],
    },
  }
}

export default function Layout({ children }) {
  return children
}
