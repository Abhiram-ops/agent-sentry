"use client";

import { useEffect, useRef } from "react";

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W: number = window.innerWidth, H: number = window.innerHeight;
    type Pt = { x: number; y: number; vx: number; vy: number; r: number };
    let pts: Pt[] = [];
    let raf: number;

    function resize() {
      W = canvas!.width  = window.innerWidth;
      H = canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 70; i++) {
      pts.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.4 + 0.6,
      });
    }

    function draw() {
      ctx!.clearRect(0, 0, W, H);
      for (let a = 0; a < pts.length; a++) {
        const p = pts[a];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(0,255,136,0.55)";
        ctx!.fill();

        for (let b = a + 1; b < pts.length; b++) {
          const q = pts[b];
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < 110) {
            ctx!.beginPath();
            ctx!.moveTo(p.x, p.y);
            ctx!.lineTo(q.x, q.y);
            ctx!.strokeStyle = `rgba(0,255,136,${0.12 * (1 - d / 110)})`;
            ctx!.lineWidth = 0.5;
            ctx!.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", inset: 0,
        width: "100%", height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        opacity: 0.65,
      }}
    />
  );
}
