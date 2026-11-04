import { getCollection } from '@/lib/db'
import { getBaseUrl } from '@/lib/base-url'
import PublicProfileView from '@/components/PublicProfileView'

async function loadPublicProfile(email) {
  try {
    const users = await getCollection('users')
    const user = await users.findOne({ email: String(email).toLowerCase().trim() })
    if (!user) return null
    let quizzes = 0
    let best = 0
    try {
      const scoresCol = await getCollection('scores')
      const docs = await scoresCol
        .find({ email: String(email).toLowerCase().trim() })
        .project({ percentage: 1 })
        .limit(50)
        .toArray()
      quizzes = docs.length
      if (quizzes) best = Math.max(...docs.map(d => d.percentage || 0))
    } catch {}
    return { user, quizzes, best }
  } catch {
    return null
  }
}

// Shared links unfurl with the user's avatar + achievements.
export async function generateMetadata({ params }) {
  const { email } = await params
  const decoded = decodeURIComponent(email)
  const data = await loadPublicProfile(decoded)
  if (!data) return { title: 'Profile not found' }
  const { user, quizzes, best } = data
  const name = user.name || 'Anonymous'
  const handle = `@${String(user.email || decoded).split('@')[0].toLowerCase()}`
  const bits = [`${quizzes} ${quizzes === 1 ? 'quiz' : 'quizzes'}`]
  if (quizzes) bits.push(`Best ${best}%`)
  if (user.school) bits.push(user.school)
  const description = bits.join(' · ')
  const avatar = user.avatar && String(user.avatar).startsWith('http')
    ? user.avatar
    : `${getBaseUrl()}/white-logo.png`
  const title = `${name} (${handle})`
  return {
    title,
    description,
    openGraph: {
      title: `${name} on Apex`,
      description,
      images: [{ url: avatar }],
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title: `${name} on Apex`,
      description,
      images: [avatar],
    },
  }
}

export default async function PublicProfilePage({ params }) {
  const { email } = await params
  return <PublicProfileView email={email} />
}
