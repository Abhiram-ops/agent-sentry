/**
 * GlowLine
 * A 1px horizontal line with a radial gradient glow effect.
 * Used at the top/bottom of sections to create visual separation
 * without hard borders.
 *
 * Usage:
 *   <GlowLine color="green" />        , green glow at top of section
 *   <GlowLine color="dim" position="bottom" /> , subtle white line at bottom
 */

interface GlowLineProps {
  color?:    "green" | "red" | "dim";
  position?: "top" | "bottom";
  style?:    React.CSSProperties;
}

const GRADIENTS = {
  green: "linear-gradient(90deg, transparent 0%, rgba(0,255,136,0.35) 50%, transparent 100%)",
  red:   "linear-gradient(90deg, transparent 0%, rgba(255,51,102,0.25) 50%, transparent 100%)",
  dim:   "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 50%, transparent 100%)",
};

export function GlowLine({
  color = "dim",
  position = "top",
  style = {},
}: GlowLineProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        position:   "absolute",
        left:        0,
        right:       0,
        ...(position === "top" ? { top: 0 } : { bottom: 0 }),
        height:      1,
        background:  GRADIENTS[color],
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}
