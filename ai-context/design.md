# Design Context (Figma-Derived)

## Latest Figma Snapshot
- File key: `ODMbqar5IPF3xufM0le3x9`
- Local paint styles: `0`
- Local color variables: `0`
- Solid fill colors in use: `46` unique
- Local components/component sets: `6`

## Scope Guardrails
- This document is for UI design direction only.
- Do not change auth, roles, routing, API calls, backend behavior, or business logic.
- Prefer presentational refactors and token-driven styling only.

## Brand Anchors
- Main brand green: `#316249`
- Accent/logo green: `#13EC80`

## Cleaned Color Palette

### Primary
- `#0D1C12`
- `#1A3321`
- `#24472E`
- `#316249` (brand main)
- `#376343`
- `#4D9966`
- `#91C9A3`
- `#B9E3C5`
- `#CFE8D6`

### Secondary
- `#618975`
- `#9EBAA6`
- `#B7D6BF`

### Neutral
- `#000000`
- `#111814`
- `#222222`
- `#444444`
- `#D1D5DB`
- `#DADADA`
- `#E5E7EB`
- `#F0F4F2`

### Accent
- `#13EC80` (logo/accent main)
- `#12ED5C`
- `#088729` (success-style accent)
- `#F09F3A` (warning-style accent)
- `#FA5438` (danger-style accent)
- `#3F80FF` (info-style accent)

### Background
- `#F7FCFA` (base)
- `#FFFFFF` (surface)
- `#E8F2EB` (subtle section)
- `#EEF8EB` (light mint section alternative)
- `#000000` (dark background case)

### Border
- `#D1D5DB` (default)
- `#E5E7EB` (soft)
- `#9EBAA6` (strong neutral-green)
- `#316249` (brand border)

### Text
- `#0D1C12` (primary text)
- `#111814` (heading text)
- `#FFFFFF` (inverse text)
- `#618975` (muted text)
- `#316249` (brand text)
- `#13EC80` (accent text)

## Practical Token Rules
- Use `#316249` for primary actions, active states, and key highlights.
- Use `#13EC80` sparingly for logo moments, small accents, and success emphasis.
- Keep large surfaces light (`#F7FCFA`, `#FFFFFF`) to preserve contrast.
- Reserve deep greens (`#0D1C12`, `#1A3321`) for headings, strong contrast blocks, or dark-mode-like sections.
- Use neutral borders by default; only use brand border when emphasis is intentional.

## Typography and Contrast Rules
- Maintain strong contrast for text on green surfaces.
- Prefer dark text (`#0D1C12`) on light backgrounds.
- On primary green surfaces, use white text for readability.
- Avoid stacking multiple accent colors in one small UI area.

## Layout and Rhythm Rules
- Reuse repeated spacing and card/list rhythms from Figma patterns.
- Standardize recurring icon sizes (small icon containers repeat heavily in file).
- Keep navigation/header structure consistent across pages.
- Favor reusable sections over one-off frame styling.
- Prefer compact hero spacing and moderate section paddings over oversized vertical blocks.
- Keep cards and callout blocks light, with soft borders (`#E5E7EB`, `#D1D5DB`) and restrained shadows.

## Implementation Safety Rules for Future Codex Tasks
- Allowed: Tailwind classes, visual refactors, tokenization, component extraction.
- Not allowed: changing data flow, API contracts, form validation semantics, permissions, or route behavior.
- When uncertain, prefer adding a presentational wrapper over editing core logic.
