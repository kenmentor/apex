import { getBaseUrl } from '@/lib/base-url'
import { formatCourseCode, courseTitle } from '@/lib/course-meta'

function getOrigin() {
  return getBaseUrl()
}

export async function generateMetadata({ params }) {
  const { code: rawCode } = await params
  const formattedCode = formatCourseCode(rawCode)
  const title = courseTitle(formattedCode)
  const pageTitle = formattedCode + (title ? ` - ${title}` : '')
  const origin = getOrigin()
  const ogUrl = `${origin}/api/og?code=${encodeURIComponent(formattedCode)}`
  const pageUrl = `${origin}/courses/${rawCode}`

  return {
    title: pageTitle,
    metadataBase: new URL(origin),
    openGraph: {
      title: `${pageTitle} | Apex`,
      description: `Practice ${formattedCode} past questions and theory answers. Ace your exams with Apex!${title ? ` ${title}` : ''}`,
      url: pageUrl,
      siteName: 'Apex',
      type: 'website',
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${pageTitle} | Apex`,
      description: `Practice ${formattedCode} past questions and theory answers. Ace your exams with Apex!${title ? ` ${title}` : ''}`,
      images: [ogUrl],
    },
  }
}

export default function Layout({ children }) {
  return children
}
