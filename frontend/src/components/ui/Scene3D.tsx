'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface CyberNode {
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  vel: THREE.Vector3;
  phase: number;
  phaseSpeed: number;
  type: 'normal' | 'hub' | 'alert';
}
interface DataPacket { from: number; to: number; progress: number; speed: number; }

export function Scene3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── Renderer ────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x04040e, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x04040e, 0.052);

    const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 2.5, 9);
    camera.lookAt(0, 0, -1);

    // ── Grid floor ──────────────────────────────────────────
    const grid = new THREE.GridHelper(60, 50, new THREE.Color(0x003322), new THREE.Color(0x001a0d));
    grid.position.y = -2.5;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.65;
    scene.add(grid);

    // ── Lights ──────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x001a0d, 5));
    const gLight = new THREE.PointLight(0x00ff88, 22, 20);
    gLight.position.set(2.5, 1, 0); scene.add(gLight);
    const bLight = new THREE.PointLight(0x0044ff, 7, 16);
    bLight.position.set(-4, 3, -3); scene.add(bLight);
    const cLight = new THREE.PointLight(0x00aaff, 5, 14);
    cLight.position.set(5, 0, 2); scene.add(cLight);

    // ── Network nodes ────────────────────────────────────────
    const gNormal = new THREE.SphereGeometry(0.07, 8, 8);
    const gHub    = new THREE.SphereGeometry(0.15, 12, 12);
    const gAlert  = new THREE.SphereGeometry(0.09, 8, 8);
    const nodes: CyberNode[] = [];

    for (let i = 0; i < 48; i++) {
      const rnd = Math.random();
      const type: CyberNode['type'] = rnd < 0.07 ? 'hub' : rnd < 0.16 ? 'alert' : 'normal';
      const hex  = type === 'hub' ? 0x00aaff : type === 'alert' ? 0xff3344 : 0x00ff88;
      const geo  = type === 'hub' ? gHub : type === 'alert' ? gAlert : gNormal;
      const mat  = new THREE.MeshStandardMaterial({
        color: new THREE.Color(hex), emissive: new THREE.Color(hex),
        emissiveIntensity: 0.6, metalness: 0.7, roughness: 0.3,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 22,
        Math.random() * 5.5 - 1,
        (Math.random() - 0.5) * 14 - 1,
      );
      scene.add(mesh);
      nodes.push({
        mesh, mat,
        vel: new THREE.Vector3((Math.random()-0.5)*0.004, (Math.random()-0.5)*0.003, (Math.random()-0.5)*0.003),
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.6 + Math.random() * 1.4,
        type,
      });
    }

    // ── Connection lines — single LineSegments draw call ────
    const MAX_C = 150;
    const lPos  = new Float32Array(MAX_C * 6);
    const lAttr = new THREE.BufferAttribute(lPos, 3);
    lAttr.setUsage(THREE.DynamicDrawUsage);
    const lGeo  = new THREE.BufferGeometry();
    lGeo.setAttribute('position', lAttr);
    const lineSeg = new THREE.LineSegments(
      lGeo,
      new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.12 }),
    );
    scene.add(lineSeg);

    let conns: [number, number][] = [];
    const rebuildConns = () => {
      conns = [];
      for (let i = 0; i < nodes.length && conns.length < MAX_C; i++) {
        let c = 0;
        for (let j = i + 1; j < nodes.length && c < 3; j++) {
          if (nodes[i].mesh.position.distanceTo(nodes[j].mesh.position) < 5.5) {
            conns.push([i, j]); c++;
          }
        }
      }
    };
    rebuildConns();

    const updateLines = () => {
      conns.forEach(([i, j], c) => {
        const a = nodes[i].mesh.position, b = nodes[j].mesh.position;
        lPos[c*6]=a.x; lPos[c*6+1]=a.y; lPos[c*6+2]=a.z;
        lPos[c*6+3]=b.x; lPos[c*6+4]=b.y; lPos[c*6+5]=b.z;
      });
      lGeo.setDrawRange(0, conns.length * 2);
      lAttr.needsUpdate = true;
    };

    // ── Data packets — InstancedMesh ─────────────────────────
    const MAX_P   = 20;
    const pDummy  = new THREE.Object3D();
    const pInst   = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.05, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0x00ffaa }),
      MAX_P,
    );
    pInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(pInst);
    let packets: DataPacket[] = [];

    // ── Morphing sphere ──────────────────────────────────────
    const morphGeo = new THREE.IcosahedronGeometry(1.5, 4);
    const origP    = Float32Array.from(morphGeo.attributes.position.array as Float32Array);
    const morphMesh = new THREE.Mesh(
      morphGeo,
      new THREE.MeshBasicMaterial({ color: 0x00ff88, wireframe: true, transparent: true, opacity: 0.13 }),
    );
    const cGeo  = new THREE.SphereGeometry(1.0, 64, 64);
    const cMat  = new THREE.MeshStandardMaterial({
      color: 0x001a0d, emissive: new THREE.Color(0x00ff88),
      emissiveIntensity: 0.5, metalness: 0.9, roughness: 0.2,
      transparent: true, opacity: 0.82,
    });
    const coreMesh = new THREE.Mesh(cGeo, cMat);
    const atmMesh  = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.025, side: THREE.BackSide }),
    );
    const sLight = new THREE.PointLight(0x00ff88, 10, 14);
    const sGroup = new THREE.Group();
    sGroup.add(morphMesh, coreMesh, atmMesh, sLight);
    sGroup.position.set(2.5, 0.3, -1.5);
    scene.add(sGroup);

    // Pulse rings
    const rGeo  = new THREE.TorusGeometry(1, 0.012, 8, 80);
    const rings: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; ph: number }[] = [];
    for (let i = 0; i < 3; i++) {
      const m = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0 });
      const r = new THREE.Mesh(rGeo, m);
      r.rotation.x = Math.PI / 2;
      rings.push({ mesh: r, mat: m, ph: i / 3 });
      sGroup.add(r);
    }

    // ── Particle cloud — drifting upward ─────────────────────
    const PC = 2000;
    const ppArr  = new Float32Array(PC * 3);
    const pvArr  = new Float32Array(PC);
    for (let i = 0; i < PC; i++) {
      ppArr[i*3]   = (Math.random()-0.5)*32;
      ppArr[i*3+1] = Math.random()*10 - 3;
      ppArr[i*3+2] = (Math.random()-0.5)*22;
      pvArr[i] = 0.003 + Math.random()*0.004;
    }
    const ppGeo  = new THREE.BufferGeometry();
    const ppAttr = new THREE.BufferAttribute(ppArr, 3);
    ppAttr.setUsage(THREE.DynamicDrawUsage);
    ppGeo.setAttribute('position', ppAttr);
    scene.add(new THREE.Points(ppGeo,
      new THREE.PointsMaterial({ color: 0x00ff88, size: 0.03, transparent: true, opacity: 0.4, sizeAttenuation: true }),
    ));

    // ── Animation loop ───────────────────────────────────────
    let animId: number, lastCR = 0, lastPS = 0;

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const t = time * 0.001;

      // Camera gentle drift — slow arc so scene feels alive
      camera.position.x = Math.sin(t * 0.05) * 2;
      camera.position.y = 2.5 + Math.sin(t * 0.07) * 0.35;
      camera.lookAt(0, 0, -1.5);

      // Node drift + pulsing glow
      nodes.forEach(n => {
        n.mesh.position.add(n.vel);
        const { x, y, z } = n.mesh.position;
        if (x > 11 || x < -11) n.vel.x *= -1;
        if (y > 4  || y < -1.5) n.vel.y *= -1;
        if (z > 6  || z < -8)   n.vel.z *= -1;
        n.phase += n.phaseSpeed * 0.016;
        n.mat.emissiveIntensity = 0.35 + Math.sin(n.phase) * 0.4;
      });

      // Rebuild connections every 4s as nodes drift
      if (t - lastCR > 4) { rebuildConns(); lastCR = t; }
      updateLines();

      // Spawn packets along random active connections
      if (t - lastPS > 0.45 && packets.length < MAX_P && conns.length > 0) {
        const [f, to] = conns[Math.floor(Math.random() * conns.length)];
        packets.push({ from: f, to, progress: 0, speed: 0.012 + Math.random() * 0.022 });
        lastPS = t;
      }
      packets = packets.filter(p => { p.progress += p.speed; return p.progress <= 1; });
      for (let i = 0; i < MAX_P; i++) {
        if (i < packets.length) {
          const p = packets[i];
          pDummy.position.lerpVectors(nodes[p.from].mesh.position, nodes[p.to].mesh.position, p.progress);
          pDummy.scale.setScalar(1);
        } else {
          pDummy.position.set(0, -1000, 0);
          pDummy.scale.setScalar(0);
        }
        pDummy.updateMatrix();
        pInst.setMatrixAt(i, pDummy.matrix);
      }
      pInst.instanceMatrix.needsUpdate = true;

      // Vertex morph on sphere
      const mp = morphGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < mp.count; i++) {
        const ox = origP[i*3], oy = origP[i*3+1], oz = origP[i*3+2];
        const d  = Math.sin(ox*2.8+t*0.7) * Math.cos(oy*2.2+t*0.55) * Math.sin(oz*2.6+t*0.45);
        const s  = 1 + d * 0.2;
        mp.setXYZ(i, ox*s, oy*s, oz*s);
      }
      mp.needsUpdate = true;
      morphGeo.computeVertexNormals();
      sGroup.rotation.y   = t * 0.1;
      morphMesh.rotation.x = t * 0.06;
      cMat.emissiveIntensity  = 0.4 + Math.sin(t * 1.8) * 0.2;
      sLight.intensity        = 8   + Math.sin(t * 2)   * 4;
      rings.forEach(r => {
        r.ph = (r.ph + 0.003) % 1;
        r.mesh.scale.setScalar(1 + r.ph * 3);
        r.mat.opacity = Math.max(0, 0.28 * Math.pow(1 - r.ph, 2));
      });

      // Drift particles upward, wrap at top
      for (let i = 0; i < PC; i++) {
        ppArr[i*3+1] += pvArr[i];
        if (ppArr[i*3+1] > 7) ppArr[i*3+1] = -3;
      }
      ppAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    // ── Resize ──────────────────────────────────────────────
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      [gNormal, gHub, gAlert, lGeo, morphGeo, cGeo, rGeo, ppGeo].forEach(g => g.dispose());
      nodes.forEach(n => n.mat.dispose());
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ position: 'fixed', inset: 0, zIndex: -2, pointerEvents: 'none' }}
    />
  );
}
