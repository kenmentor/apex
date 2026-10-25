import { ImageResponse } from 'next/og'
import React from 'react'

const el = (tag, style, ...children) =>
  React.createElement(tag, style ? { style } : null, ...children.flat(Infinity).filter(Boolean))

const txt = (content, style) => el('span', style, content)

function getCourse(code) {
  const known = {
    'GSS 112': 'Peace & Conflict',
    'GSS 212': 'Philosophy & Logic',
    'GSS 101': 'Citizenship Education',
    'GST 112': 'Nigerian People & Culture',
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
    'MLS 161': 'MLS & Lab Safety',
    'IFT 212': 'Information Technology',
    'CHM 101': 'General Chemistry I',
    'STA 111': 'Intro to Statistics',
    'COS 202': 'Computer Science',
    'INS 202': 'Insurance',
    'ENT 211': 'Entrepreneurship & Innovation',
    'CLP 211': 'Chemical Pathology',
  }
  return known[code] || ''
}

// Each course gets its own accent color so shared links are instantly distinguishable.
const ACCENTS = {
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
  'PHY 102': '#60A5FA',
  'PHY 108': '#818CF8',
  'MTH 101': '#FACC15',
  'BCM 242': '#F472B6',
  'MLS 161': '#2DD4BF',
  'IFT 212': '#E879F9',
  'CHM 101': '#FDBA74',
  'STA 111': '#93C5FD',
  'COS 202': '#D8B4FE',
  'INS 202': '#A3E635',
  'ENT 211': '#C7F800',
  'CLP 211': '#F43F5E',
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
    const ACCENT = ACCENTS[code] || '#C7F800'
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
