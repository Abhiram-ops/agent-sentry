"use client";

import { useEffect, useRef } from "react";

interface Dot {
  x: number; y: number;
  vx: number; vy: number;
  r: number; a: number;
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let W = 0, H = 0;
    let dots: Dot[] = [];

    const resize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };

    const mkDot = (): Dot => ({
      x:  Math.random() * W,
      y:  Math.random() * H,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r:  Math.random() * 1.0 + 0.3,
      a:  Math.random() * 0.4 + 0.1,
    });

    const init = () => {
      resize();
      const n = Math.min(80, Math.floor(W * H / 18000));
      dots = Array.from({ length: n }, mkDot);
    };

    const draw = () => {
      animId = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, W, H);

      for (let i = 0; i < dots.length; i++) {
        const p = dots[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

        // dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,255,136,${p.a * 0.22})`;
        ctx.fill();

        // connecting lines
        for (let j = i + 1; j < dots.length; j++) {
          const q = dots[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 140) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(0,255,136,${(1 - d / 140) * 0.048})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
    };

    window.addEventListener("resize", init);
    init();
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", init);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", inset: 0,
        width: "100%", height: "100%",
        pointerEvents: "none", zIndex: 0,
        opacity: 0.65,
      }}
    />
  );
}
