import { ImageResponse } from 'next/og'
import React from 'react'

export const runtime = 'edge'

const el = (tag, style, ...children) =>
  React.createElement(tag, style ? { style } : null, ...children.flat(Infinity).filter(Boolean))

const txt = (content, style) => el('span', style, content)

function getCourse(code) {
  const known = {
    'GSS 112': 'Peace & Conflict',
    'GSS 212': 'Philosophy & Logic',
    'CSC 101': 'Intro to Computing',
    'CSC 102': 'Intro to Computing',
    'CSC 162': 'Comp Programming',
    'CSC 182': 'Data Structures',
    'CSC 203': 'Discrete Structure',
    'CSC 282': 'Java OOP',
    'PHY 102': 'General Physics II',
    'PHY 108': 'General Physics III',
    'MTH 101': 'General Maths I',
    'BCM 242': 'Carb. Metabolism',
  }
  return known[code] || ''
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
    const GREEN = '#C7F800'

    return new ImageResponse(
      el('div', {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: BG,
        fontFamily,
        textTransform: 'uppercase',
        textAlign: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 40px',
        lineHeight: 1,
      },
        txt('PRACTICE', {
          fontSize: 64,
          color: '#FFFFFF',
          letterSpacing: 2,
        }),
        txt(code, {
          fontSize: 200,
          color: GREEN,
          letterSpacing: -4,
          lineHeight: 0.9,
          marginTop: -8,
        }),
        txt('QUESTIONS', {
          fontSize: 160,
          color: GREEN,
          letterSpacing: -3,
          lineHeight: 0.85,
          marginTop: -12,
        }),
        title
          ? txt(title, {
              fontSize: 28,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: 4,
              marginTop: 6,
            })
          : null,
        el('div', {
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginTop: 16,
        },
          el('div', { width: 60, height: 3, background: GREEN }),
          txt('Practice Today.', { fontSize: 32, color: '#FFFFFF', letterSpacing: 1 }),
          txt('Score Higher.', { fontSize: 32, color: GREEN, letterSpacing: 1 }),
          el('div', { width: 60, height: 3, background: GREEN }),
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
