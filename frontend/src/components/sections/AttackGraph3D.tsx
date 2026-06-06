"use client";
import { useEffect, useRef } from "react";
import type * as T from "three";

// ─── Scene data ───────────────────────────────────────────────────────────────

const NODES: Array<{
  x: number; y: number; z: number;
  r: number; c: number; o: number; pulse: boolean;
}> = [
  // Critical (red) ─ largest, pulsing
  { x: 1.2,  y: 0.6,  z: 0.0,  r: 0.22, c: 0xff3366, o: 1.0,  pulse: true  },
  { x:-1.8,  y: 1.2,  z: 0.8,  r: 0.19, c: 0xff3366, o: 1.0,  pulse: true  },
  { x: 2.8,  y:-0.8,  z: 1.2,  r: 0.17, c: 0xff3366, o: 0.9,  pulse: false },
  // AI agents (blue)
  { x:-1.2,  y: 0.2,  z: 1.5,  r: 0.15, c: 0x0099ff, o: 0.9,  pulse: false },
  { x: 0.5,  y: 2.2,  z: 0.5,  r: 0.14, c: 0x0099ff, o: 0.9,  pulse: false },
  { x:-2.2,  y:-0.8,  z:-0.5,  r: 0.13, c: 0x0099ff, o: 0.85, pulse: false },
  { x: 3.0,  y: 0.5,  z:-1.0,  r: 0.12, c: 0x0099ff, o: 0.80, pulse: false },
  // IAM roles (green)
  { x: 0.2,  y:-1.5,  z: 1.0,  r: 0.13, c: 0x00ff88, o: 0.80, pulse: false },
  { x: 2.0,  y: 1.8,  z:-1.5,  r: 0.12, c: 0x00ff88, o: 0.80, pulse: false },
  { x:-2.5,  y: 0.5,  z: 0.5,  r: 0.12, c: 0x00ff88, o: 0.75, pulse: false },
  { x: 1.0,  y:-2.0,  z:-1.0,  r: 0.11, c: 0x00ff88, o: 0.75, pulse: false },
  { x:-0.5,  y: 1.5,  z:-2.0,  r: 0.11, c: 0x00ff88, o: 0.70, pulse: false },
  // Medium risk (yellow)
  { x: 1.8,  y:-1.2,  z: 2.0,  r: 0.10, c: 0xffcc00, o: 0.70, pulse: false },
  { x:-1.5,  y: 2.5,  z:-0.5,  r: 0.10, c: 0xffcc00, o: 0.65, pulse: false },
  // Dim / generic
  { x:-3.0,  y:-0.5,  z: 1.0,  r: 0.08, c: 0x334455, o: 0.50, pulse: false },
  { x: 3.5,  y: 1.2,  z: 0.2,  r: 0.08, c: 0x334455, o: 0.50, pulse: false },
  { x: 0.5,  y: 3.0,  z:-0.8,  r: 0.07, c: 0x223344, o: 0.40, pulse: false },
  { x:-0.8,  y:-2.5,  z: 0.5,  r: 0.07, c: 0x223344, o: 0.40, pulse: false },
  { x: 2.5,  y: 0.2,  z: 2.5,  r: 0.07, c: 0x223344, o: 0.40, pulse: false },
  { x:-2.0,  y:-1.8,  z:-1.5,  r: 0.07, c: 0x223344, o: 0.35, pulse: false },
];

