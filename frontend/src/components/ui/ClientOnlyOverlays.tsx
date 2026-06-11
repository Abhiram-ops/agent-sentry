"use client";

import dynamic from "next/dynamic";

const ChatBot = dynamic(() => import("@/components/ui/ChatBot"), { ssr: false });

export function ClientOnlyOverlays() {
  return (
    <>
      <ChatBot />
    </>
  );
}
