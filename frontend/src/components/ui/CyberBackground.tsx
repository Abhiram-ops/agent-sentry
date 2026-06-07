'use client';
import { useEffect, useRef } from 'react';

interface Node {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  glow: number; glowDir: number;
  type: 'normal' | 'hub' | 'alert';
}

interface Packet {
  fromNode: number; toNode: number;
  progress: number; speed: number;
  color: string;
}

export function CyberBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let nodes: Node[] = [];
    let packets: Packet[] = [];
    let connections: [number, number, number][] = []; // [i, j, dist]
    let scanY = 0;
    let lastPacketTime = 0;
    let lastConnTime = 0;

    const initNodes = () => {
      nodes = [];
      const count = Math.min(60, Math.floor((canvas.width * canvas.height) / 18000));
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          radius: Math.random() * 1.5 + 1,
          glow: Math.random(),
          glowDir: Math.random() > 0.5 ? 1 : -1,
          type: Math.random() < 0.05 ? 'hub' : Math.random() < 0.08 ? 'alert' : 'normal',
        });
      }
    };

    const rebuildConnections = () => {
      connections = [];
      const maxDist = Math.min(canvas.width, canvas.height) * 0.18;
      for (let i = 0; i < nodes.length; i++) {
        let count = 0;
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist && count < 4) {
            connections.push([i, j, dist]);
            count++;
          }
        }
      }
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initNodes();
      rebuildConnections();
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Base dark background
      ctx.fillStyle = '#04040e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Rebuild connections every ~3 seconds
      if (time - lastConnTime > 3000) {
        rebuildConnections();
        lastConnTime = time;
      }

      // Update nodes
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
        n.glow += n.glowDir * 0.008;
        if (n.glow > 1 || n.glow < 0.1) n.glowDir *= -1;
      });

      // Draw connection lines
      const maxDist = Math.min(canvas.width, canvas.height) * 0.18;
      connections.forEach(([i, j, dist]) => {
        const ni = nodes[i], nj = nodes[j];
        if (!ni || !nj) return;
        const alpha = (1 - dist / maxDist) * 0.12;
        ctx.strokeStyle = `rgba(0,255,136,${alpha})`;
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(ni.x, ni.y);
        ctx.lineTo(nj.x, nj.y);
        ctx.stroke();
      });

      // Spawn new packets
      if (time - lastPacketTime > 400 && connections.length > 0 && packets.length < 20) {
        const conn = connections[Math.floor(Math.random() * connections.length)];
        const colors = ['rgba(0,255,136,0.9)', 'rgba(0,200,255,0.8)', 'rgba(0,255,180,0.7)'];
        packets.push({
          fromNode: conn[0], toNode: conn[1],
          progress: 0,
          speed: 0.015 + Math.random() * 0.025,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
        lastPacketTime = time;
      }

      // Draw + advance packets
      packets = packets.filter(p => {
        p.progress += p.speed;
        return p.progress <= 1;
      });
      packets.forEach(p => {
        const ni = nodes[p.fromNode], nj = nodes[p.toNode];
        if (!ni || !nj) return;
        const x = ni.x + (nj.x - ni.x) * p.progress;
        const y = ni.y + (nj.y - ni.y) * p.progress;
        // Dot
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        // Soft glow around dot
        const g = ctx.createRadialGradient(x, y, 0, x, y, 7);
        g.addColorStop(0, p.color.replace(/[\d.]+\)$/, '0.2)'));
        g.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      });

      // Draw nodes
      nodes.forEach(n => {
        const isHub = n.type === 'hub';
        const isAlert = n.type === 'alert';
        const glowAlpha = 0.3 + n.glow * 0.5;
        const color = isAlert ? `rgba(255,50,80,${glowAlpha})` :
                      isHub   ? `rgba(0,200,255,${glowAlpha})` :
                                `rgba(0,255,136,${glowAlpha})`;
        const r = isHub ? n.radius * 2.5 : n.radius;

        // Halo for hubs + highly active nodes
        if (isHub || n.glow > 0.75) {
          const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 8);
          grad.addColorStop(0, color.replace(/[\d.]+\)$/, '0.12)'));
          grad.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(n.x, n.y, r * 8, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });

      // Sweep scan line (travels top→bottom, loops)
      scanY += 0.4;
      if (scanY > canvas.height + 20) scanY = -20;
      const scanGrad = ctx.createLinearGradient(0, scanY - 6, 0, scanY + 6);
      scanGrad.addColorStop(0, 'transparent');
      scanGrad.addColorStop(0.5, 'rgba(0,255,136,0.035)');
      scanGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 6, canvas.width, 12);

      // Subtle vignette (edges darker than center)
      const vignette = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.height * 0.2,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.75
      );
      vignette.addColorStop(0, 'transparent');
      vignette.addColorStop(1, 'rgba(2,2,10,0.4)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      animId = requestAnimationFrame(draw);
    };

    resize();
    animId = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -3,
        pointerEvents: 'none',
      }}
    />
  );
}
