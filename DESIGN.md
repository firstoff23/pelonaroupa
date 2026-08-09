# Design System: PeloNaRoupa
**Project:** PeloNaRoupa (ex-Pawra / AnimalMind)
**Stack:** React + Vite + shadcn/ui + Tailwind CSS

---

## 1. Visual Theme & Atmosphere

**Mood:** Intimate, warm, and scientifically trustworthy. Warm terracottas as brand anchor, deep near-black navy for dark backgrounds, generous rounded corners. Dark mode is the primary experience.

**Aesthetic keywords:** Warm-dark, glassmorphism-lite, layered depth, mobile-first, soft-glow focus states.

---

## 2. Color Palette & Roles

### Dark Mode (Primary)

| Name | Value | Role |
|---|---|---|
| Deep Space Navy | #090a0f | Page background |
| Midnight Card | #11131c | Card backgrounds |
| Warm Terracotta | #D97757 | Primary CTAs (brand constant) |
| Crisp White | #FFFFFF | Primary foreground |
| Frosted Slate | #1e293b | Muted backgrounds |
| Zinc Gray | #71717A | Muted text |
| Whisper Border | rgba(226,232,240,0.5) | Dividers |
| Emerald Signal | emerald-400 | Success states |
| Rose Alert | rose-400 | Error / denied states |
| Amber Caution | amber-400 | Warnings / vet disclaimer |
| Cyan Accent | cyan-400 | Continuous mode / live |
| Indigo Secondary | indigo-400 | Camera / vision mode |

---

## 3. Typography Rules

- Headings: font-bold tracking-tight; h1 at text-2xl, h2 at text-base/lg
- Body: text-xs dominant (mobile-compact UI)
- Section labels: text-[10px] font-semibold uppercase tracking-wider
- Muted: always text-muted-foreground

---

## 4. Component Stylings

- **Buttons:** rounded-xl h-9, bg-primary hover:bg-primary/90, active-scale tap feedback
- **Cards:** rounded-2xl bg-card border-border/30 shadow-md, hover:bg-card/90
- **Badges/pills:** rounded-full text-[10px] px-1.5 py-0.5, color at /10 bg + /20 border + full text
- **Inputs:** bg-background border-border h-9 text-xs
- **Tooltips:** cursor-help trigger, text-xs max-w-[180px] content

---

## 5. Layout Principles

- Mobile-first single-column, max-w-lg mx-auto
- space-y-4 to space-y-6 between sections
- Fixed bottom nav (BottomNav.tsx), content scrolls beneath
- pb-safe for Capacitor notch/gesture-bar devices
- page-enter CSS class for route transition animations

---

## 6. Accessibility (per Vercel Web Interface Guidelines)

- Decorative icons: aria-hidden="true"
- Navigation: Link components, not div onClick
- Form controls: Label htmlFor pairing
- Focus: focus-visible:ring-* on all interactive elements
- Motion: motion-safe: prefix on non-essential animations
- Headings: h1 per page, h2 for card titles
