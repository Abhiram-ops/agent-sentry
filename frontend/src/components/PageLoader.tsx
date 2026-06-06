'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Spark {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  type: 'hot' | 'chunk';
  angle: number;
}

interface ScorchMark {
  x: number; y: number; radius: number; alpha: number;
}

interface ShockWave {
  x: number; y: number; r: number; maxR: number; life: number;
}

export default function PageLoader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady]         = useState(false);
  const [phase, setPhase]         = useState<'shield' | 'tagline' | 'out'>('shield');
  const [visible, setVisible]     = useState(true);
  const [displayText, setDisplayText] = useState('');
  const animFrameRef = useRef<number>(0);
  const logoRef      = useRef<HTMLImageElement | null>(null);
  const tagline = "Find every Machine's Identity before they do.";

  // ── Preload logo ──────────────────────────────────────────────────────────
  useEffect(() => {
    const img = new window.Image();
    img.src = '/logo.png';
    img.onload = () => { logoRef.current = img; setReady(true); };
    img.onerror = () => { setReady(true); }; // fallback: still run without logo
  }, []);

  // ── Main animation ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    // Shield display geometry
    const shieldDisplaySize = () => Math.min(canvas.width, canvas.height) * 0.62;
    const shieldCX = () => canvas.width  / 2;
    const shieldCY = () => canvas.height / 2 - 20;
    // Collision: the actual shield polygon is ~45% of the image width
    const shieldHitRadius = () => shieldDisplaySize() * 0.44;

    // ── State ───────────────────────────────────────────────────────────────
    let t = 0;
    let logoScale    = 0;   // 0→1 on entry
    let hitFlash     = 0;   // 0→1 on impact, decays
    let glowPulse    = 0;
    let screenShakeX = 0;
    let screenShakeY = 0;
    let flashWhite   = 0;   // full-screen flash

    const sparks:       Spark[]      = [];
    const scorchMarks:  ScorchMark[] = [];
    const shockWaves:   ShockWave[]  = [];

    // Bullets
    const bullets: { fx: number; fy: number; tx: number; ty: number; p: number; done: boolean }[] = [];
    const bulletSchedule = [
      { t: 1.0,  angle: 215, dist: 700 },
      { t: 1.8,  angle: 340, dist: 680 },
      { t: 2.5,  angle: 125, dist: 720 },
      { t: 3.1,  angle: 30,  dist: 690 },
    ];
    let bIdx = 0;

    const spawnBullet = (angleDeg: number, dist: number) => {
      const cx = shieldCX(), cy = shieldCY();
      const r  = angleDeg * Math.PI / 180;
      const tx = cx + (Math.random() - 0.5) * 60;
      const ty = cy + (Math.random() - 0.5) * 60;
      bullets.push({ fx: cx + Math.cos(r) * dist, fy: cy + Math.sin(r) * dist, tx, ty, p: 0, done: false });
    };

    const spawnImpact = (x: number, y: number) => {
      // Hot sparks
      for (let i = 0; i < 50; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 2 + Math.random() * 8;
        sparks.push({ x, y, vx: Math.cos(a)*spd, vy: Math.sin(a)*spd - 3.5,
          life: 1, maxLife: 1, size: 1 + Math.random() * 2.5, type: 'hot', angle: a });
      }
      // Metal chunks
      for (let i = 0; i < 14; i++) {
        const a = -Math.PI/2 + (Math.random()-0.5)*Math.PI*1.5;
        const spd = 1.5 + Math.random() * 4.5;
        sparks.push({ x, y, vx: Math.cos(a)*spd, vy: Math.sin(a)*spd - 1.5,
          life: 1, maxLife: 1, size: 2.5 + Math.random() * 4.5, type: 'chunk', angle: a });
      }
      shockWaves.push({ x, y, r: 5, maxR: 110, life: 1 });
      scorchMarks.push({ x, y, radius: 22, alpha: 0.9 });
      hitFlash   = 1;
      flashWhite = 1;
      screenShakeX = (Math.random()-0.5)*28;
      screenShakeY = (Math.random()-0.5)*28;
    };

    // ── Draw background ──────────────────────────────────────────────────────
    const drawBackground = () => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Green center radial atmosphere
      const rad = ctx.createRadialGradient(
        shieldCX(), shieldCY(), 0,
        shieldCX(), shieldCY(), canvas.height * 0.7
      );
      rad.addColorStop(0,   'rgba(0,40,22,0.85)');
      rad.addColorStop(0.4, 'rgba(0,20,12,0.60)');
      rad.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = rad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle HUD grid
      ctx.save();
      ctx.globalAlpha = 0.03;
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth   = 0.5;
      for (let x = 0; x < canvas.width;  x += 80) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
      for (let y = 0; y < canvas.height; y += 80) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width, y);  ctx.stroke(); }
      ctx.restore();
    };

    // ── Draw logo ────────────────────────────────────────────────────────────
    const drawLogo = (scale: number, hitF: number, glow: number) => {
      const logo = logoRef.current;
      const sz   = shieldDisplaySize() * scale;
      const cx   = shieldCX(), cy = shieldCY();
      const x    = cx - sz/2, y  = cy - sz/2;

      ctx.save();
      // Hit flash: green overlay
      if (hitF > 0.05) {
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur  = 30 + hitF * 80;
      } else {
        // Ambient glow
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur  = 15 + glow * 20;
      }

      if (logo) {
        ctx.drawImage(logo, x, y, sz, sz);
      } else {
        // Fallback: green circle
        ctx.beginPath();
        ctx.arc(cx, cy, sz*0.4, 0, Math.PI*2);
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.restore();

      // Scorch marks (drawn on top of logo)
      for (const sm of scorchMarks) {
        const g = ctx.createRadialGradient(sm.x, sm.y, 0, sm.x, sm.y, sm.radius);
        g.addColorStop(0,   `rgba(255,160,0,${sm.alpha*0.7})`);
        g.addColorStop(0.4, `rgba(100,50,0,${sm.alpha*0.4})`);
        g.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(sm.x, sm.y, sm.radius, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      }

      // Hit energy flash over the logo area
      if (hitF > 0.05) {
        const flashGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, sz*0.5);
        flashGrad.addColorStop(0,   `rgba(0,255,136,${hitF*0.18})`);
        flashGrad.addColorStop(0.6, `rgba(0,255,136,${hitF*0.06})`);
        flashGrad.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = flashGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, sz*0.5, 0, Math.PI*2);
        ctx.fill();
      }
    };

    // ── Draw shockwaves ──────────────────────────────────────────────────────
    const drawShockwaves = () => {
      for (let i = shockWaves.length-1; i >= 0; i--) {
        const sw = shockWaves[i];
        const prog = 1 - sw.life;
        ctx.save();
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(0,255,136,${sw.life * 0.7})`;
        ctx.lineWidth   = 3 * sw.life;
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur  = 15 * sw.life;
        ctx.stroke();

        // Inner ring
        if (sw.r > 20) {
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.r * 0.6, 0, Math.PI*2);
          ctx.strokeStyle = `rgba(0,255,136,${sw.life * 0.3})`;
          ctx.lineWidth = 1.5 * sw.life;
          ctx.stroke();
        }
        ctx.restore();

        sw.r    += (sw.maxR - sw.r) * 0.12;
        sw.life -= 0.04;
        if (sw.life <= 0) shockWaves.splice(i, 1);
      }
    };

    // ── Draw sparks ──────────────────────────────────────────────────────────
    const drawSparks = (dt: number) => {
      const G = 0.28;
      for (let i = sparks.length-1; i >= 0; i--) {
        const sp = sparks[i];
        sp.vy   += G;
        sp.x    += sp.vx;
        sp.y    += sp.vy;
        sp.life -= sp.type === 'hot' ? 0.028 : 0.018;
        if (sp.life <= 0) { sparks.splice(i,1); continue; }

        const alpha = sp.life / sp.maxLife;
        ctx.save();
        if (sp.type === 'hot') {
          const r = sp.life > 0.6 ? 255 : Math.round(255 * ((sp.life-0.0)/0.6));
          const g = Math.round(120 * alpha);
          ctx.fillStyle = `rgba(${r},${g},0,${alpha})`;
          ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, sp.size * alpha, 0, Math.PI*2);
          ctx.fill();
        } else {
          ctx.save();
          ctx.translate(sp.x, sp.y);
          ctx.rotate(sp.angle + sp.vy * 0.08);
          ctx.fillStyle = `rgba(160,140,110,${alpha*0.9})`;
          ctx.fillRect(-sp.size/2, -sp.size/2, sp.size, sp.size*0.5);
          ctx.restore();
        }
        ctx.restore();
      }
    };

    // ── Draw bullets ─────────────────────────────────────────────────────────
    const drawBullets = () => {
      for (const b of bullets) {
        if (b.done) continue;
        const x = b.fx + (b.tx - b.fx) * b.p;
        const y = b.fy + (b.ty - b.fy) * b.p;
        const dx = b.tx - b.fx, dy = b.ty - b.fy;
        const len = Math.hypot(dx,dy);
        const nx  = dx/len, ny = dy/len;
        // Tracer: short streak behind bullet
        const tracerLen = 28;
        ctx.save();
        const grad = ctx.createLinearGradient(
          x - nx*tracerLen, y - ny*tracerLen, x, y
        );
        grad.addColorStop(0, 'rgba(255,220,140,0)');
        grad.addColorStop(1, 'rgba(255,240,180,0.95)');
        ctx.strokeStyle = grad;
        ctx.lineWidth   = 2.5;
        ctx.beginPath();
        ctx.moveTo(x - nx*tracerLen, y - ny*tracerLen);
        ctx.lineTo(x, y);
        ctx.stroke();
        // Bullet tip
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      }
    };

    // ── Tagline glitch typing ────────────────────────────────────────────────
    const glitchChars = '!@#$%^&*<>?/|\\0123456789ABCDEFabcdef';
    let taglineProgress = 0;
    let glitchTimer     = 0;

    const updateTagline = (dt: number) => {
      glitchTimer += dt;
      if (glitchTimer > 0.04) {
        glitchTimer = 0;
        if (taglineProgress < tagline.length) {
          taglineProgress = Math.min(tagline.length, taglineProgress + 0.9);
        }
        const revealed = tagline.slice(0, Math.floor(taglineProgress));
        const scramble = Math.min(4, tagline.length - Math.floor(taglineProgress));
        let scrambled = '';
        for (let i = 0; i < scramble; i++) {
          scrambled += glitchChars[Math.floor(Math.random()*glitchChars.length)];
        }
        setDisplayText(revealed + scrambled);
      }
    };

    // ── Main render loop ─────────────────────────────────────────────────────
    let lastTs = performance.now();
    let phaseLocal: 'shield' | 'tagline' | 'out' = 'shield';

    const tick = (ts: number) => {
      const dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;
      t     += dt;

      // ── Logo entrance
      if (t < 0.6) {
        logoScale = 0;
      } else if (t < 1.0) {
        logoScale = Math.min(1, (t - 0.6) / 0.4);
        // Ease-out cubic
        logoScale = 1 - Math.pow(1 - logoScale, 3);
      } else {
        logoScale = 1;
      }

      // ── Schedule bullets
      if (bIdx < bulletSchedule.length && t >= bulletSchedule[bIdx].t) {
        spawnBullet(bulletSchedule[bIdx].angle, bulletSchedule[bIdx].dist);
        bIdx++;
      }

      // ── Update bullets
      for (const b of bullets) {
        if (b.done) continue;
        b.p += dt * 1.6; // travel speed
        if (b.p >= 1) {
          b.p    = 1;
          b.done = true;
          spawnImpact(b.tx, b.ty);
        }
      }

      // ── Phase transitions
      if (t > 4.2 && phaseLocal === 'shield') {
        phaseLocal = 'tagline';
        setPhase('tagline');
        taglineProgress = 0;
      }
      if (t > 9.5 && phaseLocal === 'tagline') {
        phaseLocal = 'out';
        setPhase('out');
        setTimeout(() => setVisible(false), 1000);
      }

      // ── Update tagline
      if (phaseLocal === 'tagline') updateTagline(dt);

      // ── Decay values
      hitFlash     = Math.max(0, hitFlash     - dt * 2.2);
      glowPulse    = 0.5 + 0.5 * Math.sin(t * 2.4);
      flashWhite   = Math.max(0, flashWhite   - dt * 3.5);
      screenShakeX *= 0.70;
      screenShakeY *= 0.70;
      for (const sm of scorchMarks) sm.alpha = Math.max(0, sm.alpha - dt * 0.04);

      // ── Render
      ctx.save();
      ctx.translate(screenShakeX, screenShakeY);

      drawBackground();
      drawLogo(logoScale, hitFlash, glowPulse);
      drawShockwaves();
      drawSparks(dt);
      drawBullets();

      // Full-screen white flash on impact
      if (flashWhite > 0.01) {
        ctx.fillStyle = `rgba(255,255,255,${flashWhite * 0.18})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Vignette
      const vig = ctx.createRadialGradient(
        canvas.width/2, canvas.height/2, canvas.height*0.12,
        canvas.width/2, canvas.height/2, canvas.height*0.9
      );
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.75)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [ready]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="loader"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.9 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: '#000',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />

        {/* Tagline overlay */}
        <AnimatePresence>
          {phase === 'tagline' && (
            <motion.div
              key="tagline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                position: 'relative', zIndex: 10,
                marginTop: Math.min(window?.innerHeight * 0.38 ?? 300, 340),
                textAlign: 'center',
                padding: '0 32px',
                maxWidth: 680,
              }}
            >
              {/* Brand */}
              <div style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 11,
                letterSpacing: '0.3em',
                color: '#00ff88',
                textTransform: 'uppercase',
                marginBottom: 16,
                opacity: 0.7,
              }}>
                AgentSentry
              </div>
              {/* Glitch tagline */}
              <p style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 'clamp(15px, 2vw, 22px)',
                color: '#e0ffe8',
                lineHeight: 1.5,
                letterSpacing: '0.04em',
                textShadow: '0 0 20px rgba(0,255,136,0.6), 0 0 40px rgba(0,255,136,0.3)',
                minHeight: '2.5em',
              }}>
                {displayText}
                <span style={{ opacity: Math.floor(Date.now()/400) % 2 ? 1 : 0, color: '#00ff88' }}>█</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fade-out overlay */}
        {phase === 'out' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9 }}
            style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 20 }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
