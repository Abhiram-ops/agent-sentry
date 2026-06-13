"use client";

import { useEffect, useRef } from "react";

export default function CursorTrail() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer:fine)").matches) return;
    const dot  = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mx = -100, my = -100, rx = -100, ry = -100;
    let raf: number;

    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    document.addEventListener("mousemove", onMove);

    const interactors = "a,button,.code-pill,.prov-card,.step-card,.testi-card,.price-card";
    const hoverIn  = () => document.body.classList.add("cur-hover");
    const hoverOut = () => document.body.classList.remove("cur-hover");
    document.querySelectorAll(interactors).forEach(el => {
      el.addEventListener("mouseenter", hoverIn);
      el.addEventListener("mouseleave", hoverOut);
    });

    function anim() {
      if (!dot || !ring) return;
      dot.style.left = mx + "px";
      dot.style.top  = my + "px";
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.left = rx + "px";
      ring.style.top  = ry + "px";
      raf = requestAnimationFrame(anim);
    }
    raf = requestAnimationFrame(anim);

    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={dotRef}  className="cursor-dot"  aria-hidden="true"/>
      <div ref={ringRef} className="cursor-ring" aria-hidden="true"/>
    </>
  );
}
