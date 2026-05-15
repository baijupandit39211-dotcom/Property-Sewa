# Safe Prompts for Future Codex UI Redesign Work

## Usage Rules
- Use these prompts for UI changes only.
- Keep application logic unchanged.
- Never modify auth, roles, routing, API calls, request payloads, or business rules unless explicitly requested.

## Prompt 1: Tokenize Existing UI
```text
Use ai-context/design.md as source of truth.
Refactor styling to use the documented color groups and brand anchors:
- brand green #316249
- accent/logo green #13EC80
Do not change page logic, auth, routing, roles, API calls, or business logic.
Only update presentational classes/tokens and shared style constants.
Return a concise file-by-file summary.
```

## Prompt 2: Extract Reusable Components Safely
```text
Use ai-context/components-map.md.
First align with existing Figma components/component sets (e.g., navbar and property-card variants), then extract presentational reusable components for repeated patterns (buttons, headers, cards, form fields, sidebar, dashboard rows).
Keep all existing logic unchanged by passing through current props/handlers.
No changes to auth, roles, routing, APIs, or data semantics.
After changes, summarize which repeated patterns were consolidated.
```

## Prompt 3: Page Visual Cleanup Only
```text
Improve visual hierarchy and consistency on target page(s) using the cleaned palette and spacing rhythm from ai-context/design.md.
Use #316249 as primary brand and #13EC80 as accent/logo highlight.
Do not alter component behavior, state transitions, API requests, routing, or permission checks.
Do not rename data fields or change form validation logic.
Provide before/after summary focused on UI only.
```

## Prompt 4: Tailwind Theme Alignment
```text
Create or refine Tailwind theme tokens based on ai-context/design.md palette groups.
Map colors into primary, secondary, neutral, accent, background, border, and text.
Do not edit app business logic or API layers.
If existing class usage is preserved, only swap hardcoded colors for tokens.
Return exact files updated and token map.
```

## Prompt 5: Dashboard UI Standardization
```text
Standardize dashboard UI using reusable presentational components from ai-context/components-map.md (StatCard, DashboardTable/DataRowList, SectionHeader).
Keep all metrics, calculations, filters, sorting, and API wiring unchanged.
Focus only on layout, spacing, typography, and color consistency.
List any residual repeated UI patterns not yet extracted.
```

## Prompt 6: Property Listing UI Standardization
```text
Refactor property listing visuals by introducing reusable PropertyCard and related list/grid wrappers from ai-context/components-map.md.
Keep search/filter/sort/pagination logic exactly as currently implemented.
No API or routing changes.
Use brand and neutral palette from ai-context/design.md.
Summarize visual improvements and unchanged logic boundaries.
```

## Prompt 7: Strict No-Logic-Change Guard Prompt
```text
Before making any change, confirm this boundary:
UI-only refactor. No changes to auth, roles, routing, API calls, business rules, validation semantics, or data flow.
Verify against the latest Figma file state and reuse existing Figma components before inventing new variants.
If any requested step would cross this boundary, stop and ask before proceeding.
Then apply only safe presentational updates.
```
