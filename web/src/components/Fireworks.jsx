import { useEffect, useRef } from 'react'

const COLORS = ['#4285f4', '#ea4335', '#fbbc04', '#34a853', '#ffffff']
const DURATION = 15000 // milliseconds

// A short fireworks show over the page. Plays once, then hides itself.
export default function Fireworks() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)
    const onResize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)

    let sparks = []
    const start = performance.now()
    let lastBurst = 0
    let frame

    function burst() {
      const x = w * (0.15 + Math.random() * 0.7)
      const y = h * (0.15 + Math.random() * 0.4)
      const color = COLORS[Math.floor(Math.random() * COLORS.length)]
      for (let i = 0; i < 80; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 1 + Math.random() * 4.5
        sparks.push({
          x,
          y,
          color,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
        })
      }
    }

    function tick(now) {
      const elapsed = now - start
      ctx.clearRect(0, 0, w, h)

      if (elapsed < DURATION - 1500 && now - lastBurst > 450) {
        burst()
        lastBurst = now
      }

      sparks = sparks.filter((p) => p.life > 0)
      for (const p of sparks) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.05
        p.vx *= 0.985
        p.life -= 0.014
        ctx.globalAlpha = Math.max(p.life, 0)
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      if (elapsed < DURATION || sparks.length) {
        frame = requestAnimationFrame(tick)
      } else {
        canvas.style.display = 'none'
      }
    }

    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 99999,
      }}
    />
  )
}