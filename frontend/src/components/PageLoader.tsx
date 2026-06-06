"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PageLoader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setVisible(false), 1500);
    return () => clearTimeout(id);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeIn" } }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "#030303",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {/* Wordmark */}
          <motion.div
            initial={{ opacity: 0, filter: "blur(12px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 0.77, 0.32, 1] }}
            style={{
              fontSize: "clamp(1.75rem, 5vw, 2.75rem)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              fontFamily: "'General Sans', sans-serif",
              userSelect: "none",
              position: "relative",
              zIndex: 1,
            }}
          >
            <span style={{
              color: "#fff",
              textShadow: "0 0 30px rgba(255,255,255,0.4), 0 0 60px rgba(255,255,255,0.15)",
            }}>
              Agent
            </span>
            <span style={{
              color: "#00ff88",
              textShadow: "0 0 20px rgba(0,255,136,0.9), 0 0 40px rgba(0,255,136,0.55), 0 0 80px rgba(0,255,136,0.3)",
            }}>
              Sentry
            </span>
          </motion.div>

          {/* Scan line sweeping top → bottom */}
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: "100vh" }}
            transition={{ duration: 0.65, delay: 0.7, ease: "linear" }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              pointerEvents: "none",
              zIndex: 2,
            }}
          >
            <div style={{
              height: 2,
              background: "linear-gradient(90deg, transparent, #00ff88 20%, #00ff88 80%, transparent)",
              boxShadow: "0 0 16px #00ff88, 0 0 32px rgba(0,255,136,0.7), 0 0 48px rgba(0,255,136,0.3)",
            }} />
            <div style={{
              height: 100,
              background: "linear-gradient(180deg, rgba(0,255,136,0.1) 0%, transparent 100%)",
            }} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
