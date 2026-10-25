'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import kaplay from 'kaplay'

// Boss-worthy 2D arena (Kaplay engine): night coliseum staging, armored
// knight with sword vs winged horned demon, slash arcs, dust, torches,
// knockback, camera shake, KO slam. Ref API: hit(side, big), ko(loser), reset().
const W = 640
const H = 360
const GROUND_Y = 312

const FightArena = forwardRef(function FightArena(_, ref) {
  const boxRef = useRef(null)
  const apiRef = useRef(null)

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    box.innerHTML = ''
    const canvas = document.createElement('canvas')
    // Compact strip, whole scene always in frame: aspect comes from the
    // canvas attributes, so max-height + auto width scales it uniformly.
    // !important: the engine rewrites canvas styles on resize — this wins.
    const sizeCanvas = () => {
      canvas.style.setProperty('width', 'auto', 'important')
      canvas.style.setProperty('max-width', '100%', 'important')
      canvas.style.setProperty('height', 'auto', 'important')
      canvas.style.setProperty('max-height', '168px', 'important')
      canvas.style.setProperty('display', 'block', 'important')
      canvas.style.setProperty('margin', '0 auto', 'important')
      canvas.style.setProperty('border-radius', '0.75rem', 'important')
      canvas.style.setProperty('background', '#0d0d1a', 'important')
    }
    sizeCanvas()
    box.appendChild(canvas)
    let k = null
    try {
      k = kaplay({ canvas, width: W, height: H, background: [13, 13, 26] })
    } catch {
      box.innerHTML = '<p style="color:#888;font-size:12px;padding:24px;text-align:center">Arena failed to load — the fight still counts below.</p>'
      return
    }
    sizeCanvas()
    window.addEventListener('resize', sizeCanvas)

    // ── Night coliseum backdrop ──
    const sky = [[26, 22, 54], [22, 19, 47], [18, 16, 40], [15, 14, 34], [13, 13, 28]]
    sky.forEach((c, i) => k.add([k.rect(W, 62), k.pos(W / 2, 31 + i * 62), k.anchor('center'), k.color(...c)]))
    k.add([k.circle(34), k.pos(520, 66), k.anchor('center'), k.color(235, 230, 200)])
    k.add([k.circle(46), k.pos(520, 66), k.anchor('center'), k.color(235, 230, 200), k.opacity(0.15)])
    // Pillars + torches.
    let flames = []
    for (const px of [36, W - 36]) {
      k.add([k.rect(30, 190), k.pos(px, 190), k.anchor('center'), k.color(52, 48, 80)])
      k.add([k.rect(44, 12), k.pos(px, 100), k.anchor('center'), k.color(70, 65, 100)])
      k.add([k.rect(44, 12), k.pos(px, 282), k.anchor('center'), k.color(70, 65, 100)])
      const flame = k.add([k.circle(9), k.pos(px, 84), k.anchor('center'), k.color(251, 146, 60), k.scale(1), k.z(2)])
      const glow = k.add([k.circle(20), k.pos(px, 84), k.anchor('center'), k.color(251, 146, 60), k.opacity(0.25), k.scale(1), k.z(1)])
      flame.flicker = Math.random() * 6
      glow.flicker = flame.flicker
      flames.push({ flame, glow })
    }
    // Ground + edge.
    k.add([k.rect(W, 52), k.pos(W / 2, H - 26), k.anchor('center'), k.color(34, 32, 54)])
    k.add([k.rect(W, 6), k.pos(W / 2, GROUND_Y), k.anchor('center'), k.color(90, 80, 130)])

    function makeKnight(x) {
      const steel = [148, 163, 184], dark = [51, 65, 85], gold = [245, 158, 11]
      const P = []
      const put = (o, bx, by) => { o.baseX = bx; o.baseY = by; P.push(o); return o }
      // Cape (behind).
      put(k.add([k.polygon([k.vec2(-4, 0), k.vec2(-30, 86), k.vec2(-2, 88)]), k.pos(x - 14, 196), k.anchor('center'), k.color(30, 58, 138)]), x - 14, 196)
      // Boots + greaves.
      put(k.add([k.rect(13, 14), k.pos(x - 9, 296), k.anchor('center'), k.color(...dark)]), x - 9, 296)
      put(k.add([k.rect(13, 14), k.pos(x + 11, 296), k.anchor('center'), k.color(...dark)]), x + 11, 296)
      put(k.add([k.rect(11, 40), k.pos(x - 9, 270), k.anchor('center'), k.color(...steel)]), x - 9, 270)
      const legF = put(k.add([k.rect(12, 40), k.pos(x + 11, 270), k.anchor('center'), k.color(...steel)]), x + 11, 270)
      // Cuirass + emblem + belt.
      put(k.add([k.rect(44, 58, { radius: 12 }), k.pos(x, 218), k.anchor('center'), k.color(...steel)]), x, 218)
      put(k.add([k.circle(7), k.pos(x, 214), k.anchor('center'), k.color(...gold)]), x, 214)
      put(k.add([k.rect(44, 9), k.pos(x, 244), k.anchor('center'), k.color(...dark)]), x, 244)
      // Pauldrons.
      put(k.add([k.circle(11), k.pos(x - 22, 196), k.anchor('center'), k.color(...dark)]), x - 22, 196)
      put(k.add([k.circle(11), k.pos(x + 22, 196), k.anchor('center'), k.color(...dark)]), x + 22, 196)
      // Shield arm (back).
      put(k.add([k.rect(20, 10, { radius: 5 }), k.pos(x - 24, 214), k.anchor('center'), k.color(...dark)]), x - 24, 214)
      put(k.add([k.circle(14), k.pos(x - 34, 224), k.anchor('center'), k.color(30, 58, 138)]), x - 34, 224)
      put(k.add([k.circle(5), k.pos(x - 34, 224), k.anchor('center'), k.color(...gold)]), x - 34, 224)
      // Sword arm (front) — group origin at shoulder for thrusts.
      const arm = k.add([k.rect(26, 10, { radius: 5 }), k.pos(x + 24, 210), k.anchor('center'), k.color(...steel)])
      const blade = k.add([k.rect(52, 7, { radius: 3 }), k.pos(x + 62, 210), k.anchor('center'), k.color(226, 232, 240)])
      const tip = k.add([k.polygon([k.vec2(0, -4), k.vec2(12, 0), k.vec2(0, 4)]), k.pos(x + 94, 210), k.anchor('center'), k.color(226, 232, 240)])
      const guard = k.add([k.rect(6, 20, { radius: 3 }), k.pos(x + 38, 210), k.anchor('center'), k.color(...gold)])
      const sword = { arm, blade, tip, guard }
      for (const o of [arm, blade, tip, guard]) put(o, o.pos.x, o.pos.y)
      // Helm + plume + eyes.
      put(k.add([k.circle(17), k.pos(x, 172), k.anchor('center'), k.color(...steel)]), x, 172)
      put(k.add([k.rect(30, 6, { radius: 3 }), k.pos(x, 162), k.anchor('center'), k.color(...dark)]), x, 162)
      put(k.add([k.rect(7, 16, { radius: 3 }), k.pos(x - 2, 150), k.anchor('center'), k.color(220, 38, 38)]), x - 2, 150)
      put(k.add([k.circle(3.4), k.pos(x + 7, 172), k.anchor('center'), k.color(255, 255, 255)]), x + 7, 172)
      put(k.add([k.circle(1.6), k.pos(x + 8, 172), k.anchor('center'), k.color(17, 24, 39)]), x + 8, 172)
      return { parts: P, sword, x, dir: 1, dx: 0, bob: 0, wingL: null, wingR: null }
    }

    function makeDemon(x) {
      const hide = [153, 27, 27], dark = [69, 10, 10], bone = [229, 231, 235], glow = [239, 68, 68]
      const P = []
      const put = (o, bx, by) => { o.baseX = bx; o.baseY = by; P.push(o); return o }
      // Wings (flap in onUpdate).
      const wingL = put(k.add([k.polygon([k.vec2(0, 0), k.vec2(-64, -26), k.vec2(-52, 22), k.vec2(-14, 14)]), k.pos(x - 16, 190), k.anchor('center'), k.rotate(-12), k.color(88, 20, 28)]), x - 16, 190)
      const wingR = put(k.add([k.polygon([k.vec2(0, 0), k.vec2(64, -26), k.vec2(52, 22), k.vec2(14, 14)]), k.pos(x + 16, 190), k.anchor('center'), k.rotate(12), k.color(88, 20, 28)]), x + 16, 190)
      // Tail.
      put(k.add([k.polygon([k.vec2(0, 0), k.vec2(34, 18), k.vec2(30, 30), k.vec2(2, 12)]), k.pos(x + 20, 276), k.anchor('center'), k.color(...dark)]), x + 20, 276)
      // Legs + claws.
      put(k.add([k.rect(15, 42), k.pos(x - 12, 272), k.anchor('center'), k.color(...dark)]), x - 12, 272)
      put(k.add([k.rect(15, 42), k.pos(x + 12, 272), k.anchor('center'), k.color(...dark)]), x + 12, 272)
      // Bulk torso + spikes.
      put(k.add([k.rect(58, 66, { radius: 16 }), k.pos(x, 220), k.anchor('center'), k.color(...hide)]), x, 220)
      for (const sx of [-20, 0, 20]) put(k.add([k.polygon([k.vec2(-7, 0), k.vec2(0, -14), k.vec2(7, 0)]), k.pos(x + sx, 190), k.anchor('center'), k.color(...bone)]), x + sx, 190)
      // Claw arms.
      put(k.add([k.rect(22, 12, { radius: 6 }), k.pos(x + 30, 216), k.anchor('center'), k.color(...dark)]), x + 30, 216)
      const claw = put(k.add([k.polygon([k.vec2(0, -8), k.vec2(20, -2), k.vec2(0, 8)]), k.pos(x - 34, 214), k.anchor('center'), k.color(...bone)]), x - 34, 214)
      put(k.add([k.rect(22, 12, { radius: 6 }), k.pos(x - 22, 214), k.anchor('center'), k.color(...hide)]), x - 22, 214)
      // Horned head + burning eyes.
      put(k.add([k.circle(19), k.pos(x, 168), k.anchor('center'), k.color(...hide)]), x, 168)
      put(k.add([k.polygon([k.vec2(-12, 0), k.vec2(-20, -22), k.vec2(-2, -6)]), k.pos(x - 10, 154), k.anchor('center'), k.color(...bone)]), x - 10, 154)
      put(k.add([k.polygon([k.vec2(12, 0), k.vec2(20, -22), k.vec2(2, -6)]), k.pos(x + 10, 154), k.anchor('center'), k.color(...bone)]), x + 10, 154)
      put(k.add([k.circle(3.6), k.pos(x - 7, 168), k.anchor('center'), k.color(...glow)]), x - 7, 168)
      put(k.add([k.circle(3.6), k.pos(x + 7, 168), k.anchor('center'), k.color(...glow)]), x + 7, 168)
      return { parts: P, sword: null, claw, x, dir: -1, dx: 0, bob: 2.4, wingL, wingR }
    }

    const player = makeKnight(185)
    const boss = makeDemon(455)
    const fighters = { player, boss }
    let fx = []

    k.onUpdate(() => {
      const t = k.time()
      for (const f of [player, boss]) {
        const bob = Math.sin(t * 3 + f.bob) * 4
        for (const p of f.parts) p.pos.y = p.baseY + bob + (f.sink || 0)
      }
      if (boss.wingL) {
        const flap = Math.sin(t * 4.2) * 0.35
        boss.wingL.angle = -12 + flap * 20
        boss.wingR.angle = 12 - flap * 20
      }
      for (const f of flames) {
        const s = 1 + Math.sin(t * 11 + f.flame.flicker) * 0.18
        f.flame.scale = k.vec2(s, s * 1.25)
        f.glow.opacity = 0.2 + Math.abs(Math.sin(t * 11 + f.flame.flicker)) * 0.12
      }
    })

    function setDX(f, v) {
      f.dx = v
      for (const p of f.parts) p.pos.x = p.baseX + v
    }

    function burst(at, big) {
      fx.push(k.addKaboom(at, { scale: big ? 2.4 : 1.3 }))
      fx.push(k.add([k.circle(big ? 30 : 22), k.pos(at), k.anchor('center'), k.color(255, 255, 255), k.opacity(0.75), k.lifespan(0.14), k.z(10)]))
      // Slash arc.
      const arc = k.add([k.rect(84, 14, { radius: 7 }), k.pos(at), k.anchor('center'), k.rotate(-28), k.color(254, 243, 199), k.opacity(0.9), k.lifespan(0.18), k.z(9)])
      fx.push(arc)
    }

    function dust(x, dir) {
      for (let i = 0; i < 5; i++) {
        const d = k.add([k.circle(3 + Math.random() * 3), k.pos(x - dir * (10 + Math.random() * 20), GROUND_Y - 4), k.anchor('center'), k.color(120, 110, 150), k.opacity(0.7), k.lifespan(0.35), k.move(dir > 0 ? 180 : 0, 50 + Math.random() * 40)])
        fx.push(d)
      }
    }

    apiRef.current = {
      hit(attacker, big = false) {
        const A = fighters[attacker]
        const V = fighters[attacker === 'player' ? 'boss' : 'player']
        if (!A || !V) return
        const lunge = 58 * A.dir
        dust(A.x + A.dx, A.dir)
        k.tween(0, lunge, 0.12, v => setDX(A, v), k.easings.easeOut)
        k.wait(0.1, () => {
          burst(V.parts[4].pos.clone(), big)
          k.shake(big ? 14 : 7)
          const away = attacker === 'player' ? 1 : -1
          k.tween(0, 36 * away, 0.12, v => setDX(V, v), k.easings.easeOut)
          k.wait(0.12, () => k.tween(36 * away, 0, 0.25, v => setDX(V, v), k.easings.easeOut))
        })
        k.wait(0.12, () => k.tween(lunge, 0, 0.22, v => setDX(A, v), k.easings.easeOut))
      },
      ko(loser) {
        const L = fighters[loser]
        if (!L) return
        L.sink = 0
        burst(L.parts[4].pos.clone(), true)
        k.shake(18)
        k.tween(0, 78, 0.55, v => { L.sink = v }, k.easings.easeIn)
        const text = k.add([k.text('K.O.!', { size: 72 }), k.pos(W / 2, 130), k.anchor('center'), k.color(239, 68, 68), k.scale(0.3), k.z(20)])
        k.tween(k.vec2(0.3, 0.3), k.vec2(1.15, 1.15), 0.35, v => { text.scale = v }, k.easings.easeOut)
        fx.push(text)
      },
      reset() {
        for (const o of fx) { try { k.destroy(o) } catch {} }
        fx = []
        for (const f of [player, boss]) {
          f.sink = 0
          setDX(f, 0)
          for (const p of f.parts) { p.pos.y = p.baseY; try { p.opacity = 1 } catch {} }
        }
      },
    }

    return () => {
      apiRef.current = null
      try { window.removeEventListener('resize', sizeCanvas) } catch {}
      try { k?.quit() } catch {}
      try { box.innerHTML = '' } catch {}
    }
  }, [])

  useImperativeHandle(ref, () => ({
    hit: (attacker, big) => apiRef.current?.hit(attacker, big),
    ko: loser => apiRef.current?.ko(loser),
    reset: () => apiRef.current?.reset(),
  }))

  return <div ref={boxRef} className="w-full" />
})

export default FightArena
