"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { X, Send, Bot, ChevronDown, Code2, Sparkles } from "lucide-react";

/* ── Shield icon ─────────────────────────────────────────────────── */
function ShieldFAB({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

type Msg = { role: "user" | "assistant"; content: string };

const QUICK = [
  "How do I install AgentSentry?",
  "How do I scan AWS?",
  "What is P×R×E×A scoring?",
  "How to fix a CRITICAL finding?",
  "What does agentsentry scan all do?",
];

function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let codeLang = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("\`\`\`")) {
      if (!inCode) { inCode = true; codeLines = []; codeLang = line.slice(3).trim(); }
      else {
        out.push(<pre key={i} style={{ background:"rgba(0,255,136,0.05)", border:"1px solid rgba(0,255,136,0.12)", borderRadius:8, padding:"10px 12px", margin:"8px 0", fontSize:12, fontFamily:"monospace", overflowX:"auto", color:"#00ff88", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
          {codeLang && <div style={{ color:"#555", fontSize:10, marginBottom:4 }}>{codeLang}</div>}
          {codeLines.join("\n")}
        </pre>);
        inCode = false; codeLines = [];
      }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }
    const parts = line.split(/(\`[^\`]+\`|\*\*[^*]+\*\*)/g);
    out.push(<span key={i} style={{ display:"block", minHeight: line===""?"0.6em":undefined }}>
      {parts.map((p,j)=>{
        if (p.startsWith("\`") && p.endsWith("\`")) return <code key={j} style={{ fontFamily:"monospace", fontSize:"0.85em", background:"rgba(0,255,136,0.1)", padding:"1px 5px", borderRadius:4, color:"#00ff88" }}>{p.slice(1,-1)}</code>;
        if (p.startsWith("**") && p.endsWith("**")) return <strong key={j} style={{ color:"#e0e0e0" }}>{p.slice(2,-2)}</strong>;
        return <span key={j}>{p}</span>;
      })}
    </span>);
  }
  return <div style={{ lineHeight:1.65 }}>{out}</div>;
}

function TypingDots() {
  return (
    <span style={{ display:"inline-flex", gap:3, alignItems:"center", padding:"2px 0" }}>
      {[0,1,2].map(d=>(
        <motion.span key={d}
          animate={{ scale:[0.8,1.2,0.8], opacity:[0.3,1,0.3] }}
          transition={{ duration:1.2, delay:d*0.2, repeat:Infinity, ease:"easeInOut" }}
          style={{ width:5, height:5, borderRadius:"50%", background:"#444", display:"inline-block" }}
        />
      ))}
    </span>
  );
}

/* ── Pulsing ring around FAB ─────────────────────────────────────── */
function PulsingRing({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <>
      {[0,1].map(i=>(
        <motion.div key={i}
          style={{ position:"absolute", inset:-8-(i*10), borderRadius:"50%", border:"1.5px solid rgba(0,255,136,0.4)", pointerEvents:"none" }}
          animate={{ scale:[1,1.5], opacity:[0.6,0] }}
          transition={{ duration:2, delay:i*0.8, repeat:Infinity, ease:"easeOut" }}
        />
      ))}
    </>
  );
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role:"assistant", content:"Hey! I'm the AgentSentry assistant with access to the live codebase. Ask me anything — setup, scanning, risk scoring, fixing findings, or how the code works." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const [fabPos, setFabPos] = useState({ bottom:28, left:28 });
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 520);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const onScroll = () => setAtTop(window.scrollY < window.innerHeight * 0.85);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive:true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Gemini watermark: right=123px, bottom=108px, 144×138px.
     Cover it completely with FAB + opaque backdrop.
     FAB center at: bottom=177, right=195 → bottom=149, left=vw-223       */
  useEffect(() => {
    const calc = () => {
      if (atTop) setFabPos({ bottom:149, left:window.innerWidth - 223 });
      else        setFabPos({ bottom:28,  left:window.innerWidth - 84  });
    };
    calc(); window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [atTop]);

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(()=>inputRef.current?.focus(),200); }
  }, [open]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    const userMsg: Msg = { role:"user", content };
    const history = [...msgs, userMsg];
    setMsgs(history);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ messages: history.map(m=>({ role:m.role, content:m.content })) }) });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let assistantText = "";
      setMsgs(prev=>[...prev,{ role:"assistant", content:"" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data==="[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            assistantText += parsed.text ?? "";
            setMsgs(prev=>{ const u=[...prev]; u[u.length-1]={ role:"assistant", content:assistantText }; return u; });
          } catch(e){ if(e instanceof Error && e.message!=="Unexpected end of JSON input") throw e; }
        }
      }
      if (!open) setUnread(u=>u+1);
    } catch(err) {
      setMsgs(prev=>[...prev,{ role:"assistant", content:`Sorry, something went wrong. Make sure GROQ_API_KEY is set in Vercel. (${err instanceof Error?err.message:"Unknown error"})` }]);
    } finally { setLoading(false); }
  }, [input, loading, msgs, open]);

  const panelStyle: React.CSSProperties = isMobile ? {
    position:"fixed", inset:0, zIndex:9000, borderRadius:0, width:"100%", height:"100%", border:"none", display:"flex", flexDirection:"column",
  } : {
    position:"fixed", bottom:94, right:24, zIndex:8999,
    width:"min(390px,calc(100vw - 48px))", height:"min(580px,calc(100vh - 120px))",
    borderRadius:20, border:"1px solid rgba(0,255,136,0.15)",
  };

  return (
    <>
      {/* ── Opaque watermark cover (shows only atTop) ─────────────── */}
      <AnimatePresence>
        {atTop && !open && (
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            transition={{ duration:0.4 }}
            style={{
              position:"fixed",
              bottom:108, right:123,
              width:144, height:138,
              background:"#000",
              borderRadius:12,
              zIndex:8999,
              pointerEvents:"none",
            }}
          />
        )}
      </AnimatePresence>

      {/* ── FAB ───────────────────────────────────────────────────── */}
      <motion.button
        onClick={() => setOpen(o=>!o)}
        aria-label="Open AgentSentry assistant"
        animate={{ bottom:fabPos.bottom, left:fabPos.left }}
        transition={{ type:"spring", stiffness:200, damping:24 }}
        whileHover={{ scale:1.08 }}
        whileTap={{ scale:0.92 }}
        style={{
          position:"fixed", zIndex:9001,
          width:56, height:56, borderRadius:"50%",
          background:"linear-gradient(135deg,#00ff88,#00cc6a)",
          border:"none", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow: atTop
            ? "0 0 56px rgba(0,255,136,0.6), 0 8px 32px rgba(0,0,0,0.7)"
            : "0 0 32px rgba(0,255,136,0.45), 0 8px 24px rgba(0,0,0,0.5)",
        }}
      >
        <PulsingRing active={!open && atTop} />
        <AnimatePresence mode="wait">
          {open
            ? <motion.span key="x" initial={{rotate:-90,opacity:0}} animate={{rotate:0,opacity:1}} exit={{rotate:90,opacity:0}} transition={{duration:0.15}}><ChevronDown color="#000" size={22}/></motion.span>
            : <motion.span key="s" initial={{rotate:90,opacity:0}} animate={{rotate:0,opacity:1}} exit={{rotate:-90,opacity:0}} transition={{duration:0.15}}><ShieldFAB/></motion.span>
          }
        </AnimatePresence>
        {unread>0 && !open && (
          <motion.div initial={{scale:0}} animate={{scale:1}} style={{ position:"absolute", top:-2, right:-2, width:18, height:18, borderRadius:"50%", background:"#ff3366", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"#fff", fontWeight:700 }}>
            {unread}
          </motion.div>
        )}
      </motion.button>

      {/* ── Panel ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity:0, y:isMobile?60:32, scale:isMobile?1:0.94, rotateX:isMobile?0:6 }}
            animate={{ opacity:1, y:0, scale:1, rotateX:0 }}
            exit={{ opacity:0, y:isMobile?60:24, scale:isMobile?1:0.96 }}
            transition={{ duration:0.28, ease:[0.16,0.77,0.32,1.00] }}
            style={{ ...panelStyle, background:"#050505", boxShadow:"0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,255,136,0.08), 0 0 80px rgba(0,255,136,0.04)", display:"flex", flexDirection:"column", overflow:"hidden", transformOrigin:"bottom right" }}
          >
            {/* Header */}
            <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} transition={{delay:0.05}}
              style={{ padding:"14px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)", background:"linear-gradient(180deg,#0a0a0a,#080808)", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
              <motion.div whileHover={{scale:1.1,rotate:5}} style={{ width:34, height:34, borderRadius:"50%", background:"rgba(0,255,136,0.1)", border:"1px solid rgba(0,255,136,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Bot style={{ width:16, height:16, color:"#00ff88" }}/>
              </motion.div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ color:"#fff", fontWeight:600, fontSize:14 }}>AgentSentry Assistant</div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <motion.span animate={{opacity:[1,0.3,1]}} transition={{duration:2,repeat:Infinity}} style={{ width:5, height:5, borderRadius:"50%", background:"#00ff88", display:"inline-block", flexShrink:0 }}/>
                  <span style={{ color:"#00ff88", fontSize:10, fontFamily:"monospace" }}>online</span>
                  <span style={{ color:"#333", fontSize:10, display:"flex", alignItems:"center", gap:3 }}>
                    <Sparkles size={9} color="#444"/> live codebase
                  </span>
                </div>
              </div>
              <motion.button whileHover={{scale:1.1,color:"#aaa"}} whileTap={{scale:0.9}} onClick={()=>setOpen(false)}
                style={{ background:"none", border:"none", color:"#555", cursor:"pointer", padding:6, borderRadius:8, display:"flex" }}>
                <X size={16}/>
              </motion.button>
            </motion.div>

            {/* Messages */}
            <div style={{ flex:1, overflowY:"auto", padding:"16px 14px", display:"flex", flexDirection:"column", gap:12, scrollbarWidth:"thin", scrollbarColor:"#222 transparent" }}>
              {msgs.map((m,i)=>(
                <motion.div key={i} initial={{opacity:0,y:12,scale:0.96}} animate={{opacity:1,y:0,scale:1}} transition={{duration:0.22,delay:Math.min(i*0.04,0.2)}}
                  style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
                  <div style={{ maxWidth:"88%", padding:"10px 14px", borderRadius:m.role==="user"?"16px 16px 4px 16px":"4px 16px 16px 16px",
                    background:m.role==="user"?"linear-gradient(135deg,#00ff88,#00cc6a)":"rgba(255,255,255,0.05)",
                    border:m.role==="assistant"?"1px solid rgba(255,255,255,0.07)":"none",
                    color:m.role==="user"?"#000":"#ccc", fontSize:13, wordBreak:"break-word" }}>
                    {m.role==="assistant"
                      ? (m.content===""&&loading ? <TypingDots/> : <MarkdownText text={m.content}/>)
                      : m.content}
                  </div>
                </motion.div>
              ))}
              <div ref={bottomRef}/>
            </div>

            {/* Quick prompts */}
            {msgs.length<=1 && (
              <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.15}}
                style={{ padding:"0 12px 10px", display:"flex", flexWrap:"wrap", gap:6, flexShrink:0 }}>
                {QUICK.map((q,i)=>(
                  <motion.button key={q} initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} transition={{delay:0.2+i*0.05}}
                    whileHover={{scale:1.04, background:"rgba(0,255,136,0.14)"}} whileTap={{scale:0.96}}
                    onClick={()=>send(q)}
                    style={{ padding:"5px 10px", borderRadius:20, fontSize:11, border:"1px solid rgba(0,255,136,0.18)", background:"rgba(0,255,136,0.06)", color:"#00ff88", cursor:"pointer" }}>
                    {q}
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* Input */}
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.1}}
              style={{ padding:"10px 12px", borderTop:"1px solid rgba(255,255,255,0.06)", display:"flex", gap:8, alignItems:"center", flexShrink:0, background:"#050505" }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
                placeholder="Ask anything about AgentSentry…"
                disabled={loading}
                style={{ flex:1, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"10px 14px", color:"#fff", fontSize:13, outline:"none", transition:"border-color 0.15s, box-shadow 0.15s", minWidth:0 }}
                onFocus={e=>{e.target.style.borderColor="rgba(0,255,136,0.35)";e.target.style.boxShadow="0 0 0 3px rgba(0,255,136,0.08)";}}
                onBlur={e=>{e.target.style.borderColor="rgba(255,255,255,0.08)";e.target.style.boxShadow="none";}}
              />
              <motion.button onClick={()=>send()} disabled={!input.trim()||loading}
                whileHover={input.trim()&&!loading?{scale:1.08}:{}}
                whileTap={input.trim()&&!loading?{scale:0.92}:{}}
                animate={{ background:input.trim()&&!loading?"#00ff88":"rgba(255,255,255,0.06)" }}
                style={{ width:40, height:40, borderRadius:12, border:"none", flexShrink:0, cursor:input.trim()&&!loading?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Send size={14} color={input.trim()&&!loading?"#000":"#444"}/>
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
          }
