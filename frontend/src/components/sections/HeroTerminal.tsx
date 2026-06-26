'use client';

import { useEffect, useRef, useState } from 'react';

type Segment = { text: string; cls?: string };
type Line = { segments: Segment[]; delay: number };

const LINES: Line[] = [
  { delay: 500, segments: [{ text: '$ ', cls: 't-prompt' }, { text: 'agentsentry scan aws', cls: 't-cmd' }] },
  { delay: 900, segments: [{ text: '  Connecting to AWS…', cls: 't-dim' }] },
  { delay: 400, segments: [{ text: '  ▸ Enumerating IAM roles', cls: 't-info' }] },
  { delay: 700, segments: [{ text: '    ✓ 47 roles discovered', cls: 't-success' }] },
  { delay: 300, segments: [{ text: '  ▸ Enumerating access keys & service accounts', cls: 't-info' }] },
  { delay: 600, segments: [{ text: '    ✓ 23 keys found', cls: 't-success' }] },
  { delay: 300, segments: [{ text: '  ▸ Enumerating Lambda execution roles', cls: 't-info' }] },
  { delay: 500, segments: [{ text: '    ✓ 12 roles found', cls: 't-success' }] },
  { delay: 300, segments: [{ text: '  ▸ Scanning AI agents (LangChain / CrewAI)', cls: 't-info' }] },
  { delay: 800, segments: [{ text: '    ✓ 3 agents detected', cls: 't-success' }] },
  { delay: 500, segments: [{ text: ' ' }] },
  { delay: 200, segments: [{ text: '  Discovery complete, ', cls: 't-success' }, { text: '85 identities', cls: 't-cmd' }, { text: ' found.', cls: 't-success' }] },
  { delay: 700, segments: [{ text: ' ' }] },
  { delay: 200, segments: [{ text: '  Computing P×R×E×A risk scores…', cls: 't-dim' }] },
  { delay: 900, segments: [{ text: ' ' }] },
  { delay: 100, segments: [{ text: '  ⚠ CRITICAL  prod-sre-copilot      PREA: 1875', cls: 't-critical' }] },
  { delay: 180, segments: [{ text: '  ⚠ HIGH      billing-reporter      PREA:  720', cls: 't-warning' }] },
  { delay: 180, segments: [{ text: '  ⚠ HIGH      ml-pipeline-exec      PREA:  420', cls: 't-warning' }] },
  { delay: 180, segments: [{ text: '  ◆ MEDIUM    dev-audit-role         PREA:   48', cls: 't-dim' }] },
  { delay: 180, segments: [{ text: '  ◆ LOW       monitoring-readonly    PREA:    3', cls: 't-dim' }] },
  { delay: 500, segments: [{ text: ' ' }] },
  { delay: 200, segments: [{ text: '  Blast radius: ', cls: 't-info' }, { text: '14 assets', cls: 't-cmd' }, { text: ' reachable from prod-sre-copilot', cls: 't-info' }] },
  { delay: 250, segments: [{ text: '  Run ', cls: 't-info' }, { text: 'agentsentry visualize', cls: 't-cmd' }, { text: ' for interactive graph', cls: 't-info' }] },
];

const LOOP_PAUSE_MS = 5000;

export default function HeroTerminal() {
  const [revealed, setRevealed] = useState(0);
  const [started, setStarted] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setStarted(true);
        io.disconnect();
      }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    if (revealed >= LINES.length) {
      const t = setTimeout(() => setRevealed(0), LOOP_PAUSE_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRevealed((n) => n + 1), LINES[revealed].delay);
    return () => clearTimeout(t);
  }, [revealed, started]);

  const finished = revealed >= LINES.length;

  return (
    <div className="terminal-wrap" ref={wrapRef}>
      <div className="terminal-window">
        <div className="terminal-bar">
          <span className="t-dot t-dot-r" />
          <span className="t-dot t-dot-y" />
          <span className="t-dot t-dot-g" />
          <span className="terminal-bar-title">agentsentry, live scan</span>
        </div>
        <div className="terminal-body" id="terminal-output">
          {LINES.slice(0, revealed).map((line, i) => (
            <div key={i}>
              {line.segments.map((seg, j) => (
                <span key={j} className={seg.cls}>{seg.text}</span>
              ))}
            </div>
          ))}
          {!finished && <span className="t-cursor" />}
        </div>
      </div>
    </div>
  );
}
