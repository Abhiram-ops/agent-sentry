/**
 * DotGrid
 * Subtle repeating dot pattern used as a section background.
 * Purely decorative, pointer-events disabled, aria-hidden.
 * Fades out at the bottom so it blends cleanly into the next section.
 */
export function DotGrid({ opacity = 0.5 }: { opacity?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position:       "absolute",
        inset:          0,
        pointerEvents:  "none",
        overflow:       "hidden",
        opacity,
      }}
    >
      {/* SVG dot pattern */}
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="dot-pattern"
            x="0" y="0"
            width="28" height="28"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.12)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-pattern)" />
      </svg>

      {/* Gradient mask, fades bottom 40% to transparent */}
      <div style={{
        position:   "absolute",
        inset:       0,
        background:  "linear-gradient(to bottom, transparent 60%, #000 100%)",
      }} />
    </div>
  );
}
