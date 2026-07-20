import { ImageResponse } from 'next/og'

export const runtime = 'edge'

const COURSES = {
  'GSS 112': { title: 'Peace & Conflict Resolution', color: '#130f40', emoji: '🕊️' },
  'GSS 212': { title: 'Philosophy & Logic', color: '#130f40', emoji: '🧠' },
  'CSC 101': { title: 'Introduction to Computing', color: '#1a5276', emoji: '💻' },
  'CSC 102': { title: 'Introduction to Computing', color: '#1a5276', emoji: '💻' },
  'CSC 162': { title: 'Computer Programming', color: '#1a5276', emoji: '💻' },
  'CSC 182': { title: 'Data Structures & Algorithms', color: '#1a5276', emoji: '📊' },
  'CSC 203': { title: 'Discrete Structure', color: '#1a5276', emoji: '🔢' },
  'PHY 102': { title: 'General Physics II', color: '#c0392b', emoji: '⚡' },
  'PHY 108': { title: 'General Physics III', color: '#c0392b', emoji: '🔬' },
  'MTH 101': { title: 'General Mathematics I', color: '#7d3c98', emoji: '📐' },
  'BCM 242': { title: 'Carbohydrate Metabolism', color: '#e74c3c', emoji: '🧬' },
}

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16) }
}

function lighten(hex, pct) {
  const { r, g, b } = hexToRgb(hex)
  const f = (c) => Math.min(255, Math.round(c + (255 - c) * pct))
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code') || 'GSS 112'
  const course = COURSES[code] || { title: '', color: '#130f40', emoji: '📚' }
  const color = course.color
  const bright = lighten(color, 0.08)

  const prefix = code.split(/\s/)[0]
  const number = code.split(/\s/)[1] || ''

  return new ImageResponse(
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      background: `linear-gradient(135deg, ${color} 0%, ${bright} 40%, ${color} 100%)`,
      position: 'relative', overflow: 'hidden', fontFamily: 'system-ui',
    }}>
      {/* Decorative circles */}
      <div style={{ position: 'absolute', top: -80, right: -60, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
      <div style={{ position: 'absolute', bottom: -100, left: -80, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
      <div style={{ position: 'absolute', top: '30%', right: '10%', width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

      {/* Decorative dots pattern */}
      <div style={{ position: 'absolute', top: 40, left: 40, display: 'flex', gap: 8 }}>
        {[1,2,3].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />)}
      </div>

      {/* Sparkle decorations */}
      <div style={{ position: 'absolute', top: 60, right: 100, fontSize: 28, opacity: 0.4 }}>✦</div>
      <div style={{ position: 'absolute', bottom: 80, left: 120, fontSize: 20, opacity: 0.3 }}>✦</div>

      {/* Header badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'absolute', top: 28, left: 40 }}>
        <span style={{ fontSize: 24, lineHeight: 1 }}>📚</span>
        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase' }}>APEX</span>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 60px' }}>
        {/* Course emoji */}
        <div style={{ fontSize: 56, marginBottom: 4 }}>{course.emoji}</div>

        {/* Course code - massive */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: 96, fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: -2 }}>{prefix}</span>
          <span style={{ fontSize: 80, fontWeight: 900, color: 'rgba(255,255,255,0.7)', lineHeight: 1, letterSpacing: -1 }}>{number}</span>
        </div>

        {/* Course title */}
        {course.title && (
          <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.85)', fontWeight: 500, marginTop: 6, letterSpacing: -0.5 }}>
            {course.title}
          </div>
        )}

        {/* Available now highlight bar */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 20,
          background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: '10px 22px',
          backdropFilter: 'blur(8px)',
        }}>
          <span style={{ fontSize: 22 }}>📖</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: 'white', letterSpacing: -0.3 }}>
            Past Questions & Theory Now Available!
          </span>
          <span style={{ fontSize: 18 }}>✨</span>
        </div>

        {/* Question count bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginTop: 12,
          color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: 500,
        }}>
          <span>✅ Practice Quizzes</span>
          <span style={{ margin: '0 6px', opacity: 0.4 }}>•</span>
          <span>📝 Theory Answers</span>
          <span style={{ margin: '0 6px', opacity: 0.4 }}>•</span>
          <span>🏆 Leaderboard</span>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px 28px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 20 }}>🔥</span>
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16, fontWeight: 600, letterSpacing: 0.5 }}>
            Ace Your Exams
          </span>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.95)', color, fontWeight: 700,
          padding: '8px 20px', borderRadius: 10, fontSize: 15, letterSpacing: 0.3,
        }}>
          Start Now →
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 }
  )
}
