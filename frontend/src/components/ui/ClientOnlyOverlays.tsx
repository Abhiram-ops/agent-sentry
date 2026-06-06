"use client";

import dynamic from "next/dynamic";

const ChatBot = dynamic(() => import("@/components/ui/ChatBot"), { ssr: false });
const CursorTrail = dynamic(() => import("@/components/ui/CursorTrail"), { ssr: false });

export function ClientOnlyOverlays() {
  return (
    <>
      <ChatBot />
      <CursorTrail />
    </>
  );
}
