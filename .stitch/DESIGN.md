---
name: Serene Corporate
colors:
  primary: '#2D739B'
  secondary: '#194D91'
  tertiary: '#6A8A8A'
  neutral-light: '#F5F0E8'
  neutral-dark: '#0E1215'
  surface-dark: '#161B20'
  surface-elevated-dark: '#1F262D'
  text-primary-dark: '#F8FAFC'
  text-muted-dark: '#8C9EA6'
  caution: '#F59E0B'
  error: '#EF4444'
---

# Design System: PeloNaRoupa — Serene Corporate

## 1. Visual Theme & Atmosphere
The **Serene Corporate** design system introduces a calm, trustworthy, and premium aesthetic for PeloNaRoupa. The visual tone bridges clinical precision with gentle warmth, avoiding noisy decorative artifacts, saturated AI gradients, and high-frequency glowing borders ("anti-slop"). 

The atmosphere is balanced and authoritative: deep carbon surfaces in dark mode paired with ocean-steel and corporate-navy accents, conveying reliability for both pet owners and veterinary professionals.

## 2. Color Palette & Roles

### Primary Foundation
- **Dark Base Canvas (`#0E1215`)** — Low-glare obsidian foundation for the mobile dark mode experience.
- **Surface Level 1 / Cards (`#161B20`)** — Subtle raised card containers providing structural boundaries.
- **Surface Level 2 / Elevated (`#1F262D`)** — Modals, popovers, dropdowns, and floating sheets.
- **Light Base Canvas (`#F5F0E8`)** — Alabaster warm background for light surfaces.

### Accent & Interactive
- **Primary Action (`#2D739B`)** — Ocean Steel for primary CTAs, active recording buttons, and confirm states.
- **Secondary Accent (`#194D91`)** — Deep Corporate Navy for navigation badges, camera visualizers, and key highlights.
- **Tertiary Support (`#6A8A8A`)** — Sage/Teal for emotional wellness indicators, calm tags, and support badges.

### Typography & Text Hierarchy
- **Text Primary (`#F8FAFC` Dark / `#1D1C17` Light)** — High-contrast, crisp legible content (WCAG AAA).
- **Text Muted (`#8C9EA6` Dark / `#6B7280` Light)** — Desaturated supporting labels, metadata, and timestamps.
- **Subtle Outline (`rgba(255, 255, 255, 0.08)`)** — Hairline border defining surfaces without artificial glow.

### Functional States
- **Caution / Veterinary Notice (`#F59E0B`)** — Amber for non-diagnostic disclaimers and alert warnings.
- **Error / Destructive (`#EF4444`)** — Rose/Red for disconnect alerts, validation errors, and account deletion.

## 3. Typography Rules
- **Display & Headings:** `Outfit` (or `Satoshi`), font-weight 600–700, tracking-tight, balanced scale.
- **Interface & Body:** `Inter` (or `Satoshi`), relaxed leading, legible touch sizes (14px–16px).
- **Numeric & Metrics:** `JetBrains Mono` with tabular numbers for timestamps, percentages, and counters.

## 4. Component Stylings
- **Buttons:** Tactile geometry with `rounded-xl` or `rounded-2xl`. Primary buttons use solid `#2D739B` with white text. Active press feedback: `active:scale-95`.
- **Cards:** M3-style containers using `#161B20` with 1px subtle outline `rgba(255,255,255,0.08)`. No colored glow borders.
- **Bottom Navigation:** Floating or docked bar with active indicator pill in primary/secondary accent.
- **Audio Waveform:** Reactive sound visualizer rendered in `#2D739B` or `#6A8A8A`.
- **Disclaimers:** Highlighted amber card with warning icon and clear typography.

## 5. Layout Principles
- Mobile-first architecture, max-width 480px–540px centered on desktop/PWA.
- 8px grid rhythm (`p-4`, `p-6`, `gap-3`, `gap-4`).
- Touch targets strictly ≥ 48px.
- Spring physics animations via Framer Motion for natural transitions.
