import { ImageResponse } from 'next/og'
import React from 'react'
import { courseTitle, courseAccent } from '@/lib/course-meta'

const el = (tag, style, ...children) =>
  React.createElement(tag, style ? { style } : null, ...children.flat(Infinity).filter(Boolean))

const txt = (content, style) => el('span', style, content)

function getCourse(code) {
  return courseTitle(code)
}

function hexShade(hex, amt) {
  const h = String(hex || '#130f40').replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const n = (i) => Math.max(0, Math.min(255, parseInt(full.slice(i, i + 2), 16) + amt))
  return `rgb(${n(0)},${n(2)},${n(4)})`
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
    const DEEP = hexShade(ACCENT, -110)
    const MID = hexShade(ACCENT, -60)

    // Same visual language as the downloadable course share card, built
    // ONLY from satori-safe atoms verified in this env (plain centered
    // texts + one CTA box; nested auto-sized boxes crash the renderer).
    const shortTitle = title && title.length > 48 ? title.slice(0, 48).trimEnd() + '…' : title
    return new ImageResponse(
      el('div', {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: DEEP,
        backgroundImage: `linear-gradient(135deg, ${MID} 0%, ${DEEP} 100%)`,
        fontFamily,
        alignItems: 'center',
        justifyContent: 'center',
      },
        txt('APEX', { fontSize: 52, color: '#FFFFFF', letterSpacing: 6, marginBottom: 14 }),
        txt(code, { fontSize: 132, color: ACCENT, lineHeight: 1, marginBottom: 4 }),
        shortTitle
          ? txt(shortTitle.toUpperCase(), { fontSize: 36, color: '#FFFFFF', marginBottom: 20 })
          : null,
        txt('PAST QUESTIONS  ·  THEORY  ·  VIDEOS', { fontSize: 26, color: '#FFFFFF', marginBottom: 34 }),
        el('div', {
          backgroundColor: '#FFFFFF',
          borderRadius: 55,
          paddingTop: 16,
          paddingBottom: 16,
          paddingLeft: 34,
          paddingRight: 34,
          display: 'flex',
          width: 460,
          justifyContent: 'center',
        },
          txt('Study free  →  quiz.apex.app', { fontSize: 30, color: '#111111' }),
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
