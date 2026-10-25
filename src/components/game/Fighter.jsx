'use client'

import { motion } from 'motion/react'

// Articulated mini-fighter: idle bob, punch, kick, hurt knockback, KO fall.
// facing: 1 (looks right) | -1 (looks left, mirrored).
// move: 'idle' | 'punch' | 'kick' | 'hurt' | 'ko'
// Parent drives `move` and returns it to 'idle' after the beat lands.
export default function Fighter({ color = '#3b82f6', dark = '#1e40af', glove = '#f59e0b', facing = 1, horned = false, move = 'idle', size = 120 }) {
  const dir = facing
  const joint = { transformBox: 'fill-box' }

  const armAnim = move === 'punch' ? { x: [0, 22, 0] } : { x: 0 }
  const legAnim = move === 'kick' ? { scaleY: [1, 1.45, 1] } : { scaleY: 1 }
  const jumpAnim = move === 'kick' ? { y: [0, -12, 0] } : { y: 0 }
  const bodyAnim =
    move === 'punch' ? { x: [0, 8, 0] }
    : move === 'hurt' ? { x: [0, -18 * dir, 0], opacity: [1, 0.45, 1] }
    : move === 'ko' ? { rotate: 62 * dir, y: 16, opacity: 0.8 }
    : { x: 0, y: 0, opacity: 1, rotate: 0 }

  const snap = { duration: 0.32, ease: 'easeOut' }

  return (
    <motion.svg
      viewBox="0 0 120 150"
      width={size}
      height={size * 1.25}
      style={{ transform: `scaleX(${facing})` }}
      aria-hidden
    >
      {/* shadow */}
      <ellipse cx="60" cy="142" rx="26" ry="5" fill="black" opacity="0.18" />
      <motion.g animate={jumpAnim} transition={snap}>
        <motion.g
          animate={bodyAnim}
          transition={move === 'ko' ? { duration: 0.5, ease: 'easeIn' } : snap}
          style={{ ...joint, transformOrigin: '50% 100%' }}
        >
          {/* back arm */}
          <rect x="40" y="48" width="24" height="8" rx="4" fill={dark} />
          {/* back leg */}
          <rect x="50" y="88" width="9" height="44" rx="4.5" fill={dark} />
          {/* torso */}
          <rect x="53" y="40" width="17" height="50" rx="7" fill={color} />
          <rect x="53" y="80" width="17" height="7" fill={dark} />
          {/* front leg (kicks) */}
          <motion.g animate={legAnim} transition={snap} style={{ ...joint, transformOrigin: '50% 0%' }}>
            <rect x="63" y="88" width="10" height="42" rx="5" fill={color} />
            <rect x="63" y="124" width="19" height="8" rx="4" fill={dark} />
          </motion.g>
          {/* head */}
          <circle cx="61" cy="26" r="14" fill={color} />
          <rect x="47" y="16" width="28" height="7" rx="3.5" fill={dark} />
          {horned ? (
            <>
              <polygon points="50,16 44,2 56,12" fill="#e5e7eb" />
              <polygon points="72,16 78,2 66,12" fill="#e5e7eb" />
              <circle cx="66" cy="26" r="2.4" fill="#ef4444" />
            </>
          ) : (
            <>
              <circle cx="66" cy="25" r="3" fill="white" />
              <circle cx="67" cy="25" r="1.4" fill="#111827" />
              <rect x="61" y="8" width="5" height="10" rx="2" fill={glove} />
            </>
          )}
          {/* front arm (punches) */}
          <motion.g animate={armAnim} transition={snap} style={{ ...joint, transformOrigin: '0% 50%' }}>
            <rect x="60" y="47" width="28" height="9" rx="4.5" fill={color} />
            <circle cx="89" cy="51" r="7.5" fill={glove} />
          </motion.g>
        </motion.g>
      </motion.g>
    </motion.svg>
  )
}
