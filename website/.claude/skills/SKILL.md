# Frontend Design Skill — AgentSentry Website
## Design Philosophy
Build like Vercel, Wiz, and Linear designed the site. Every pixel intentional.
Dark, premium, technical — but human enough that a CISO trusts it.
**Core rule:** If it looks like a generic AI-generated site, it's wrong. Redo it.

---

## Color System
```
Background:     #000000  (pure black — not #111, not #0a0a0a — pure black)
Surface:        #0d0d0d  (cards, panels)
Surface-2:      #141414  (elevated elements)
Border:         #1f1f1f  (subtle dividers)
Border-bright:  #2a2a2a  (hover states)

Primary:        #00ff88  (electric green — the brand color)
Primary-dim:    #00cc6a  (hover states)
Primary-glow:   rgba(0, 255, 136, 0.15)  (glow effects)

Accent:         #ff3366  (CRITICAL risk — red)
Accent-yellow:  #ffcc00  (HIGH risk — yellow)
Accent-blue:    #0088ff  (info — blue)

Text-primary:   #ffffff
Text-secondary: #888888
Text-dim:       #444444
```

## Typography
```
Font stack: 'Geist', 'Inter', system-ui, sans-serif
Mono stack: 'Geist Mono', 'JetBrains Mono', monospace

Scale:
  hero-xl:    clamp(3rem, 8vw, 7rem)   font-weight: 700
  hero:       clamp(2rem, 5vw, 4rem)   font-weight: 700
  h1:         2.25rem                   font-weight: 700
  h2:         1.75rem                   font-weight: 600
  h3:         1.25rem                   font-weight: 600
  body:       1rem                      font-weight: 400  line-height: 1.6
  small:      0.875rem
  mono:       0.875rem                  font-family: mono stack

Letter spacing: tight on headings (-0.02em), normal on body
```

## Spacing System (8px base grid)
```
xs:   4px
sm:   8px
md:   16px
lg:   24px
xl:   32px
2xl:  48px
3xl:  64px
4xl:  96px
5xl:  128px
section-padding: py-24 (96px top/bottom)
container: max-w-7xl mx-auto px-6
```

## Animation Principles
```
All animations use Framer Motion. Rules:

1. ENTRANCE: Elements fade up from 20px below. Never fade from the side.
   initial={{ opacity: 0, y: 20 }}
   animate={{ opacity: 1, y: 0 }}
   transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}

2. STAGGER: Sibling elements stagger by 0.08s, never more.
   staggerChildren: 0.08

3. SCROLL-TRIGGERED: Use whileInView, not useEffect scroll handlers.
   viewport={{ once: true, margin: "-100px" }}

4. HOVER: Subtle — scale(1.02) max, never scale(1.1). 
   Color transitions 150ms ease.

5. TIMING: Fast in, slow out. Never slow in.
   Entrance: 400-600ms. Exit: 200ms.

6. GLOW EFFECTS: Green glow on primary elements.
   box-shadow: 0 0 40px rgba(0, 255, 136, 0.2)
   On hover: 0 0 60px rgba(0, 255, 136, 0.35)

7. NEVER: bounce, spring physics on UI (only on playful micro-interactions),
   rotate animations on text, parallax on mobile.
```

## Component Patterns

### Buttons
```
Primary CTA:
  bg: #00ff88  text: #000000  font-weight: 600
  border-radius: 8px  padding: 12px 24px
  hover: brightness(1.1) + glow shadow
  
Secondary CTA:
  bg: transparent  border: 1px solid #2a2a2a  text: #ffffff
  hover: border-color #444444 + bg #141414

Danger:
  bg: transparent  border: 1px solid #ff3366  text: #ff3366
```

### Cards
```
bg: #0d0d0d
border: 1px solid #1f1f1f
border-radius: 12px
padding: 24px
hover: border-color #2a2a2a + subtle glow on primary cards

NEVER use box shadows as decoration — only for glow effects.
NEVER use border-radius > 16px on cards.
```

### Code / Terminal blocks
```
bg: #000000
border: 1px solid #1f1f1f
border-radius: 8px
font-family: mono
text: #00ff88 (commands), #888 (output), #ff3366 (errors), #ffcc00 (warnings)
Include a fake "window chrome" with red/yellow/green dots.
```

### Risk Level Colors
```
CRITICAL: #ff3366 + bg rgba(255, 51, 102, 0.1)
HIGH:     #ffcc00 + bg rgba(255, 204, 0, 0.1)
MEDIUM:   #ff8800 + bg rgba(255, 136, 0, 0.1)
LOW:      #00ff88 + bg rgba(0, 255, 136, 0.1)
INFO:     #888888 + bg rgba(136, 136, 136, 0.1)
```

## Layout Rules
```
- Mobile-first. Every section must work at 375px.
- Max content width: 1280px
- Text columns: max 65ch for readability
- Bento grids: CSS Grid, never Flexbox for 2D layouts
- Section rhythm: alternate between centered + left-aligned layouts
- Never put two CTAs of the same style next to each other
```

## What To Avoid (The "Generic AI Site" List)
```
✗ Purple/blue gradients on hero — every AI startup does this
✗ Generic "rocket emoji" or "sparkle" decorations
✗ Stock photo backgrounds
✗ Centered text on every section
✗ Rounded pill buttons everywhere (only on CTAs)
✗ Random gradient text on every heading
✗ Glassmorphism overuse — one frosted panel max per page
✗ Three-column feature grid with icons — use bento or asymmetric layout
✗ "Trusted by 1000+ companies" with fake logos
✗ Gradient borders on everything
```

## Page Sections (in order)
1. Navbar — sticky, transparent on scroll-top, dark blur on scroll
2. Hero — full viewport, animated terminal, one headline, one CTA
3. Stats bar — 3 live numbers animating up on load
4. Problem — what's broken today (no visuals, just honest copy)
5. Solution — the three scanners, bento grid layout
6. Live Demo — interactive terminal simulation
7. Research — paper reference, AI-Amplification Factor explanation
8. Pricing — Free vs Pro, three locked features
9. GitHub CTA — star the repo
10. Footer — minimal

## Copy Voice
```
Direct. Technical. No fluff.
Write like a senior security engineer, not a marketing team.
Bad:  "Supercharge your security posture with AI-powered insights"
Good: "Find every machine identity your security team doesn't know about."

Bad:  "Enterprise-grade protection for the modern cloud"
Good: "1,610 actively exploited CVEs. AgentSentry tells you which ones 
       are attacking your IAM roles right now."
```
