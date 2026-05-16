# Property Sewa Hero + Figma Match Skill

## Purpose
Use this skill to implement and pixel-match homepage hero/header/landing visuals against Figma screenshots in the Property Sewa codebase, while preserving existing behavior.

## When to Use
- User asks to update homepage hero visuals.
- User asks to adjust header or landing sections to match Figma screenshots.
- User asks for screenshot-based pixel matching of spacing, typography, colors, patterns, and depth.

## Guardrails
- Do not change or remove routes, auth logic, API calls, buttons, links, or responsive behavior.
- Do not remove any existing functionality.
- Prefer minimal, scoped visual edits in target files only.
- Preserve existing animations and interaction behavior unless explicitly requested.
- Do not revert unrelated git changes.
- Use `#316249` as primary brand green unless Figma clearly shows another value.

## Workflow
1. Before changing code: identify and compare.
- Identify the exact target file/component currently rendering the section.
- Compare the current UI against the provided Figma screenshot before editing.
- Confirm whether differences are visual-only or behavior-impacting.

2. Locate target files quickly.
- Use `rg --files` and `rg -n` to find the exact component/section.

3. Read only required context.
- Open the smallest relevant file window first.
- Identify style-only vs logic-impacting blocks.

4. Implement smallest safe change.
- For style-only tasks, edit classes/inline style only.
- Keep structure and handlers unchanged.

5. Pixel-match visual audit.
- Match spacing, widths, heights, typography, colors, border-radius, shadows, gradients, and decorative patterns.
- Decorative dot/pattern layers must be checked for shape, softness, spacing, and opacity.
- Validate depth/lighting (glow/blur) only if present in Figma.

6. Responsive verification.
- Check desktop layout.
- Check tablet layout.
- Check mobile `375px` width.
- Check mobile `320px` width.

7. After changing code: build + report.
- Run `pnpm build` (or `pnpm --dir client build` when scoped to frontend).
- Report all changed files.
- State what visual elements were matched and what logic/behavior was intentionally untouched.
- Fill the Figma diff report template after every hero/Figma update:
  - `.agents/skills/property-sewa-implementation/templates/figma-diff-report.md`

## Visual Audit Checklist
- Spacing and alignment match screenshot (horizontal and vertical rhythm).
- Hero/header/landing container width and height match.
- Heading and paragraph typography match (size, weight, line-height, tracking).
- Search card dimensions, radius, ring/border, and shadow match.
- CTA button size, spacing, radius, and visual tone match.
- House/hero image size and position match.
- Background gradient direction/stops match.
- Decorative pattern shape and softness match (square dots, not circles/lines when required).
- Pattern visibility is balanced across dark and light gradient areas.
- Soft depth/glow matches screenshot without harsh artifacts.
- Desktop/tablet/375/320 layouts remain intact and functional.

## Project Notes
- Frontend app path: `client/`
- Main homepage file: `client/app/page.tsx`
- Backend API path: `server/`

## Reusable Prompt Template
Use this prompt pattern when invoking this skill:

"Apply the Property Sewa Hero + Figma Match Skill to [target page/file].
Scope: [exact section].
Change only: [visual requirements].
Do not change: [routes/auth/api/buttons/links/logic/animations].
Validate by: [desktop + tablet + 375 + 320 checks and screenshot compare]."

## Required Deliverable
- After every homepage hero/header/landing Figma-matching update, Codex must produce a completed Figma diff report using:
  - `.agents/skills/property-sewa-implementation/templates/figma-diff-report.md`

## Optional Commands
- Find hero section:
  - `rg -n "<section|hero|gradient|search" client/app/page.tsx`
- Start frontend dev server (if not already running):
  - `pnpm --dir client dev`
- Capture screenshot (if Playwright is available):
  - `npx playwright screenshot --device="Desktop Chrome" http://localhost:3000 C:\tmp\hero-check.png`
- Frontend build verification:
  - `pnpm --dir client build`
