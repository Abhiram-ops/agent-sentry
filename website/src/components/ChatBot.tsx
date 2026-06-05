"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, ChevronDown, Code2 } from "lucide-react";

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
    if (line.startsWith("```")) {
      if (!inCode) {
        inCode = true; codeLines = []; codeLang = line.slice(3).trim();
      } else {
        out.push(
          <pre key={i} style={{ background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.12)", borderRadius: 8, padding: "10px 12px", margin: "8px 0", fontSize: 12, fontFamily: "monospace", overflowX: "auto", color: "#00ff88", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {codeLang && <div style={{ color: "#555", fontSize: 10, marginBottom: 4 }}>{codeLang}</div>}
            {codeLines.join("\n")}
          </pre>
        );
        inCode = false; codeLines = [];
      }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }

    const parts = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    const rendered = parts.map((p, j) => {
      if (p.startsWith("**") && p.endsWith("**")) return <strong key={j} style={{ color: "#fff" }}>{p.slice(2, -2)}</strong>;
      if (p.startsWith("`") && p.endsWith("`")) return <code key={j} style={{ background: "rgba(0,255,136,0.1)", padding: "1px 5px", borderRadius: 4, fontSize: 11, color: "#00ff88", fontFamily: "monospace" }}>{p.slice(1, -1)}</code>;
      return p;
    });
    if (line.startsWith("## ")) out.push(<div key={i} style={{ fontWeight: 700, color: "#fff", marginTop: 10, marginBottom: 4, fontSize: 13 }}>{line.slice(3)}</div>);
    else if (line.startsWith("- ")) out.push(<div key={i} style={{ paddingLeft: 12, color: "#ccc", fontSize: 13, lineHeight: 1.6 }}>• {rendered.slice(1)}</div>);
    else if (line.trim()) out.push(<div key={i} style={{ color: "#ccc", fontSize: 13, lineHeight: 1.6, marginBottom: 2 }}>{rendered}</div>);
    else out.push(<div key={i} style={{ height: 6 }} />);
  }
  return <>{out}</>;
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: "Hey! I'm the AgentSentry assistant with access to the live codebase. Ask me anything — setup, scanning, risk scoring, fixing findings, or how the code works." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 520);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 200); }
  }, [open]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content };
    const history = [...msgs, userMsg];
    setMsgs(history);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map(m => ({ role: m.role, content: m.content })) }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let assistantText = "";
      setMsgs(prev => [...prev, { role: "assistant", content: "" }]);

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            assistantText += parsed.text ?? "";
            setMsgs(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: assistantText };
              return updated;
            });
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") throw parseErr;
          }
        }
      }
      if (!open) setUnread(u => u + 1);
    } catch (err) {
      setMsgs(prev => [...prev, {
        role: "assistant",
        content: `Sorry, something went wrong. Please try again in a moment. (${err instanceof Error ? err.message : "Unknown error"})`,
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, msgs, open]);

  const panelStyle: React.CSSProperties = isMobile ? {
    position: "fixed", inset: 0, zIndex: 9000, borderRadius: 0,
    width: "100%", height: "100%", border: "none", display: "flex", flexDirection: "column",
  } : {
    position: "fixed", bottom: 94, right: 24, zIndex: 8999,
    width: "min(390px, calc(100vw - 48px))",
    height: "min(580px, calc(100vh - 120px))",
    borderRadius: 20, border: "1px solid rgba(0,255,136,0.15)",
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ duration: 0.18 }}
            style={{ ...panelStyle, background: "#080e09", boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,255,136,0.08)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(0,255,136,0.12)", border: "1px solid rgba(0,255,136,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Bot size={16} color="#00ff88" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>AgentSentry Assistant</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff88" }} />
                  <span style={{ color: "#555", fontSize: 11 }}>online</span>
                  <Code2 size={10} color="#333" style={{ marginLeft: 4 }} />
                  <span style={{ color: "#333", fontSize: 11 }}>live codebase</span>
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#444", padding: 4, borderRadius: 6, display: "flex" }}>
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
              {msgs.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "85%", padding: "10px 13px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: m.role === "user" ? "#00ff88" : "rgba(255,255,255,0.05)",
                    border: m.role === "user" ? "none" : "1px solid rgba(255,255,255,0.07)",
                  }}>
                    {m.role === "user"
                      ? <span style={{ color: "#000", fontSize: 13, fontWeight: 500 }}>{m.content}</span>
                      : <MarkdownText text={m.content} />}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", gap: 4, padding: "10px 13px", background: "rgba(255,255,255,0.05)", borderRadius: "14px 14px 14px 4px", width: "fit-content", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff88" }}
                      animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                  ))}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick prompts */}
            {msgs.length === 1 && (
              <div style={{ padding: "0 14px 10px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                {QUICK.map(q => (
                  <button key={q} onClick={() => send(q)} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 20, background: "rgba(0,255,136,0.07)", border: "1px solid rgba(0,255,136,0.15)", color: "#00ff88", cursor: "pointer", whiteSpace: "nowrap" }}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8, flexShrink: 0 }}>
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask anything about AgentSentry..."
                style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit" }}
              />
              <button onClick={() => send()} disabled={!input.trim() || loading}
                style={{ width: 38, height: 38, borderRadius: 12, background: input.trim() && !loading ? "#00ff88" : "rgba(255,255,255,0.05)", border: "none", cursor: input.trim() && !loading ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}>
                <Send size={15} color={input.trim() && !loading ? "#000" : "#333"} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button onClick={() => setOpen(o => !o)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9001, width: 54, height: 54, borderRadius: "50%", background: "#00ff88", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,255,136,0.4)" }}>
        {open ? <ChevronDown size={22} color="#000" /> : <Bot size={22} color="#000" />}
        {!open && unread > 0 && (
          <div style={{ position: "absolute", top: -2, right: -2, width: 18, height: 18, borderRadius: "50%", background: "#ff3366", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700 }}>
            {unread}
          </div>
        )}
      </motion.button>
    </>
  );
}
