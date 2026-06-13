"use client";

import dynamic from "next/dynamic";

const ChatBot           = dynamic(() => import("@/components/ChatBot"),           { ssr: false });
const CursorTrail       = dynamic(() => import("@/components/CursorTrail"),       { ssr: false });
const ParticleBackground= dynamic(() => import("@/components/ParticleBackground"),{ ssr: false });

export function ClientOnlyOverlays() {
  return (
    <>
      <ParticleBackground />
      <ChatBot />
      <CursorTrail />
    </>
  );
}
