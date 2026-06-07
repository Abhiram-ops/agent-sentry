'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function MorphingSphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── Renderer ────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 5;

    // ── Group (all objects move together) ───────────────────
    const group = new THREE.Group();
    scene.add(group);

    // ── Outer morphing wireframe sphere ─────────────────────
    const outerGeo = new THREE.IcosahedronGeometry(1.8, 4);
    const originalPos = Float32Array.from(outerGeo.attributes.position.array as Float32Array);
    const wireMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0x00ff88),
      wireframe: true,
      transparent: true,
      opacity: 0.14,
    });
    const outerMesh = new THREE.Mesh(outerGeo, wireMat);
    group.add(outerMesh);

    // ── Inner glowing solid sphere ───────────────────────────
    const innerGeo = new THREE.SphereGeometry(1.05, 64, 64);
    const innerMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x001a0d),
      emissive: new THREE.Color(0x00ff88),
      emissiveIntensity: 0.45,
      metalness: 0.9,
      roughness: 0.25,
      transparent: true,
      opacity: 0.75,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    group.add(innerMesh);

    // ── Atmospheric back-face glow ───────────────────────────
    const atmGeo = new THREE.SphereGeometry(2.3, 32, 32);
    const atmMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0x00ff88),
      transparent: true,
      opacity: 0.025,
      side: THREE.BackSide,
    });
    group.add(new THREE.Mesh(atmGeo, atmMat));

    // ── Cyan secondary halo ──────────────────────────────────
    const haloGeo = new THREE.SphereGeometry(2.0, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0x00aaff),
      transparent: true,
      opacity: 0.018,
      side: THREE.BackSide,
    });
    group.add(new THREE.Mesh(haloGeo, haloMat));

    // ── Pulse rings (3 staggered) ────────────────────────────
    const ringGeo = new THREE.TorusGeometry(1.0, 0.012, 8, 80);
    const rings: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; phase: number }[] = [];
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0x00ff88),
        transparent: true,
        opacity: 0,
      });
      const ring = new THREE.Mesh(ringGeo, mat);
      ring.rotation.x = Math.PI / 2;
      rings.push({ mesh: ring, mat, phase: i / 3 });
      group.add(ring);
    }

    // ── Lights ───────────────────────────────────────────────
    const coreLight = new THREE.PointLight(0x00ff88, 8, 12);
    group.add(coreLight);

    // Blue accent light (world-space, not in group)
    const blueLight = new THREE.PointLight(0x0055ff, 2.5, 10);
    blueLight.position.set(4, 3, 3);
    scene.add(blueLight);

    scene.add(new THREE.AmbientLight(0x001a0d, 3));

    // ── Position group right-of-center ──────────────────────
    // Will be adjusted on resize so it stays visually anchored
    const positionGroup = () => {
      const aspect = window.innerWidth / window.innerHeight;
      // Push right on wide screens, center on narrow
      group.position.set(aspect > 1.2 ? 1.6 : 0.6, -0.1, 0);
    };
    positionGroup();

    // ── Animation loop ───────────────────────────────────────
    const clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Vertex morph — breathing organic displacement
      const pos = outerGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const ox = originalPos[i * 3];
        const oy = originalPos[i * 3 + 1];
        const oz = originalPos[i * 3 + 2];
        const d =
          Math.sin(ox * 2.8 + t * 0.7) *
          Math.cos(oy * 2.2 + t * 0.55) *
          Math.sin(oz * 2.6 + t * 0.45);
        const scale = 1 + d * 0.2;
        pos.setXYZ(i, ox * scale, oy * scale, oz * scale);
      }
      pos.needsUpdate = true;
      outerGeo.computeVertexNormals();

      // Slow rotation
      group.rotation.y = t * 0.1;
      outerMesh.rotation.x = t * 0.06;
      innerMesh.rotation.y = -t * 0.04;

      // Pulsing glow on inner sphere
      const pulse = 0.35 + Math.sin(t * 1.7) * 0.18;
      innerMat.emissiveIntensity = pulse;
      innerMat.opacity = 0.65 + Math.sin(t * 1.7) * 0.12;
      coreLight.intensity = 6 + Math.sin(t * 2.1) * 3.5;

      // Expanding pulse rings
      rings.forEach(r => {
        r.phase = (r.phase + 0.003) % 1;
        const s = 1 + r.phase * 3;
        r.mesh.scale.setScalar(s);
        r.mat.opacity = Math.max(0, 0.28 * Math.pow(1 - r.phase, 2));
      });

      renderer.render(scene, camera);
    };

    animate();

    // ── Resize handler ───────────────────────────────────────
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      positionGroup();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      outerGeo.dispose(); wireMat.dispose();
      innerGeo.dispose(); innerMat.dispose();
      atmGeo.dispose(); atmMat.dispose();
      haloGeo.dispose(); haloMat.dispose();
      ringGeo.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -2,
        pointerEvents: 'none',
        opacity: 0.72,
      }}
    />
  );
}
