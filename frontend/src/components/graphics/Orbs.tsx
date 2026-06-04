/**
 * Orbs
 * Floating ambient glow blobs used in the Hero section.
 * Each orb is a blurred radial gradient that animates via CSS keyframes
 * defined in globals.css (orb-1, orb-2, orb-3).
 * Purely decorative — pointer-events disabled, aria-hidden.
 */

interface Orb {
  color:    string;
  width:    number;
  height:   number;
  top?:     string;
  bottom?:  string;
  left?:    string;
  right?:   string;
  blur:     number;
  opacity:  number;
  animation:string;
}

const ORBS: Orb[] = [
  {
    color:     "0,255,136",   // green
    width:     700,
    height:    700,
    top:       "5%",
    left:      "50%",
    blur:      130,
    opacity:   0.10,
    animation: "orb-1 9s ease-in-out infinite",
  },
  {
    color:     "255,51,102",  // red
    width:     420,
    height:    420,
    top:       "45%",
    left:      "5%",
    blur:      110,
    opacity:   0.07,
    animation: "orb-2 12s ease-in-out infinite",
  },
  {
    color:     "0,136,255",   // blue
    width:     540,
    height:    540,
    bottom:    "0%",
    right:     "2%",
    blur:      140,
    opacity:   0.06,
    animation: "orb-3 14s ease-in-out infinite",
  },
];

export function Orbs() {
  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}
    >
      {ORBS.map((orb, i) => (
        <div
          key={i}
          style={{
            position:         "absolute",
            width:             orb.width,
            height:            orb.height,
            top:               orb.top,
            bottom:            orb.bottom,
            left:              orb.left,
            right:             orb.right,
            borderRadius:      "50%",
            background:        `radial-gradient(circle, rgba(${orb.color},${orb.opacity}) 0%, transparent 70%)`,
            filter:            `blur(${orb.blur}px)`,
            animation:         orb.animation,
            willChange:        "transform",
          }}
        />
      ))}
    </div>
  );
}
