'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BulletState {
  from: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  progress: number;
  done: boolean;
  id: number;
}

interface Spark {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  size: number;
  color: string;
}

export default function PageLoader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'shield' | 'tagline' | 'out'>('shield');
  const [visible, setVisible] = useState(true);
  const [displayText, setDisplayText] = useState('');
  const animFrameRef = useRef<number>(0);

  const tagline = "Find every Machine's Identity before they do.";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const drawShield = (
      cx: number, cy: number,
      scale: number, _rotY: number, glowAlpha: number, hitFlash: number
    ) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      const s = 90;

      const glow = ctx.createRadialGradient(0, 0, s * 0.3, 0, 0, s * 1.4);
      glow.addColorStop(0, `rgba(0,255,136,${0.18 + glowAlpha * 0.4})`);
      glow.addColorStop(1, 'rgba(0,255,136,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.72, -s * 0.55);
      ctx.lineTo(s * 0.72, s * 0.1);
      ctx.quadraticCurveTo(s * 0.72, s * 0.9, 0, s * 1.15);
      ctx.quadraticCurveTo(-s * 0.72, s * 0.9, -s * 0.72, s * 0.1);
      ctx.lineTo(-s * 0.72, -s * 0.55);
      ctx.closePath();

      const bodyGrad = ctx.createLinearGradient(0, -s, 0, s);
      bodyGrad.addColorStop(0, '#0a2a1a');
      bodyGrad.addColorStop(0.5, '#0d3d24');
      bodyGrad.addColorStop(1, '#051a10');
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      ctx.strokeStyle = `rgba(0,255,136,${0.85 + hitFlash * 0.15})`;
      ctx.lineWidth = 3.5 + hitFlash * 4;
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 18 + hitFlash * 30;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.moveTo(0, -s + 12);
      ctx.lineTo(s * 0.6, -s * 0.5 + 8);
      ctx.lineTo(s * 0.6, s * 0.05);
      ctx.quadraticCurveTo(s * 0.6, s * 0.75, 0, s * 0.95);
      ctx.quadraticCurveTo(-s * 0.6, s * 0.75, -s * 0.6, s * 0.05);
      ctx.lineTo(-s * 0.6, -s * 0.5 + 8);
      ctx.closePath();
      ctx.strokeStyle = `rgba(0,255,136,${0.22 + hitFlash * 0.3})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = `rgba(0,255,136,${0.65 + hitFlash * 0.35})`;
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 10 + hitFlash * 20;
      ctx.font = `bold ${Math.round(s * 0.7)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⬡', 0, s * 0.05);
      ctx.shadowBlur = 0;

      if (hitFlash > 0.01) {
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.72, -s * 0.55);
        ctx.lineTo(s * 0.72, s * 0.1);
        ctx.quadraticCurveTo(s * 0.72, s * 0.9, 0, s * 1.15);
        ctx.quadraticCurveTo(-s * 0.72, s * 0.9, -s * 0.72, s * 0.1);
        ctx.lineTo(-s * 0.72, -s * 0.55);
        ctx.closePath();
        ctx.fillStyle = `rgba(0,255,136,${hitFlash * 0.35})`;
        ctx.fill();
      }

      ctx.restore();
    };

    let t = 0;
    let shieldScale = 0;
    let glowPulse = 0;
    let hitFlash = 0;
    let screenShakeX = 0;
    let screenShakeY = 0;

    const bullets: BulletState[] = [];
    const sparks: Spark[] = [];
    let nextBulletId = 0;

    const bulletSchedule = [
      { t: 0.9,  fromAngle: 220, dist: 600 },
      { t: 1.55, fromAngle: 340, dist: 550 },
      { t: 2.1,  fromAngle: 130, dist: 580 },
      { t: 2.65, fromAngle: 30,  dist: 600 },
    ];
    let scheduledIdx = 0;

    const spawnBullet = (fromAngle: number, dist: number) => {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const rad = (fromAngle * Math.PI) / 180;
      bullets.push({
        id: nextBulletId++,
        from: { x: cx + Math.cos(rad) * dist, y: cy + Math.sin(rad) * dist, z: 0 },
        target: { x: cx + (Math.random() - 0.5) * 60, y: cy + (Math.random() - 0.5) * 60, z: 0 },
        progress: 0,
        done: false,
      });
    };

    const spawnSparks = (x: number, y: number) => {
      for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 5;
        sparks.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          life: 1,
          size: 1.5 + Math.random() * 3,
          color: Math.random() > 0.4 ? '#00ff88' : '#ffffff',
        });
      }
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const drawScanlines = () => {
      ctx.save();
      for (let y = 0; y < canvas.height; y += 4) {
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(0, y, canvas.width, 2);
      }
      ctx.restore();
    };

    const drawGrid = (alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha * 0.15;
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 0.5;
      const spacing = 60;
      for (let x = 0; x < canvas.width; x += spacing) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += spacing) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    let lastTime = performance.now();
    let phaseSet = false;

    const tick = (now: number) => {
      animFrameRef.current = requestAnimationFrame(tick);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      t += dt;

      ctx.fillStyle = '#030303';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawGrid(Math.min(t * 0.6, 1));
      drawScanlines();

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      shieldScale = Math.min(shieldScale + dt * 1.8, 1);
      const eased = shieldScale < 1 ? 1 - Math.pow(1 - shieldScale, 3) : 1;

      glowPulse = Math.sin(t * 2.5) * 0.5 + 0.5;
      hitFlash = Math.max(0, hitFlash - dt * 5);
      screenShakeX *= 0.75;
      screenShakeY *= 0.75;

      if (scheduledIdx < bulletSchedule.length && t >= bulletSchedule[scheduledIdx].t) {
        spawnBullet(bulletSchedule[scheduledIdx].fromAngle, bulletSchedule[scheduledIdx].dist);
        scheduledIdx++;
      }

      const BULLET_SPEED = 2.8;
      for (const b of bullets) {
        if (b.done) continue;
        b.progress = Math.min(b.progress + dt * BULLET_SPEED, 1);
        const bx = lerp(b.from.x, b.target.x, b.progress);
        const by = lerp(b.from.y, b.target.y, b.progress);

        ctx.save();
        const trailLen = 0.18;
        const t0 = Math.max(0, b.progress - trailLen);
        const tx0 = lerp(b.from.x, b.target.x, t0);
        const ty0 = lerp(b.from.y, b.target.y, t0);
        const trailGrad = ctx.createLinearGradient(tx0, ty0, bx, by);
        trailGrad.addColorStop(0, 'rgba(255,220,0,0)');
        trailGrad.addColorStop(1, 'rgba(255,255,100,0.9)');
        ctx.strokeStyle = trailGrad;
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.moveTo(tx0, ty0); ctx.lineTo(bx, by); ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(bx, by, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.restore();

        if (b.progress >= 1) {
          b.done = true;
          hitFlash = 1;
          screenShakeX = (Math.random() - 0.5) * 18;
          screenShakeY = (Math.random() - 0.5) * 12;
          spawnSparks(b.target.x, b.target.y);
          ctx.save();
          ctx.beginPath();
          ctx.arc(b.target.x, b.target.y, 30, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(0,255,136,0.9)';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#00ff88';
          ctx.shadowBlur = 25;
          ctx.stroke();
          ctx.restore();
        }
      }

      for (const sp of sparks) {
        sp.x += sp.vx; sp.y += sp.vy;
        sp.vy += 0.15;
        sp.life -= dt * 1.4;
        if (sp.life <= 0) continue;
        ctx.save();
        ctx.globalAlpha = sp.life;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size * sp.life, 0, Math.PI * 2);
        ctx.fillStyle = sp.color;
        ctx.shadowColor = sp.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
      }

      // Shield is immovable — screen shakes, shield stays locked
      ctx.save();
      ctx.translate(screenShakeX, screenShakeY);
      drawShield(cx - screenShakeX, cy - screenShakeY, eased, 0, glowPulse, hitFlash);
      ctx.restore();

      if (t > 3.2 && !phaseSet) { phaseSet = true; setPhase('tagline'); }
      if (t > 6.0) {
        setPhase('out');
        setTimeout(() => setVisible(false), 700);
        cancelAnimationFrame(animFrameRef.current);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'tagline') return;
    const glitchChars = '!@#$%^&*<>?/\\|0123456789ABCDEF';
    let revealed = 0;
    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      if (revealed >= tagline.length) { setDisplayText(tagline); clearInterval(interval); return; }
      if (frame % 2 === 0) revealed++;
      const scramble = Array.from({ length: Math.min(5, tagline.length - revealed) })
        .map(() => glitchChars[Math.floor(Math.random() * glitchChars.length)]).join('');
      setDisplayText(tagline.slice(0, revealed) + scramble);
    }, 35);
    return () => clearInterval(interval);
  }, [phase]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="loader"
        className="fixed inset-0 z-[9999] overflow-hidden"
        initial={{ opacity: 1 }}
        animate={{ opacity: phase === 'out' ? 0 : 1 }}
        transition={{ duration: 0.7, ease: 'easeInOut' }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)' }} />

        {phase === 'tagline' && (
          <motion.div className="absolute inset-0 flex flex-col items-center justify-end pb-[18%] px-6"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <p className="text-center text-xl sm:text-2xl md:text-3xl font-mono tracking-widest"
              style={{ color: '#00ff88', textShadow: '0 0 20px #00ff88, 0 0 40px #00ff8866', letterSpacing: '0.12em' }}>
              {displayText}<span className="animate-pulse">▌</span>
            </p>
            <p className="mt-3 text-sm font-mono tracking-[0.3em] uppercase"
              style={{ color: 'rgba(0,255,136,0.4)' }}>
              AgentSentry · NHI &amp; AI Agent Security
            </p>
          </motion.div>
        )}

        <div className="absolute top-4 left-4 w-10 h-10 border-t-2 border-l-2 border-[#00ff88] opacity-40" />
        <div className="absolute top-4 right-4 w-10 h-10 border-t-2 border-r-2 border-[#00ff88] opacity-40" />
        <div className="absolute bottom-4 left-4 w-10 h-10 border-b-2 border-l-2 border-[#00ff88] opacity-40" />
        <div className="absolute bottom-4 right-4 w-10 h-10 border-b-2 border-r-2 border-[#00ff88] opacity-40" />
        <div className="absolute top-6 left-0 right-0 flex justify-center">
          <span className="text-xs font-mono tracking-[0.4em] uppercase animate-pulse"
            style={{ color: 'rgba(0,255,136,0.5)' }}>
            {phase === 'shield' ? '[ INITIALIZING SHIELD MATRIX... ]' : '[ SYSTEM SECURED ]'}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
