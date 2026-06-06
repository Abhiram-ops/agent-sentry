"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { Container } from "@/components/ui/Container";

// ─── Demo data ─────────────────────────────────────────────────────────────

const NODES = [
  { id:"n1",  name:"ml-pipeline-executor",  type:"IAM Role",          provider:"AWS",    risk:"CRITICAL", score:450, x: 0.0,  y: 0.5,  z: 0.0,  c:0xff3366, r:0.26, mitre:["T1078.004","T1548"],  fix:"Apply least-privilege policy; remove AdministratorAccess." },
  { id:"n2",  name:"langchain-crm-agent",   type:"AI Agent",          provider:"AWS",    risk:"CRITICAL", score:300, x:-1.4,  y: 0.0,  z: 0.9,  c:0xff3366, r:0.22, mitre:["T1059","T1078"],     fix:"Add human-in-the-loop approval before irreversible tool calls." },
  { id:"n3",  name:"prod-db-admin",         type:"K8s ServiceAccount",provider:"K8s",    risk:"CRITICAL", score:280, x: 1.7,  y:-0.5,  z: 0.6,  c:0xff3366, r:0.20, mitre:["T1078.004"],         fix:"Replace cluster-admin binding with a namespaced Role + RoleBinding." },
  { id:"n4",  name:"github-deploy-key",     type:"Deploy Key",        provider:"GitHub", risk:"HIGH",     score: 85, x:-2.1,  y: 1.1,  z:-0.6,  c:0xffcc00, r:0.16, mitre:["T1552.004"],         fix:"Use read-only deploy keys; rotate every 90 days." },
  { id:"n5",  name:"azure-billing-sp",      type:"Service Principal", provider:"Azure",  risk:"HIGH",     score: 75, x: 2.4,  y: 0.8,  z:-1.0,  c:0xffcc00, r:0.15, mitre:["T1078.004"],         fix:"Scope Contributor role to resource group, not subscription." },
  { id:"n6",  name:"ci-pipeline-sa",        type:"Service Account",   provider:"GCP",    risk:"HIGH",     score: 68, x:-1.0,  y:-1.4,  z:-0.6,  c:0xffcc00, r:0.14, mitre:["T1078"],             fix:"Use Workload Identity instead of user-managed SA keys." },
  { id:"n7",  name:"reporting-api-key",     type:"API Key",           provider:"Local",  risk:"HIGH",     score: 60, x: 1.1,  y: 1.7,  z: 0.5,  c:0xffcc00, r:0.13, mitre:["T1552.001"],         fix:"Rotate key; move to secrets manager; add to .gitignore." },
  { id:"n8",  name:"staging-runner",        type:"IAM Role",          provider:"AWS",    risk:"MEDIUM",   score: 35, x:-2.7,  y:-0.4,  z: 0.4,  c:0xff8800, r:0.11, mitre:["T1078"],             fix:"Restrict to specific S3 bucket and Lambda function." },
  { id:"n9",  name:"dev-access-key",        type:"API Key",           provider:"AWS",    risk:"MEDIUM",   score: 28, x: 0.5,  y:-2.1,  z: 0.7,  c:0xff8800, r:0.10, mitre:["T1552"],             fix:"Enforce 90-day rotation with AWS IAM credential report." },
  { id:"n10", name:"webapp-sa",             type:"K8s ServiceAccount",provider:"K8s",    risk:"MEDIUM",   score: 22, x: 2.7,  y:-1.1,  z: 0.5,  c:0xff8800, r:0.10, mitre:["T1552.007"],         fix:"Set automountServiceAccountToken: false." },
  { id:"n11", name:"monitoring-agent",      type:"Service Account",   provider:"GCP",    risk:"LOW",      score:  8, x:-1.7,  y: 1.9,  z:-1.0,  c:0x00cc66, r:0.08, mitre:[],                    fix:"No immediate action needed. Review in next quarterly audit." },
  { id:"n12", name:"backup-service",        type:"IAM Role",          provider:"AWS",    risk:"LOW",      score:  6, x: 1.4,  y:-1.7,  z:-1.4,  c:0x00cc66, r:0.08, mitre:[],                    fix:"No immediate action needed." },
];

const EDGES = [
  ["n1","n2",0.35], ["n1","n3",0.30], ["n2","n9",0.20],
  ["n3","n10",0.22],["n4","n6",0.20], ["n6","n1",0.28],
  ["n5","n7",0.18], ["n8","n9",0.15], ["n11","n12",0.12],
  ["n7","n8",0.12], ["n4","n7",0.15],
];

