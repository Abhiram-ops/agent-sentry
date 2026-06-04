"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, ChevronDown } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const QUICK = [
  "How do I install AgentSentry?",
  "How do I scan AWS?",
  "What is P×R×E×A scoring?",
  "How to fix a CRITICAL finding?",
  "What does agentsentry scan all do?",
];

function MarkdownText({ text }: { text: string }) {
  // Simple markdown: **bold**, `code`, code blocks
  const lines = text.split("\n");
  return (
    <div style={{ lineHeight: 1.65 }}>
      {lines.map((line, i) => {
        if (line.startsWith("```")) return null;
        const parts = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
        return (
          <span key={i}>
            {parts.map((p, j) => {
              if (p.startsWith("`") && p.endsWith("`"))
                return <code key={j} style={{ fontFamily: "monospace", fontSize: "0.85em", background: "rgba(0,255,136,0.08)", padding: "1px 5px", borderRadius: 4, color: "#00ff88" }}>{p.slice(1, -1)}</code>;
              if (p.startsWith("**") && p.endsWith("**"))
                return <strong key={j} style={{ color: "#fff" }}>{p.slice(2, -2)}</strong>;
              return <span key={j}>{p}</span>;
            })}
            {i < lines.length - 1 ? <br /> : null}
          </span>
        );
      })}
    </div>
  );
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: "Hey! I'm the AgentSentry assistant. Ask me anything — setup, scanning, risk scoring, fixing findings, or how the tool works." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 200); }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = async (text?: string) => {
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
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let assistantText = "";
      setMsgs(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            const { text, error } = JSON.parse(data);
            if (error) throw new Error(error);
            assistantText += text;
            setMsgs(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: assistantText };
              return updated;
            });
          } catch { /* skip malformed chunks */ }
        }
      }

      if (!open) setUnread(u => u + 1);
    } catch (err) {
      setMsgs(prev => [...prev, {
        role: "assistant",
        content: `Sorry, I ran into an error. Make sure ANTHROPIC_API_KEY is set in your Vercel environment variables. (${err instanceof Error ? err.message : "Unknown error"})`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating trigger */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 9000,
          width: 54, height: 54, borderRadius: "50%",
          background: "linear-gradient(135deg, #00ff88, #00cc6a)",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 32px rgba(0,255,136,0.4), 0 8px 24px rgba(0,0,0,0.4)",
        }}
        aria-label="Open chat"
      >
        <AnimatePresence mode="wait">
          {open
            ? <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><ChevronDown color="#000" size={22} /></motion.span>
            : <motion.span key="bot" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><Bot color="#000" size={22} /></motion.span>
          }
        </AnimatePresence>
        {unread > 0 && !open && (
          <div style={{ position: "absolute", top: -2, right: -2, width: 18, height: 18, borderRadius: "50%", background: "#ff3366", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700 }}>
            {unread}
          </div>
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.21, 0.47, 0.32, 0.98] }}
            style={{
              position: "fixed", bottom: 94, right: 24, zIndex: 8999,
              width: "min(380px, calc(100vw - 32px))",
              height: "min(540px, calc(100vh - 120px))",
              borderRadius: 20,
              border: "1px solid rgba(0,255,136,0.15)",
              background: "#050505",
              boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,255,136,0.06)",
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "#080808", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,255,136,0.12)", border: "1px solid rgba(0,255,136,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Bot style={{ width: 15, height: 15, color: "#00ff88" }} />
              </div>
              <div>
                <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>AgentSentry Assistant</div>
                <div style={{ color: "#00ff88", fontSize: 11, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00ff88", display: "inline-block" }} />
                  online
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#333", cursor: "pointer", padding: 4 }}>
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
              {msgs.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
                  style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "86%", padding: "10px 14px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: m.role === "user" ? "linear-gradient(135deg, #00ff88, #00cc6a)" : "rgba(255,255,255,0.04)",
                    border: m.role === "assistant" ? "1px solid rgba(255,255,255,0.05)" : "none",
                    color: m.role === "user" ? "#000" : "#888", fontSize: 13,
                  }}>
                    {m.role === "assistant" ? <MarkdownText text={m.content} /> : m.content}
                    {m.role === "assistant" && m.content === "" && loading && (
                      <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
                        {[0,1,2].map(d => <span key={d} style={{ width: 4, height: 4, borderRadius: "50%", background: "#444", animation: `tdot 1.2s ${d*0.2}s infinite` }} />)}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Quick prompts */}
            {msgs.length <= 1 && (
              <div style={{ padding: "0 12px 10px", display: "flex", flexWrap: "wrap", gap: 6, flexShrink: 0 }}>
                {QUICK.map(q => (
                  <button key={q} onClick={() => send(q)} style={{
                    padding: "5px 10px", borderRadius: 20, fontSize: 11,
                    border: "1px solid rgba(0,255,136,0.15)", background: "rgba(0,255,136,0.05)",
                    color: "#00ff88", cursor: "pointer", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.background = "rgba(0,255,136,0.12)"; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.background = "rgba(0,255,136,0.05)"; }}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 8, flexShrink: 0 }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask anything about AgentSentry…"
                disabled={loading}
                style={{
                  flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 12, padding: "9px 14px", color: "#fff", fontSize: 13, outline: "none",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => { e.target.style.borderColor = "rgba(0,255,136,0.3)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.07)"; }}
              />
              <button onClick={() => send()} disabled={!input.trim() || loading}
                style={{
                  width: 38, height: 38, borderRadius: 12, border: "none", cursor: input.trim() && !loading ? "pointer" : "default",
                  background: input.trim() && !loading ? "#00ff88" : "rgba(255,255,255,0.05)",
                  display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0,
                }}>
                <Send size={14} color={input.trim() && !loading ? "#000" : "#333"} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes tdot { 0%,80%,100%{opacity:.2;transform:scale(.8)} 40%{opacity:1;transform:scale(1)} }
      `}</style>
    </>
  );
}