// [from, to, opacity]
const EDGES: [number, number, number][] = [
  [0, 3, 0.30], [3, 7,  0.20],
  [1, 4, 0.30], [4, 8,  0.20],
  [2, 5, 0.25], [5, 9,  0.15],
  [0, 1, 0.20], [1, 2,  0.15],
  [3, 6, 0.15], [6, 10, 0.12],
  [7, 10, 0.12],[8, 11, 0.10],
  [0, 14, 0.10],[1, 15, 0.10],
  [2, 16, 0.10],[3, 17, 0.08],
  [4, 18, 0.08],[5, 19, 0.08],
  [7, 12, 0.10],[9, 13, 0.10],
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AttackGraph3D({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rafRef   = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || typeof window === "undefined") return;
    if (window.innerWidth < 768) return; // skip on mobile

    let running = true;

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth)  * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      };
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    import("three").then((THREE: typeof T) => {
      if (!running || !mount) return;

      /* ── Setup ── */
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x000000, 0.09);

      const camera = new THREE.PerspectiveCamera(
        55,
        mount.clientWidth / mount.clientHeight,
        0.1,
        100,
      );
      camera.position.set(0, 0, 9);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);

      const group = new THREE.Group();
      scene.add(group);

      /* ── Nodes ── */
      const pulseNodes: T.Mesh[]  = [];
      const pulseRings: T.Mesh[]  = [];

      NODES.forEach((n) => {
        const geo = new THREE.SphereGeometry(n.r, 20, 20);
        const mat = new THREE.MeshBasicMaterial({
          color: n.c,
          transparent: n.o < 1,
          opacity: n.o,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(n.x, n.y, n.z);
        group.add(mesh);

        if (n.pulse) {
          pulseNodes.push(mesh);
          // Outer ring that expands and fades
          const ringGeo = new THREE.RingGeometry(n.r * 1.8, n.r * 2.2, 32);
          const ringMat = new THREE.MeshBasicMaterial({
            color: n.c,
            transparent: true,
            opacity: 0.18,
            side: THREE.DoubleSide,
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.position.set(n.x, n.y, n.z);
          group.add(ring);
          pulseRings.push(ring);
        }
      });

      /* ── Edges ── */
      EDGES.forEach(([ai, bi, op]) => {
        const na = NODES[ai], nb = NODES[bi];
        if (!na || !nb) return;
        const pts = [
          new THREE.Vector3(na.x, na.y, na.z),
          new THREE.Vector3(nb.x, nb.y, nb.z),
        ];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const edgeColor = na.c === 0xff3366 ? 0xff3366
                        : na.c === 0x0099ff ? 0x0099ff
                        : 0x00ff88;
        const mat = new THREE.LineBasicMaterial({
          color: edgeColor,
          transparent: true,
          opacity: op,
        });
        group.add(new THREE.Line(geo, mat));
      });

      /* ── Animation ── */
      let t = 0;
      const cam = { x: 0, y: 0 };

      const animate = () => {
        if (!running) return;
        rafRef.current = requestAnimationFrame(animate);
        t += 0.004;

        group.rotation.y = t * 0.22;
        group.rotation.x = Math.sin(t * 0.13) * 0.07;

        // Smooth mouse parallax
        cam.x += (mouseRef.current.x * 1.1 - cam.x) * 0.04;
        cam.y += (-mouseRef.current.y * 0.7 - cam.y) * 0.04;
        camera.position.x = cam.x;
        camera.position.y = cam.y;
        camera.lookAt(0, 0, 0);

        // Pulse critical nodes
        const p = 1 + Math.sin(t * 2.8) * 0.10;
        pulseNodes.forEach((m) => m.scale.setScalar(p));
        pulseRings.forEach((ring, i) => {
          const s = 1 + Math.sin(t * 2.8 - i * 0.6) * 0.35;
          ring.scale.setScalar(s);
          (ring.material as T.MeshBasicMaterial).opacity =
            0.18 * (1 - Math.abs(Math.sin(t * 2.8 - i * 0.6)) * 0.65);
        });

        renderer.render(scene, camera);
      };
      animate();

      /* ── Resize ── */
      const onResize = () => {
        if (!mount || !running) return;
        camera.aspect = mount.clientWidth / mount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mount.clientWidth, mount.clientHeight);
      };
      window.addEventListener("resize", onResize);

      // Store cleanup on the DOM node
      (mount as HTMLDivElement & { _cleanup?: () => void })._cleanup = () => {
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        if (mount.contains(renderer.domElement)) {
          mount.removeChild(renderer.domElement);
        }
      };
    });

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMouseMove);
      const el = mount as HTMLDivElement & { _cleanup?: () => void };
      el._cleanup?.();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
    />
  );
}
