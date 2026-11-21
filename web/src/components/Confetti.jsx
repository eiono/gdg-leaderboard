// web/src/components/Confetti.jsx
import React, { useEffect, useRef } from 'react';

const COLORS = ['#4285f4', '#ea4335', '#fbbc04', '#34a853', '#ffd700', '#ffffff'];
const MAX_PARTICLES = 120;

export default function Confetti({ active, reducedMotion = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active || reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = null;
    let particles = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    // Spawn a firework burst at (x, y)
    const spawnFirework = (x, y, count = 28) => {
      for (let i = 0; i < count; i += 1) {
        if (particles.length >= MAX_PARTICLES) break;
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.2;
        const speed = 2.5 + Math.random() * 4.5;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          size: 4 + Math.random() * 4,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          alpha: 1,
          decay: 0.014 + Math.random() * 0.01,
          gravity: 0.08,
          shape: Math.random() > 0.4 ? 'rect' : 'circle',
          rotation: Math.random() * 360,
          vRot: (Math.random() - 0.5) * 10,
        });
      }
    };

    // Initial bursts above the podium
    const w = window.innerWidth;
    const h = window.innerHeight;
    spawnFirework(w * 0.5, h * 0.28, 38);
    const burstTimer1 = setTimeout(() => spawnFirework(w * 0.28, h * 0.35, 28), 350);
    const burstTimer2 = setTimeout(() => spawnFirework(w * 0.72, h * 0.35, 28), 650);

    const render = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.985;
        p.alpha -= p.decay;
        p.rotation += p.vRot;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (particles.length > 0) {
        rafId = requestAnimationFrame(render);
      }
    };

    rafId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      clearTimeout(burstTimer1);
      clearTimeout(burstTimer2);
      if (rafId) cancelAnimationFrame(rafId);
      particles = [];
    };
  }, [active, reducedMotion]);

  if (!active || reducedMotion) return null;

  return <canvas ref={canvasRef} className="race-confetti-canvas" aria-hidden="true" />;
}