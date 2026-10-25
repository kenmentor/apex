// Shared celebration effect — one standard win moment for every game.
import confetti from 'canvas-confetti'

export function celebrate(big = false) {
  try {
    confetti({
      particleCount: big ? 160 : 90,
      spread: big ? 100 : 70,
      origin: { y: 0.6 },
      ticks: 220,
    })
    if (big) {
      setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } }), 250)
      setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } }), 400)
    }
  } catch {}
}