const RISK_COLOR: Record<string, string> = {
  CRITICAL: "#ff3366", HIGH: "#ffcc00", MEDIUM: "#ff8800", LOW: "#00cc66",
};
const RISK_BG: Record<string, string> = {
  CRITICAL: "rgba(255,51,102,0.12)", HIGH: "rgba(255,204,0,0.10)", MEDIUM: "rgba(255,136,0,0.10)", LOW: "rgba(0,204,102,0.10)",
};
const PROVIDER_COLOR: Record<string, string> = {
  AWS: "#FF9900", Azure: "#0089D6", GCP: "#4285F4", GitHub: "#58a6ff", K8s: "#326CE5", Local: "#00ff88",
};

// ─── Three.js scene (client-only) ─────────────────────────────────────────

function GraphCanvas({ onSelect }: { onSelect: (id: string | null) => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rafRef   = useRef<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stateRef = useRef({ drag: false, prevMouse: { x:0,y:0 }, rotY: -0.3, rotX: 0.15, zoom: 9, hoverId: null as string|null });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meshMapRef = useRef<Map<string, any>>(new Map());

  const onSelectCb = useCallback(onSelect, [onSelect]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || typeof window === "undefined") return;
    let running = true;

    import("three").then((THREE) => {
      if (!running || !mount) return;

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x000000, 0.08);

      const W = mount.clientWidth, H = mount.clientHeight;
      const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
      camera.position.set(0, 0, stateRef.current.zoom);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);

      const group = new THREE.Group();
      scene.add(group);

      // Build node meshes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const meshes: any[] = [];
      NODES.forEach(n => {
        const geo = new THREE.SphereGeometry(n.r, 24, 24);
        const mat = new THREE.MeshBasicMaterial({ color: n.c });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(n.x, n.y, n.z);
        mesh.userData = { id: n.id };
        group.add(mesh);
        meshes.push(mesh);
        meshMapRef.current.set(n.id, mesh);

        // Outer glow shell
        const geoGlow = new THREE.SphereGeometry(n.r * 1.9, 24, 24);
        const matGlow = new THREE.MeshBasicMaterial({ color: n.c, transparent: true, opacity: 0.05 });
        const glow = new THREE.Mesh(geoGlow, matGlow);
        glow.position.copy(mesh.position);
        group.add(glow);
        mesh.userData.glow = glow;
        mesh.userData.glowMat = matGlow;
      });

      // Build edges
      EDGES.forEach(([a, b, op]) => {
        const na = NODES.find(n => n.id === a)!;
        const nb = NODES.find(n => n.id === b)!;
        const pts = [new THREE.Vector3(na.x,na.y,na.z), new THREE.Vector3(nb.x,nb.y,nb.z)];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const col = NODES.find(n=>n.id===a)!.c;
        const mat = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op as number });
        group.add(new THREE.Line(geo, mat));
      });

      const raycaster = new THREE.Raycaster();
      const mousePt   = new THREE.Vector2();
      let selectedId: string | null = null;
      let t = 0;

      // Mouse events
      const getMouseNorm = (e: MouseEvent) => {
        const rect = mount.getBoundingClientRect();
        return {
          nx: ((e.clientX - rect.left) / rect.width)  * 2 - 1,
          ny: -((e.clientY - rect.top) / rect.height) * 2 + 1,
        };
      };

      const onDown = (e: MouseEvent) => {
        stateRef.current.drag = true;
        stateRef.current.prevMouse = { x: e.clientX, y: e.clientY };
      };
      const onUp = (e: MouseEvent) => {
        const moved = Math.abs(e.clientX - stateRef.current.prevMouse.x) < 3 &&
                      Math.abs(e.clientY - stateRef.current.prevMouse.y) < 3;
        stateRef.current.drag = false;
        if (moved) {
          const { nx, ny } = getMouseNorm(e);
          mousePt.set(nx, ny);
          raycaster.setFromCamera(mousePt, camera);
          const hits = raycaster.intersectObjects(meshes);
          if (hits.length > 0) {
            selectedId = hits[0].object.userData.id;
            onSelectCb(selectedId);
          } else {
            selectedId = null;
            onSelectCb(null);
          }
        }
      };
      const onMove = (e: MouseEvent) => {
        const s = stateRef.current;
        if (s.drag) {
          s.rotY += (e.clientX - s.prevMouse.x) * 0.006;
          s.rotX += (e.clientY - s.prevMouse.y) * 0.006;
          s.rotX  = Math.max(-1.1, Math.min(1.1, s.rotX));
          s.prevMouse = { x: e.clientX, y: e.clientY };
          return;
        }
        // Hover
        const { nx, ny } = getMouseNorm(e);
        mousePt.set(nx, ny);
        raycaster.setFromCamera(mousePt, camera);
        const hits = raycaster.intersectObjects(meshes);
        const hid = hits.length > 0 ? hits[0].object.userData.id as string : null;
        s.hoverId = hid;
        mount.style.cursor = hid ? "pointer" : "grab";
      };
      const onWheel = (e: WheelEvent) => {
        stateRef.current.zoom = Math.max(4, Math.min(16, stateRef.current.zoom + e.deltaY * 0.012));
      };

      mount.addEventListener("mousedown", onDown);
      window.addEventListener("mouseup", onUp);
      mount.addEventListener("mousemove", onMove);
      mount.addEventListener("wheel", onWheel, { passive: true });

      const onResize = () => {
        if (!mount || !running) return;
        camera.aspect = mount.clientWidth / mount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mount.clientWidth, mount.clientHeight);
      };
      window.addEventListener("resize", onResize);

      const animate = () => {
        if (!running) return;
        rafRef.current = requestAnimationFrame(animate);
        t += 0.003;
        const s = stateRef.current;

        if (!s.drag) s.rotY += 0.0025;
        group.rotation.y = s.rotY;
        group.rotation.x = s.rotX;
        camera.position.z += (s.zoom - camera.position.z) * 0.08;
        camera.lookAt(0, 0, 0);

        // Update node effects
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meshes.forEach((m: any) => {
          const id   = m.userData.id as string;
          const node = NODES.find(n => n.id === id)!;
          const isHover    = s.hoverId === id;
          const isSelected = selectedId === id;
          const baseScale  = 1 + Math.sin(t * 2 + NODES.indexOf(node)) * 0.04;
          const scale = isSelected ? 1.35 : isHover ? 1.18 : baseScale;
          m.scale.setScalar(scale + (scale - m.scale.x) * 0.15);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const gm = m.userData.glowMat as any;
          if (gm) gm.opacity = isSelected ? 0.18 : isHover ? 0.12 : 0.04;
        });

        renderer.render(scene, camera);
      };
      animate();

      const cleanup = () => {
        mount.removeEventListener("mousedown", onDown);
        window.removeEventListener("mouseup", onUp);
        mount.removeEventListener("mousemove", onMove);
        mount.removeEventListener("wheel", onWheel);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      };
      (mount as HTMLDivElement & { _cleanup?: () => void })._cleanup = cleanup;
    });

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      const el = mount as HTMLDivElement & { _cleanup?: () => void };
      el._cleanup?.();
    };
  }, [onSelectCb]);

  return <div ref={mountRef} style={{ width: "100%", height: "100%", cursor: "grab" }} />;
}

