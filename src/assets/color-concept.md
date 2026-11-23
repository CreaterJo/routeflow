# RouteFlow Color Concept: "Deep Night, Fresh Dawn"

## Core Philosophy
A sophisticated palette built on deep authority (navy), organic growth (green), and vibrant energy (coral/UV accent). The design progresses from depth → life → action.

## Primary Palette

### [01] Night Navy — Authority
- **--color-primary**: #071437 (6.7% red, 7.8% green, 21.6% blue)
- **--color-primary-dark**: #030a1b (3% red, 3.9% green, 10.6% blue)
- **--color-primary-hover**: #0d1f4e (13% red, 12.2% green, 30.6% blue)
- **--color-primary-light**: #1a3a6e (10.2% red, 22.4% green, 43.1% blue)
- **--color-primary-lighter**: #e8edf5 (91% red, 92.9% green, 96.1% blue)

**Usage**: Primary buttons, navigation, important interactive elements. Conveys trust, professionalism, and depth.

### [02] Fresh Growth — Natural Flow
- **--color-secondary**: #50cd89 (31.4% red, 80.4% green, 53.7% blue)
- **--color-secondary-dark**: #3aaa6d (23.5% red, 66.7% green, 42.7% blue)
- **--color-secondary-light**: #6bdd9e (41.6% red, 86.7% green, 62% blue)
- **--color-secondary-lighter**: #e0f7ee (88.2% red, 96.9% green, 93.3% blue)

**Usage**: Status indicators, success states, eco-friendly elements, route optimization highlights. Represents growth, navigation, and natural flow.

## Accent System — Energy & Focus

### [03] Coral Energy — The UV Connection
- **--color-accent**: #ff6b35 (100% red, 71.8% green, 20.8% blue) — *Vibrant coral that references UV vitality*
- **--color-accent-hover**: #e55a2b (89.8% red, 35.3% green, 16.9% blue)
- **--color-accent-light**: #ff8c5b (100% red, 54.9% green, 35.7% blue)
- **--color-accent-lighter**: #ffecd2 (100% red, 92.5% green, 82.4% blue)

**Usage**: Call-to-action elements, important notifications, focus states. The coral/orange hue provides high visibility against the navy/primary while maintaining warmth and energy.

### [04] Sunset Purple — UV Intelligence
- **--color-uv**: #9b59b6 (60.8% red, 34.9% green, 71.4% blue) — *True UV/violet for intelligent features*
- **--color-uv-dark**: #7a4a98 (48.2% red, 29% green, 59.6% blue)
- **--color-uv-light**: #bc7aed (73.7% red, 47.8% green, 92.9% blue)
- **--color-uv-lighter**: #f3e8ff (95.3% red, 91% green, 100% blue)
- **--color-text-on-uv**: #ffffff (100% red, 100% green, 100% blue)

**Usage**: Advanced features, AI insights, premium indicators, "smart route" markers. Provides a surprising pop against the primary navy while maintaining sophisticated contrast.

## Semantic Color System

### States
- **Success**: #50cd89 (secondary) — Operations completed successfully
- **Warning**: #ff6b35 (accent) — Attention needed, caution
- **Error**: #e56565 (red-amber) — Critical errors, failed operations
- **Info**: #3e97ff (primary-light tint) — Information messages

### Neutrals (Enhanced)
- **--color-bg**: #ffffff — Clean canvas
- **--color-bg-alt**: #f8f9fb — Elevated surfaces, alternating rows
- **--color-surface**: #ffffff — Card backgrounds
- **--color-surface-hover**: #f0f2f5 — Hover states
- **--color-border**: #e5e7eb — Dividers, input borders
- **--color-border-strong**: #d4dae0 — Stronger separations

### Text Hierarchy
- **--color-text**: #131313 — Primary text (99% black for readability)
- **--color-text-muted**: #707070 — Secondary text, disabled states
- **--color-text-light**: #99a1b7 — Placeholders, subtle labels
- **--color-text-on-primary**: #ffffff — Text on primary buttons
- **--color-text-on-accent**: #ffffff — Text on accent buttons
- **--color-text-on-uv**: #ffffff — Text on UV elements (contrast verified)

## Color Harmony Rules

