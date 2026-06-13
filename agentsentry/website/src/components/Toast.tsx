"use client";

import { createContext, useContext, useCallback, useRef, useState } from "react";

type ToastCtx = { show: (msg: string) => void };
const Ctx = createContext<ToastCtx>({ show: () => {} });

export function useToast() { return useContext(Ctx); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState("");
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((m: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMsg(m);
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), 4000);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className={`as-toast${visible ? " show" : ""}`} role="status" aria-live="polite">
        <span className="chk">✓</span> {msg}
      </div>
    </Ctx.Provider>
  );
}