const GraphCanvasNoSSR = dynamic(() => Promise.resolve(GraphCanvas), { ssr: false });

// ─── Section ───────────────────────────────────────────────────────────────

export default function InteractiveGraph() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = NODES.find(n => n.id === selectedId) ?? null;

  return (
    <section id="demo" style={{ padding: "120px 0", position: "relative", overflow: "hidden" }}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

      <Container>
        {/* Header */}
        <motion.div initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }}
          viewport={{ once:true, margin:"-80px" }} transition={{ duration:0.5 }}
          style={{ marginBottom:48, textAlign:"center" }}>
          <div style={{ fontFamily:"monospace", fontSize:11, color:"#00ff88", marginBottom:16, letterSpacing:"0.2em", textTransform:"uppercase" }}>Live Demo</div>
          <h2 style={{ fontSize:"clamp(2rem,3.5vw,3rem)", fontWeight:700, color:"#fff", marginBottom:16, lineHeight:1.1, letterSpacing:"-0.02em" }}>
            Explore a real attack graph.
          </h2>
          <p style={{ color:"#4a4a4a", fontSize:"clamp(0.95rem,1.4vw,1.05rem)", lineHeight:1.75 }}>
            Drag to rotate · Scroll to zoom · <span style={{ color:"#00ff88" }}>Click a node</span> to inspect
          </p>
        </motion.div>

        {/* Main layout */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:20, height:480 }} className="graph-layout">
          {/* Canvas */}
          <div style={{ borderRadius:16, overflow:"hidden", border:"1px solid rgba(255,255,255,0.06)", background:"#050505", position:"relative" }}>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00ff88]/20 to-transparent" />
            <GraphCanvasNoSSR onSelect={setSelectedId} />

            {/* Legend */}
            <div style={{ position:"absolute", bottom:14, left:14, display:"flex", gap:12, flexWrap:"wrap" }}>
              {[["CRITICAL","#ff3366"],["HIGH","#ffcc00"],["MEDIUM","#ff8800"],["LOW","#00cc66"]].map(([l,c])=>(
                <div key={l} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:"#444", fontFamily:"monospace" }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", background:c, display:"inline-block" }} />{l}
                </div>
              ))}
            </div>
          </div>

          {/* Info panel */}
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div key={selected.id} initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:20 }} transition={{ duration:0.2 }}
                style={{ borderRadius:16, border:`1px solid ${RISK_COLOR[selected.risk]}28`, background:"linear-gradient(160deg,#070707,#050505)", overflow:"hidden", display:"flex", flexDirection:"column" }}>
                <div style={{ height:3, background:`linear-gradient(90deg,transparent,${RISK_COLOR[selected.risk]},transparent)` }} />
                <div style={{ padding:"24px 22px", display:"flex", flexDirection:"column", gap:18, flex:1 }}>
                  {/* Risk badge */}
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontFamily:"monospace", fontWeight:700, background:RISK_BG[selected.risk], color:RISK_COLOR[selected.risk], border:`1px solid ${RISK_COLOR[selected.risk]}30` }}>
                      {selected.risk}
                    </span>
                    <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontFamily:"monospace", background:"rgba(255,255,255,0.04)", color:PROVIDER_COLOR[selected.provider] || "#888", border:"1px solid rgba(255,255,255,0.06)" }}>
                      {selected.provider}
                    </span>
                  </div>

                  {/* Name */}
                  <div>
                    <div style={{ color:"#fff", fontWeight:700, fontSize:16, letterSpacing:"-0.01em", lineHeight:1.3, marginBottom:4 }}>{selected.name}</div>
                    <div style={{ color:"#444", fontSize:12, fontFamily:"monospace" }}>{selected.type}</div>
                  </div>

                  {/* Score */}
                  <div style={{ padding:"14px 16px", borderRadius:10, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ fontSize:10, fontFamily:"monospace", color:"#333", marginBottom:6, letterSpacing:"0.1em", textTransform:"uppercase" }}>Risk Score</div>
                    <div style={{ fontSize:32, fontWeight:700, color:RISK_COLOR[selected.risk], fontFamily:"monospace", lineHeight:1 }}>{selected.score.toFixed(1)}</div>
                    {/* Score bar */}
                    <div style={{ marginTop:8, height:3, borderRadius:2, background:"rgba(255,255,255,0.06)" }}>
                      <div style={{ height:"100%", borderRadius:2, width:`${Math.min(100, selected.score/5)}%`, background:RISK_COLOR[selected.risk], transition:"width 0.5s ease" }} />
                    </div>
                  </div>

                  {/* MITRE */}
                  {selected.mitre.length > 0 && (
                    <div>
                      <div style={{ fontSize:10, fontFamily:"monospace", color:"#333", marginBottom:8, letterSpacing:"0.1em", textTransform:"uppercase" }}>MITRE ATT&amp;CK</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                        {selected.mitre.map(technique => (
                          <span key={technique} style={{ padding:"2px 8px", borderRadius:4, fontSize:10, fontFamily:"monospace", background:"rgba(255,255,255,0.04)", color:"#555", border:"1px solid rgba(255,255,255,0.06)" }}>{technique}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fix */}
                  <div style={{ padding:"12px 14px", borderRadius:10, background:"rgba(0,255,136,0.04)", border:"1px solid rgba(0,255,136,0.10)" }}>
                    <div style={{ fontSize:10, fontFamily:"monospace", color:"#00ff88", marginBottom:6, letterSpacing:"0.1em", textTransform:"uppercase" }}>Recommended Fix</div>
                    <div style={{ fontSize:13, color:"#4a4a4a", lineHeight:1.65 }}>{selected.fix}</div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                style={{ borderRadius:16, border:"1px solid rgba(255,255,255,0.05)", background:"rgba(255,255,255,0.01)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14, padding:32 }}>
                <div style={{ width:48, height:48, borderRadius:"50%", border:"1px solid rgba(0,255,136,0.15)", background:"rgba(0,255,136,0.05)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                  </svg>
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ color:"#fff", fontWeight:600, fontSize:15, marginBottom:8 }}>Click any node</div>
                  <div style={{ color:"#3a3a3a", fontSize:13, lineHeight:1.65 }}>Select an identity to see its risk score, MITRE techniques, and remediation steps.</div>
                </div>
                <div style={{ fontSize:11, color:"#2a2a2a", fontFamily:"monospace", marginTop:4 }}>
                  {NODES.filter(n=>n.risk==="CRITICAL").length} critical  ·  {NODES.filter(n=>n.risk==="HIGH").length} high  ·  {NODES.length} total
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Container>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
      <style>{`
        @media (max-width: 760px) {
          .graph-layout { grid-template-columns: 1fr !important; height: auto !important; }
          .graph-layout > div:first-child { height: 300px; }
        }
      `}</style>
    </section>
  );
}