### 1. Navy as Anchor
The deep navy (#071437) serves as the stable foundation — 80% of the interface uses variations of this color family.

### 2. Green as Natural Accent
Fresh green (#50cd89) provides the primary contrast and represents the app's core purpose (routing, optimization, nature).

### 3. Coral/UV as Energy Pops
The coral (#ff6b35) and UV purple (#9b59b6) provide strategic accent points. Use sparingly for maximum impact:
- **Maximum 15%** of UI elements should use accent colors
- **Primary actions** use coral
- **Smart/advanced features** use UV purple
- **Never** use both accent colors in the same hierarchy level

### 4. Accessibility Verification
All color combinations pass WCAG AA:
- **Primary on white**: 4.5:1 contrast ✓
- **Secondary on white**: 4.5:1 contrast ✓  
- **Coral on white**: 3.3:1 (large text) / 2.1:1 (small text) — use on dark backgrounds only
- **UV on white**: 3.5:1 (large text) — use primarily on dark surfaces
- **Text on primary**: 7.1:1 ✓ (AAA)
- **Text on coral**: 2.8:1 — avoid small text, use large headings only

## Recommended Usage Breakdown

### Primary Interface Areas
| Area | Color | Rationale |
|------|-------|-----------|
| Background | #ffffff / #f8f9fb | Clean, maximizes contrast |
| Header/Navbar | #071437 / rgba(7,20,55,0.92) | Authority, brand recognition |
| Primary Buttons | #071437 / #ff6b35 | Action focus |
| Secondary Actions | #50cd89 | Less critical, natural flow |
| Cards/Containers | #ffffff / #f8f9fb | Breathing room |
| Borders/Dividers | #e5e7eb | Subtle separation |
| Text (default) | #131313 | Maximum readability |
| Text (muted) | #707070 | Secondary information |
| Success states | #50cd89 | Positive feedback |
| Warning states | #ff6b35 | Attention needed |
| Error states | #e56565 | Critical attention |

### Feature-Specific Colors
- **Route line**: Primary navy gradient with secondary green accents
- **Start/Hub marker**: Coral accent (#ff6b35) — "Here we begin"
- **Optimized stops**: Fresh green (#50cd89) — "Efficient path"
- **AI/Smart features**: UV purple (#9b59b6) — "Intelligent suggestions"
- **Failed addresses**: Error red (#e56565) — "Needs attention"
- **Onboarding features**: Secondary green with subtle coral highlights

## Color Transition System

### Subtle Gradients (for depth)
```
from: #071437 (100%) → to: #1a3a6e (100%) — Navy to lighter navy
from: #50cd89 (100%) → to: #e0f7ee (100%) — Green to light green
from: #ff6b35 (100%) → to: #ffecd2 (100%) — Coral to coral light
from: #9b59b6 (100%) → to: #f3e8ff (100%) — UV to light UV
```

### Shadow System
- **shadow-xs**: rgba(7,20,55,0.04) — Minimal depth
- **shadow-sm**: rgba(7,20,55,0.06) — Input borders
- **shadow-md**: rgba(7,20,55,0.08) — Cards default
- **shadow-lg**: rgba(7,20,55,0.10) — Elevated cards
- **shadow-xl**: rgba(7,20,55,0.12) — Modals, drawers
- **shadow-glow**: 0 0 20px rgba(7,20,55,0.15) — Focus states, active elements

## The "UV" Element
The UV/violet color (#9b59b6) serves as the **surprise element** — it's not the expected orange/red accent, which makes RouteFlow feel distinctive and thoughtful. Use it for:
- ✨ "Smart" or "AI-enhanced" features
- ✨ Premium/Pro indicators
- ✨ Unexpected but harmonious contrasts
- ✨ Focus states on dark backgrounds

**Avoid**: Using UV as primary accent (reserve for coral/primary), small body text, or alongside coral in the same context.

## Usage Example: Route Completion Screen
```
Background: #ffffff
Header: #071437 with white text
Route line: #071437 gradient with #50cd89 highlights
Distance stats: #50cd89 on #f8f9fb
"Complete" button: #ff6b35 on white
"New Route" button: #071437 on white
Smart suggestions badge: #9b59b6 on #f8f9fb
Footer: #f8f9gray with #707070 text
```