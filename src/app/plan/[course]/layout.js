import { getBaseUrl } from '@/lib/base-url'
import { formatCourseCode, courseTitle } from '@/lib/course-meta'

export async function generateMetadata({ params }) {
  const { course: slug } = await params
  const formattedCode = formatCourseCode(slug)
  const title = courseTitle(formattedCode)
  const pageTitle = formattedCode + (title ? ` - ${title}` : '')
  const origin = getBaseUrl().replace(/\/+$/, '')
  const ogUrl = `${origin}/api/og?code=${encodeURIComponent(formattedCode)}`
  const pageUrl = `${origin}/plan/${slug}`

  return {
    title: pageTitle,
    metadataBase: new URL(origin),
    openGraph: {
      title: `${pageTitle} | Apex`,
      description: `Study ${formattedCode}${title ? ` ${title}` : ''}: videos, notes and quizzes on Apex. Ace your exams!`,
      url: pageUrl,
      siteName: 'Apex',
      type: 'website',
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${pageTitle} | Apex`,
      description: `Study ${formattedCode}${title ? ` ${title}` : ''}: videos, notes and quizzes on Apex. Ace your exams!`,
      images: [ogUrl],
    },
  }
}

export default function Layout({ children }) {
  return children
}
