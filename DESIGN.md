# CaffeineCoach v2.4 — Design Brief

**Aesthetic**: Professional, data-driven, trust-inspiring. Dark serious gym coaching platform for precision lifters.

**Tone**: Minimalist, cerebral. Every visual element serves function. Numbers speak louder than hype.

---

## Color Palette

| Token | OKLCH | Usage |
|-------|-------|-------|
| background | `0.12 0.012 240` | Primary dark surface |
| card | `0.16 0.018 240` | Elevated cards |
| foreground | `0.93 0.012 240` | Primary text |
| accent | `0.72 0.15 210` | Cyan: highlights, active states |
| primary | `0.6 0.2 260` | CTA blue |
| success | `0.73 0.2 145` | Green: high recovery |
| warning | `0.78 0.18 70` | Amber: medium recovery |
| destructive | `0.6 0.22 25` | Red: low recovery |

**Recovery Gradient**: Red → Yellow → Green across recovery bars.

---

## Typography

| Tier | Font | Usage |
|------|------|-------|
| Display | Space Grotesk | Exercise names, headers |
| Body | GeneralSans | Body text, descriptions |
| Mono | JetBrains Mono | Data (reps, weight, 1RM) |

---

## Structural Zones

| Zone | Surface | Detail |
|------|---------|--------|
| Header | `--card` | Border-b divider |
| Pre-Workout | `--background` | Card grid, exercise display |
| Coach Trace | `--card/50` | Collapsible panel, trace data |
| Footer | `--background` | Minimal, border-t |

---

## Component Patterns

**Exercise Card**: Name + muscle badge + movement pill + sets/reps + recovery bar (gradient) + progression flag.

**Phase Badge**: Semantic colors (accumulation=blue, intensification=amber, deload=green). Uppercase, semibold.

**Focus Muscle**: Cyan accent border + semi-transparent background. Visual hierarchy.

**Coach Reasoning Panel**: Collapsible slide-down (300ms). Shows focus muscles, scores, rejections, ordering reason. Monospace for data.

**Progression Flag**: Green=increase, Cyan=maintain, Amber=deload. Inline badge, semibold.

**Recovery Bar**: Full-width gradient fill, minimum 6px height.

---

## Motion & Interaction

- Slide panel: 300ms ease-out (open/close)
- Hover: Exercise cards gain `border-accent/40`
- Rest timer: Pulsing ring 1.5s infinite
- Recovery bars: Static (clarity > motion)

No bounce. Subtle, purposeful only.

---

## Spacing

Card padding: 16px (p-4). Gaps: 12px between cards, 8px inside sections. Recovery bar: 6px minimum height.

---

## Differentiation

**Coach Reasoning Panel**: Unique insight — collapsible trace showing decision logic (focus selection, scores, rejections). Builds trust.

**Recovery Gradient**: Primary visual metaphor. Red→Yellow→Green for instant readiness feedback without reading text.

**Data Minimalism**: Numbers > icons. Semantic color only. Every pixel intentional.

---

## Constraints

✓ Semantic tokens only (no hex, no arbitrary colors)
✓ Dark mode intentional design (not inverted lightness)
✓ No text shadows/glows (depth via layering)
✓ Subtle animations only
✓ Recovery bars = primary metaphor
✓ Phase badges always visible

✗ No text gradients (except rare hover states)
✗ No arbitrary chroma mixing
✗ No >3 semantic colors per card
✗ No hiding critical data (recovery %, focus status)

---

## Exports

- **Fonts**: SpaceGrotesk, JetBrainsMono
- **Tokens**: OKLCH palette in `index.css`
- **Utilities**: Recovery gradient, badges, flags, trace panel, animations in `index.css` + `tailwind.config.js`
- **Theme**: Dark mode (HTML color-scheme: dark)
