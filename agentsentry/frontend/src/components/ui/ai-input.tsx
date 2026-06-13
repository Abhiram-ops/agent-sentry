'use client';
import React from 'react';
import { cx } from 'class-variance-authority';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Bot, X } from 'lucide-react';

// ── Spinning colour orb ──────────────────────────────────
interface OrbProps {
  dimension?: string;
  className?: string;
  tones?: { base?: string; accent1?: string; accent2?: string; accent3?: string };
  spinDuration?: number;
}

const ColorOrb: React.FC<OrbProps> = ({
  dimension = '192px',
  className,
  tones,
  spinDuration = 20,
}) => {
  const palette = {
    base:    tones?.base    ?? 'oklch(8% 0.02 145)',
    accent1: tones?.accent1 ?? 'oklch(75% 0.22 145)',   // #00ff88 mapped
    accent2: tones?.accent2 ?? 'oklch(65% 0.15 220)',   // cyan-blue
    accent3: tones?.accent3 ?? 'oklch(30% 0.08 145)',   // dark green
  };
  const dim = parseInt(dimension.replace('px',''), 10);
  const blur     = Math.max(dim * 0.015, 4);
  const contrast = Math.max(dim * 0.008, 1.5);

  return (
    <div
      className={cn('color-orb', className)}
      style={{
        width: dimension, height: dimension,
        '--base': palette.base, '--accent1': palette.accent1,
        '--accent2': palette.accent2, '--accent3': palette.accent3,
        '--spin-duration': `${spinDuration}s`,
        '--blur': `${blur}px`, '--contrast': contrast,
      } as React.CSSProperties}
    >
      {/* @ts-ignore — styled-jsx is built into Next.js */}
      <style jsx>{`
        @property --angle { syntax:"<angle>"; inherits:false; initial-value:0deg; }
        .color-orb { display:grid; grid-template-areas:"stack"; overflow:hidden; border-radius:50%; position:relative; }
        .color-orb::before,.color-orb::after { content:""; display:block; grid-area:stack; width:100%; height:100%; border-radius:50%; }
        .color-orb::before {
          background:
            conic-gradient(from calc(var(--angle)*2) at 25% 70%,var(--accent3),transparent 20% 80%,var(--accent3)),
            conic-gradient(from calc(var(--angle)*2) at 45% 75%,var(--accent2),transparent 30% 60%,var(--accent2)),
            conic-gradient(from calc(var(--angle)*-3) at 80% 20%,var(--accent1),transparent 40% 60%,var(--accent1)),
            conic-gradient(from calc(var(--angle)*2) at 15% 5%,var(--accent2),transparent 10% 90%,var(--accent2)),
            conic-gradient(from calc(var(--angle)*1) at 20% 80%,var(--accent1),transparent 10% 90%,var(--accent1));
          filter: blur(var(--blur)) contrast(var(--contrast));
          animation: spin var(--spin-duration) linear infinite;
        }
        .color-orb::after { mix-blend-mode:overlay; }
        @keyframes spin { to { --angle:360deg; } }
      `}</style>
    </div>
  );
};

const SPEED = 1;
const FORM_W = 360;
const FORM_H = 220;

interface CtxShape { showForm:boolean; triggerOpen:()=>void; triggerClose:()=>void; }
const FormCtx = React.createContext({} as CtxShape);
const useFormCtx = () => React.useContext(FormCtx);

// ── Public component ─────────────────────────────────────
export function AgentSentryAIInput() {
  const wrapRef   = React.useRef<HTMLDivElement>(null);
  const taRef     = React.useRef<HTMLTextAreaElement | null>(null);
  const [show, setShow] = React.useState(false);

  const close = React.useCallback(() => { setShow(false); taRef.current?.blur(); }, []);
  const open  = React.useCallback(() => { setShow(true); setTimeout(() => taRef.current?.focus()); }, []);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node) && show) close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [show, close]);

  const ctx = React.useMemo(() => ({ showForm: show, triggerOpen: open, triggerClose: close }), [show, open, close]);

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width: FORM_W, height: FORM_H }}>
      <motion.div
        ref={wrapRef}
        className="relative flex flex-col items-center overflow-hidden"
        style={{ background: '#080808', border: '1px solid rgba(0,255,136,0.15)', bottom: 32 }}
        initial={false}
        animate={{ width: show ? FORM_W : 'auto', height: show ? FORM_H : 44, borderRadius: show ? 14 : 22 }}
        transition={{ type:'spring', stiffness: 550/SPEED, damping: 45, mass: 0.7, delay: show ? 0 : 0.08 }}
      >
        <FormCtx.Provider value={ctx}>
          <DockBar />
          <InputArea ref={taRef} />
        </FormCtx.Provider>
      </motion.div>
    </div>
  );
}

// ── Dock bar ─────────────────────────────────────────────
function DockBar() {
  const { showForm, triggerOpen } = useFormCtx();
  return (
    <footer className="mt-auto flex h-11 items-center justify-center whitespace-nowrap select-none">
      <div className="flex items-center gap-2 px-3">
        <AnimatePresence mode="wait">
          {showForm ? (
            <motion.div key="blank" initial={{ opacity:0 }} animate={{ opacity:0 }} exit={{ opacity:0 }} className="h-5 w-5" />
          ) : (
            <motion.div key="orb" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.2 }}>
              <ColorOrb dimension="22px" spinDuration={12} />
            </motion.div>
          )}
        </AnimatePresence>
        <Button type="button" variant="ghost" className="h-fit flex-1 rounded-full px-2 py-0.5 text-sm text-[#b0b0b0] hover:text-[#00ff88]" onClick={triggerOpen}>
          <Bot className="w-4 h-4 mr-1 opacity-70" />
          Ask AI
        </Button>
      </div>
    </footer>
  );
}

// ── Expandable textarea form ──────────────────────────────
const InputArea = React.forwardRef<HTMLTextAreaElement>((_, ref) => {
  const { triggerClose, showForm } = useFormCtx();
  const btnRef = React.useRef<HTMLButtonElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    triggerClose();
  }
  function handleKeys(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') triggerClose();
    if (e.key === 'Enter' && e.metaKey) { e.preventDefault(); btnRef.current?.click(); }
  }

  return (
    <form onSubmit={handleSubmit} className="absolute bottom-0" style={{ width: FORM_W, height: FORM_H, pointerEvents: showForm ? 'all' : 'none' }}>
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            transition={{ type:'spring', stiffness: 550/SPEED, damping: 45, mass: 0.7 }}
            className="flex h-full flex-col p-2"
          >
            <div className="flex items-center justify-between px-2 py-1">
              <span className="flex items-center gap-2 text-xs text-[#00ff88] font-medium tracking-wide">
                <ColorOrb dimension="18px" spinDuration={10} /> AI Security Agent
              </span>
              <button type="button" onClick={triggerClose} className="text-[#666] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              ref={ref}
              placeholder="Ask about machine identities, blast radius, NHI risk..."
              name="message"
              className="h-full w-full resize-none rounded-lg p-3 text-sm outline-none placeholder-[#444] text-white"
              style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.12)' }}
              required
              onKeyDown={handleKeys}
              spellCheck={false}
            />
            <div className="flex justify-end pt-1 pr-1">
              <kbd className="text-[10px] text-[#555]">⌘ Enter to send</kbd>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
});
InputArea.displayName = 'InputArea';

export default AgentSentryAIInput;
