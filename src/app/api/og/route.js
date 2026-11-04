import { ImageResponse } from 'next/og'
import React from 'react'
import { courseTitle, courseAccent } from '@/lib/course-meta'

const el = (tag, style, ...children) =>
  React.createElement(tag, style ? { style } : null, ...children.flat(Infinity).filter(Boolean))

const txt = (content, style) => el('span', style, content)

function getCourse(code) {
  return courseTitle(code)
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '')
  const num = parseInt(h, 16)
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code') || 'GSS 112'
    const title = getCourse(code)

    const [antonResponse] = await Promise.all([
      fetch('https://fonts.googleapis.com/css2?family=Anton&display=swap'),
    ])
    const css = await antonResponse.text()
    const match = css.match(/url\(([^)]+)\)/)
    let fontData = null
    if (match) {
      const resp = await fetch(match[1])
      fontData = await resp.arrayBuffer()
    }

    const fontFamily = fontData ? 'Anton' : 'system-ui'

    const BG = '#020B22'
    const ACCENT = courseAccent(code)
    const GLOW = hexToRgba(ACCENT, 0.22)

    return new ImageResponse(
      el('div', {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: BG,
        backgroundImage: `radial-gradient(circle at 50% 18%, ${GLOW} 0%, transparent 62%)`,
        fontFamily,
        textTransform: 'uppercase',
        textAlign: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 40px',
        lineHeight: 1,
      },
        txt('PRACTICE', {
          fontSize: 60,
          color: '#FFFFFF',
          letterSpacing: 2,
          marginBottom: 8,
        }),
        txt(code, {
          fontSize: 180,
          color: ACCENT,
          letterSpacing: -2,
          marginBottom: 4,
        }),
        txt('QUESTIONS', {
          fontSize: 130,
          color: ACCENT,
          letterSpacing: -2,
          marginBottom: 10,
        }),
        title
          ? txt(title, {
              fontSize: 26,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: 4,
              marginBottom: 6,
            })
          : null,
        el('div', {
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        },
          el('div', { width: 50, height: 3, background: ACCENT }),
          txt('Practice Today.', { fontSize: 28, color: '#FFFFFF', letterSpacing: 1 }),
          txt('Score Higher.', { fontSize: 28, color: ACCENT, letterSpacing: 1 }),
          el('div', { width: 50, height: 3, background: ACCENT }),
        ),
      ),
      {
        width: 1200,
        height: 630,
        fonts: fontData ? [{ name: 'Anton', data: fontData, weight: 400, style: 'normal' }] : [],
      }
    )
  } catch (e) {
    return new Response(e.message, { status: 500 })
  }
}
