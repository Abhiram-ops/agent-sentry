'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

interface CyberNode {
  mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial;
  vel: THREE.Vector3; phase: number; phaseSpeed: number;
  type: 'normal' | 'hub' | 'alert';
}
interface DataPacket { from: number; to: number; progress: number; speed: number; }
interface ArcLine { line: THREE.Line; mat: THREE.LineBasicMaterial; phase: number; }

// ── Globe helpers ────────────────────────────────────────
function latLon(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r  * Math.cos(phi),
    r  * Math.sin(phi) * Math.sin(theta),
  );
}

// ── Shader for morphing sphere ───────────────────────────
const SPHERE_VERT = `
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec2 vUv;
void main(){
  vNormal  = normalize(normalMatrix * normal);
  vUv      = uv;
  vec4 mv  = modelViewMatrix * vec4(position,1.0);
  vViewDir = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const SPHERE_FRAG = `
uniform float uTime;
uniform vec3  uColor;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec2 vUv;
void main(){
  float fr   = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 2.8);
  float gx   = step(0.93, fract(vUv.x * 18.0));
  float gy   = step(0.93, fract(vUv.y * 10.0));
  float grid = max(gx, gy);
  float band = pow(max(0.0, sin(vUv.y * 12.0 - uTime * 2.2)), 5.0) * 0.55;
  float br   = fr * 0.75 + grid * 0.55 + band;
  gl_FragColor = vec4(uColor * br, 0.12 + fr * 0.5 + grid * 0.28);
}`;

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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // ── Bloom composer ──────────────────────────────────────
    const scene  = new THREE.Scene();
    scene.fog    = new THREE.FogExp2(0x04040e, 0.048);
    const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 2.5, 9);
    camera.lookAt(0, 0, -1);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.72,   // strength
      0.38,   // radius
      0.12,   // threshold
    );
    composer.addPass(bloom);

    // ── Grid floor ──────────────────────────────────────────
    const grid = new THREE.GridHelper(60, 50, new THREE.Color(0x003322), new THREE.Color(0x001a0d));
    grid.position.y = -2.5;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.6;
    scene.add(grid);

    // ── Lights ──────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x001a0d, 4));
    const gLight = new THREE.PointLight(0x00ff88, 20, 20); gLight.position.set(2.5, 1, 0);   scene.add(gLight);
    const bLight = new THREE.PointLight(0x0044ff,  6, 16); bLight.position.set(-4,  3, -3);  scene.add(bLight);
    const cLight = new THREE.PointLight(0x00aaff,  4, 14); cLight.position.set( 5,  0,  2);  scene.add(cLight);
    const gbLight = new THREE.PointLight(0x00ff88,  8, 18); gbLight.position.set(-2.5, 1, -2); scene.add(gbLight);

    // ── Network nodes ────────────────────────────────────────
    const gNormal = new THREE.SphereGeometry(0.07, 8, 8);
    const gHub    = new THREE.SphereGeometry(0.15, 12, 12);
    const gAlert  = new THREE.SphereGeometry(0.09, 8, 8);
    const nodes: CyberNode[] = [];
    for (let i = 0; i < 48; i++) {
      const rnd  = Math.random();
      const type: CyberNode['type'] = rnd < 0.07 ? 'hub' : rnd < 0.16 ? 'alert' : 'normal';
      const hex  = type === 'hub' ? 0x00aaff : type === 'alert' ? 0xff3344 : 0x00ff88;
      const geo  = type === 'hub' ? gHub : type === 'alert' ? gAlert : gNormal;
      const mat  = new THREE.MeshStandardMaterial({
        color: new THREE.Color(hex), emissive: new THREE.Color(hex),
        emissiveIntensity: 1.4, metalness: 0.7, roughness: 0.3,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set((Math.random()-0.5)*22, Math.random()*5.5-1, (Math.random()-0.5)*14-1);
      scene.add(mesh);
      nodes.push({ mesh, mat, vel: new THREE.Vector3((Math.random()-0.5)*0.004,(Math.random()-0.5)*0.003,(Math.random()-0.5)*0.003),
        phase: Math.random()*Math.PI*2, phaseSpeed: 0.6+Math.random()*1.4, type });
    }

    // ── Connection lines ─────────────────────────────────────
    const MAX_C = 150;
    const lPos  = new Float32Array(MAX_C * 6);
    const lAttr = new THREE.BufferAttribute(lPos, 3); lAttr.setUsage(THREE.DynamicDrawUsage);
    const lGeo  = new THREE.BufferGeometry(); lGeo.setAttribute('position', lAttr);
    const lineSeg = new THREE.LineSegments(lGeo, new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.12 }));
    scene.add(lineSeg);
    let conns: [number, number][] = [];
    const rebuildConns = () => {
      conns = [];
      for (let i = 0; i < nodes.length && conns.length < MAX_C; i++) {
        let c = 0;
        for (let j = i+1; j < nodes.length && c < 3; j++) {
          if (nodes[i].mesh.position.distanceTo(nodes[j].mesh.position) < 5.5) { conns.push([i,j]); c++; }
        }
      }
    };
    rebuildConns();
    const updateLines = () => {
      conns.forEach(([i,j],c) => { const a=nodes[i].mesh.position,b=nodes[j].mesh.position; lPos[c*6]=a.x;lPos[c*6+1]=a.y;lPos[c*6+2]=a.z;lPos[c*6+3]=b.x;lPos[c*6+4]=b.y;lPos[c*6+5]=b.z; });
      lGeo.setDrawRange(0, conns.length*2); lAttr.needsUpdate = true;
    };

    // ── Data packets ─────────────────────────────────────────
    const MAX_P = 20; const pDummy = new THREE.Object3D();
    const pInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05,6,6), new THREE.MeshBasicMaterial({ color: 0x00ffaa }), MAX_P);
    pInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(pInst);
    let packets: DataPacket[] = [];

    // ── CYBER GLOBE (left side) ──────────────────────────────
    const globeGroup = new THREE.Group(); globeGroup.position.set(-2.5, 0.3, -2); scene.add(globeGroup);

    // Dark sphere body
    globeGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.8, 48, 32),
      new THREE.MeshPhongMaterial({ color: 0x000d07, transparent: true, opacity: 0.92, shininess: 60 })));

    // Wireframe grid
    const wGeo = new THREE.SphereGeometry(1.83, 16, 10);
    globeGroup.add(new THREE.Mesh(wGeo, new THREE.MeshBasicMaterial({ color: 0x00ff88, wireframe: true, transparent: true, opacity: 0.16 })));

    // Atmosphere back-face glow
    globeGroup.add(new THREE.Mesh(new THREE.SphereGeometry(2.05, 24, 16), new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.06, side: THREE.BackSide })));
    globeGroup.add(new THREE.Mesh(new THREE.SphereGeometry(2.22, 20, 12), new THREE.MeshBasicMaterial({ color: 0x004422, transparent: true, opacity: 0.04, side: THREE.BackSide })));

    // City/server nodes on the globe
    const CITIES = [
      [40.7,-74],[51.5,-0.1],[48.9,2.3],[35.7,139.7],[37.6,-122.4],
      [1.3,103.8],[19.1,72.9],[-23.5,-46.6],[25.2,55.3],[55.8,37.6],
      [-33.9,151.2],[52.5,13.4],[37.6,127],[41.9,-87.6],
    ] as [number,number][];
    const cityMeshes: THREE.Mesh[] = [];
    const cityGeo = new THREE.SphereGeometry(0.04, 8, 8);
    CITIES.forEach(([lat,lon]) => {
      const mat = new THREE.MeshStandardMaterial({ color: 0x00ffaa, emissive: new THREE.Color(0x00ffaa), emissiveIntensity: 1.5 });
      const m = new THREE.Mesh(cityGeo, mat); m.position.copy(latLon(lat, lon, 1.87)); globeGroup.add(m); cityMeshes.push(m);
    });

    // Arc connections between cities
    const ARC_PAIRS = [[0,1],[1,4],[0,3],[2,9],[3,5],[5,6],[7,8],[10,11],[12,13],[4,12]];
    const arcLines: ArcLine[] = [];
    ARC_PAIRS.forEach(([a,b],i) => {
      const p1 = latLon(CITIES[a][0], CITIES[a][1], 1.87);
      const p2 = latLon(CITIES[b][0], CITIES[b][1], 1.87);
      const mid = p1.clone().add(p2).normalize().multiplyScalar(2.5);
      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      const pts = curve.getPoints(48);
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0 });
      const line = new THREE.Line(geo, mat);
      arcLines.push({ line, mat, phase: (i/ARC_PAIRS.length)*Math.PI*2 });
      globeGroup.add(line);
    });

    // ── Morphing sphere (upgraded — ShaderMaterial) ──────────
    const morphGeo  = new THREE.IcosahedronGeometry(1.5, 4);
    const origP     = Float32Array.from(morphGeo.attributes.position.array as Float32Array);
    const sphereUniforms = {
      uTime:  { value: 0 },
      uColor: { value: new THREE.Color(0x00ff88) },
    };
    const morphMesh = new THREE.Mesh(morphGeo, new THREE.ShaderMaterial({
      vertexShader: SPHERE_VERT, fragmentShader: SPHERE_FRAG,
      uniforms: sphereUniforms, transparent: true, side: THREE.FrontSide, depthWrite: false,
    }));
    const cMat = new THREE.MeshStandardMaterial({
      color: 0x001a0d, emissive: new THREE.Color(0x00ff88),
      emissiveIntensity: 1.6, metalness: 0.9, roughness: 0.2, transparent: true, opacity: 0.85,
    });
    const coreMesh = new THREE.Mesh(new THREE.SphereGeometry(1.0, 64, 64), cMat);
    const atmMesh  = new THREE.Mesh(new THREE.SphereGeometry(2.2, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.022, side: THREE.BackSide }));
    const sLight = new THREE.PointLight(0x00ff88, 14, 14);
    const sGroup = new THREE.Group();
    sGroup.add(morphMesh, coreMesh, atmMesh, sLight);
    sGroup.position.set(2.5, 0.3, -1.5);
    scene.add(sGroup);

    // Pulse rings
    const rGeo  = new THREE.TorusGeometry(1, 0.012, 8, 80);
    const rings: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; ph: number }[] = [];
    for (let i = 0; i < 3; i++) {
      const m = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0 });
      const r = new THREE.Mesh(rGeo, m); r.rotation.x = Math.PI/2;
      rings.push({ mesh: r, mat: m, ph: i/3 }); sGroup.add(r);
    }

    // ── Particle cloud ───────────────────────────────────────
    const PC = 2000; const ppArr = new Float32Array(PC*3); const pvArr = new Float32Array(PC);
    for (let i=0;i<PC;i++){ppArr[i*3]=(Math.random()-0.5)*32;ppArr[i*3+1]=Math.random()*10-3;ppArr[i*3+2]=(Math.random()-0.5)*22;pvArr[i]=0.003+Math.random()*0.004;}
    const ppGeo = new THREE.BufferGeometry(); const ppAttr = new THREE.BufferAttribute(ppArr,3); ppAttr.setUsage(THREE.DynamicDrawUsage); ppGeo.setAttribute('position',ppAttr);
    scene.add(new THREE.Points(ppGeo, new THREE.PointsMaterial({ color: 0x00ff88, size: 0.035, transparent: true, opacity: 0.45, sizeAttenuation: true })));

    // ── Animation loop ───────────────────────────────────────
    let animId: number, lastCR = 0, lastPS = 0;

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const t = time * 0.001;

      // Camera gentle arc
      camera.position.x = Math.sin(t * 0.05) * 2;
      camera.position.y = 2.5 + Math.sin(t * 0.07) * 0.35;
      camera.lookAt(0, 0, -1.5);

      // Node drift + emissive pulse
      nodes.forEach(n => {
        n.mesh.position.add(n.vel);
        const { x, y, z } = n.mesh.position;
        if (x>11||x<-11) n.vel.x*=-1; if (y>4||y<-1.5) n.vel.y*=-1; if (z>6||z<-8) n.vel.z*=-1;
        n.phase += n.phaseSpeed * 0.016;
        n.mat.emissiveIntensity = 0.8 + Math.sin(n.phase) * 0.7;
      });

      // Rebuild connections every 4 s
      if (t - lastCR > 4) { rebuildConns(); lastCR = t; }
      updateLines();

      // Spawn data packets
      if (t-lastPS > 0.45 && packets.length < MAX_P && conns.length > 0) {
        const [f,to] = conns[Math.floor(Math.random()*conns.length)];
        packets.push({ from:f, to, progress:0, speed:0.012+Math.random()*0.022 }); lastPS = t;
      }
      packets = packets.filter(p=>{ p.progress+=p.speed; return p.progress<=1; });
      for (let i=0;i<MAX_P;i++) {
        if (i<packets.length) {
          const p=packets[i]; pDummy.position.lerpVectors(nodes[p.from].mesh.position,nodes[p.to].mesh.position,p.progress); pDummy.scale.setScalar(1);
        } else { pDummy.position.set(0,-1000,0); pDummy.scale.setScalar(0); }
        pDummy.updateMatrix(); pInst.setMatrixAt(i,pDummy.matrix);
      }
      pInst.instanceMatrix.needsUpdate = true;

      // ── Globe ──────────────────────────────────────────────
      globeGroup.rotation.y = t * 0.09;
      cityMeshes.forEach((m,i) => { (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0 + Math.sin(t*2+i*0.6)*0.6; });
      arcLines.forEach(({ mat, phase }) => { mat.opacity = Math.max(0, Math.sin(t*1.6+phase)) * 0.55; });

      // ── Morphing sphere ────────────────────────────────────
      const mp = morphGeo.attributes.position as THREE.BufferAttribute;
      for (let i=0;i<mp.count;i++) {
        const ox=origP[i*3],oy=origP[i*3+1],oz=origP[i*3+2];
        const d = Math.sin(ox*2.8+t*0.7)*Math.cos(oy*2.2+t*0.55)*Math.sin(oz*2.6+t*0.45);
        const s = 1+d*0.2; mp.setXYZ(i,ox*s,oy*s,oz*s);
      }
      mp.needsUpdate = true; morphGeo.computeVertexNormals();
      sphereUniforms.uTime.value = t;
      sGroup.rotation.y    = t * 0.1;
      morphMesh.rotation.x = t * 0.06;
      cMat.emissiveIntensity  = 1.2 + Math.sin(t*1.8)*0.5;
      sLight.intensity        = 12  + Math.sin(t*2)*5;
      rings.forEach(r => {
        r.ph = (r.ph+0.003)%1;
        r.mesh.scale.setScalar(1+r.ph*3);
        r.mat.opacity = Math.max(0, 0.28*Math.pow(1-r.ph,2));
      });

      // ── Particles drift upward ─────────────────────────────
      for (let i=0;i<PC;i++) { ppArr[i*3+1]+=pvArr[i]; if(ppArr[i*3+1]>7) ppArr[i*3+1]=-3; }
      ppAttr.needsUpdate = true;

      composer.render();
    };
    animId = requestAnimationFrame(animate);

    // ── Resize ──────────────────────────────────────────────
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
      bloom.resolution.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      composer.dispose();
      [gNormal,gHub,gAlert,lGeo,wGeo,morphGeo,rGeo,ppGeo,cityGeo].forEach(g=>g.dispose());
      nodes.forEach(n=>n.mat.dispose());
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ position:'fixed', inset:0, zIndex:-2, pointerEvents:'none' }}
    />
  );
}
