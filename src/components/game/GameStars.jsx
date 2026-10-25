'use client'

import { motion } from 'motion/react'

// Animated star rating — the standard win visual for every game.
// count: 0..3 filled stars, staggered spring pop.
export default function GameStars({ count = 0, size = 'text-3xl' }) {
  return (
    <div className={`flex items-center justify-center gap-1 ${size}`} aria-label={`${count} of 3 stars`}>
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.15 + i * 0.15 }}
          className={i < count ? 'text-amber-400 drop-shadow-[0_2px_6px_rgba(251,191,36,0.5)]' : 'opacity-25'}
        >
          ★
        </motion.span>
      ))}
    </div>
  )
}
