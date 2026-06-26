"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, ChevronDown, Code2, MessageCircle } from "lucide-react";

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
      if (!inCode) { inCode = true; codeLines = []; codeLang = line.slice(3).trim(); }
      else {
        out.push(
          <pre key={i} className="chatbot-codeblock">
            {codeLang && <div style={{ color: "#7d8590", fontSize: 10, marginBottom: 4 }}>{codeLang}</div>}
            {codeLines.join("\n")}
          </pre>
        );
        inCode = false; codeLines = [];
      }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }
    const parts = line.split(/([`][^`]+[`]|\*\*[^*]+\*\*)/g);
    out.push(
      <span key={i} style={{ display: "block", minHeight: line === "" ? "0.6em" : undefined }}>
        {parts.map((p, j) => {
          if (p.startsWith("`") && p.endsWith("`")) return <code key={j} className="chatbot-code">{p.slice(1, -1)}</code>;
          if (p.startsWith("**") && p.endsWith("**")) return <strong key={j}>{p.slice(2, -2)}</strong>;
          return <span key={j}>{p}</span>;
        })}
      </span>
    );
  }
  return <div style={{ lineHeight: 1.65 }}>{out}</div>;
}

function TypingDots() {
  return (
    <span className="chatbot-typing">
      {[0, 1, 2].map(d => <span key={d} />)}
    </span>
  );
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: "Hey! I'm the AgentSentry assistant with access to the live codebase. Ask me anything, setup, scanning, risk scoring, fixing findings, or how the code works." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [visible, setVisible] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 520);
    check(); window.addEventListener("resize", check); return () => window.removeEventListener("resize", check);
  }, []);

  // Pop the launcher into view and auto-open the chat 2s after load.
  // On mobile the panel covers the whole screen, so just surface the
  // launcher with an unread badge instead of taking over the page.
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
      // .chatbot-panel goes full-screen below 680px (see globals.css),
      // don't auto-open a full-screen takeover on those viewports.
      if (window.innerWidth < 680) setUnread(1);
      else setOpen(true);
    }, 2000);
    return () => clearTimeout(timer);
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
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history.map(m => ({ role: m.role, content: m.content })) }) });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
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
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            assistantText += parsed.text ?? "";
            setMsgs(prev => { const updated = [...prev]; updated[updated.length - 1] = { role: "assistant", content: assistantText }; return updated; });
          } catch (parseErr) { if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") throw parseErr; }
        }
      }
      if (!open) setUnread(u => u + 1);
    } catch (err) {
      setMsgs(prev => [...prev, { role: "assistant", content: `Sorry, something went wrong. Make sure GROQ_API_KEY is set in Vercel. (${err instanceof Error ? err.message : "Unknown error"})` }]);
    } finally { setLoading(false); }
  }, [input, loading, msgs, open]);

  const panelStyle: React.CSSProperties = isMobile
    ? { zIndex: 9000 }
    : { zIndex: 8999, bottom: 94, right: 24, width: "min(390px, calc(100vw - 48px))", height: "min(580px, calc(100vh - 120px))" };

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {visible && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            onClick={() => setOpen(o => !o)}
            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
            aria-label="Open AgentSentry assistant"
            className="chatbot-fab"
            style={{ zIndex: 9001 }}
          >
            <AnimatePresence mode="wait">
              {open
                ? <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><ChevronDown color="#fff" size={22} /></motion.span>
                : <motion.span key="s" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><MessageCircle color="#fff" size={22} /></motion.span>
              }
            </AnimatePresence>
            {unread > 0 && !open && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="chatbot-fab-badge">
                {unread}
              </motion.div>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: isMobile ? 40 : 24, scale: isMobile ? 1 : 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isMobile ? 40 : 16, scale: isMobile ? 1 : 0.96 }}
            transition={{ duration: 0.22, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="chatbot-panel"
            style={panelStyle}
          >
            {/* Header */}
            <div className="chatbot-header">
              <div className="chatbot-avatar">
                <Bot style={{ width: 16, height: 16 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="chatbot-title">AgentSentry Assistant</div>
                <div className="chatbot-status">
                  <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} className="chatbot-status-dot" />
                  <span>online</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3, color: "var(--text-faint)" }}>
                    <Code2 size={9} /> live codebase
                  </span>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="chatbot-close" aria-label="Close assistant">
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="chatbot-messages">
              {msgs.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                  <div className={`chatbot-bubble ${m.role}`}>
                    {m.role === "assistant" ? (m.content === "" && loading ? <TypingDots /> : <MarkdownText text={m.content} />) : m.content}
                  </div>
                </motion.div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Quick prompts */}
            {msgs.length <= 1 && (
              <div className="chatbot-quick">
                {QUICK.map(q => (
                  <motion.button key={q} onClick={() => send(q)} whileHover={{ scale: 1.03 }} className="chatbot-quick-btn">
                    {q}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="chatbot-input-bar">
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask anything about AgentSentry…" disabled={loading}
                className="chatbot-input" />
              <button onClick={() => send()} disabled={!input.trim() || loading}
                className={`chatbot-send ${input.trim() && !loading ? "active" : ""}`}>
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
