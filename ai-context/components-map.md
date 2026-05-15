# Component Mapping (Pattern-Derived from Figma)

## Latest Figma Snapshot
- File key: `ODMbqar5IPF3xufM0le3x9`
- Explicit local components/component sets now exist (`6` total), including:
  - `navbar` (component)
  - `Frame 66` (component set)
  - Variants: `Property 1=Default`, `Variant2`, `Variant3`, `Variant4`

## Scope Guardrails
- UI structure and styling guidance only.
- Do not alter auth, roles, routing, API calls, or business logic.
- No behavioral rewrites; only reusable presentation layers.

## Repeated Pattern Signals Found
- Repeated navbar structures (`navbar` variants).
- Repeated row/item structures (table/list style rows).
- Repeated card clusters (property and dashboard-like blocks).
- Repeated icon containers (20/24/34/36/37 px patterns).
- Repeated metric tile structures (value + label + delta style).
- Repeated form-like rows and input group patterns.
- Repeated property-card-like structures continue to appear both as raw frames and formal component variants.

## Suggested Reusable Components

### 1) `AppHeader`
- Purpose: unify repeated top navigation/header variants.
- Typical contents: logo, nav links, action buttons, user menu.
- Keep logic unchanged: consume existing props/state, no auth logic edits.
- Note: map to Figma `navbar` component first before introducing new visual variants.

### 2) `SidebarNav`
- Purpose: normalize repeated icon + label side navigation items.
- Typical contents: grouped nav items, active state, badges.
- Keep logic unchanged: preserve existing permission/role checks as-is.

### 3) `PrimaryButton`, `GhostButton`, `IconButton`
- Purpose: unify repeated button styles and icon button sizes.
- Variants: `primary`, `secondary/ghost`, `danger`, `icon-only`.
- Keep logic unchanged: only visual and sizing normalization.

### 4) `FormField`
- Purpose: standard wrapper for label, input, hint, and error text.
- Use for repeated form row structures.
- Keep logic unchanged: validation, submission, and API behavior stay intact.

### 5) `PropertyCard`
- Purpose: normalize repeated property listing card patterns.
- Typical contents: image, title, location, price, feature tags, status badge.
- Keep logic unchanged: data fetching/filtering rules remain untouched.
- Note: align variants with Figma `Frame 66`/`Property 1=*` component set before custom expansion.

### 6) `StatCard`
- Purpose: reusable metric tile for dashboard summaries.
- Typical contents: title, value, delta, trend icon.
- Keep logic unchanged: calculation and source values stay from existing code.

### 7) `DashboardTable` (or `DataRowList`)
- Purpose: consolidate repeated row/item frame patterns.
- Typical contents: header row, repeated item rows, status cells, action cell.
- Keep logic unchanged: sorting, pagination, and query behavior unchanged.

### 8) `SectionHeader`
- Purpose: reusable section title + subtitle + right-side action.
- Typical contents: title, supporting text, action button/filter.

### 9) `LogoMark`
- Purpose: reusable logo icon + text lockup based on repeated logo frames.
- Accent usage: use `#13EC80` sparingly for logo highlight only.

### 10) `CardGrid` / `StackList` Layout Primitives
- Purpose: stable wrappers for repeated card and list layouts.
- Keep logic unchanged: only layout consistency.

## Tailwind Token Intent (for Future Use)
- Brand primary: `#316249`
- Accent/logo: `#13EC80`
- Text primary: `#0D1C12`
- Surface base: `#F7FCFA`
- Border default: `#D1D5DB`

## Safe Migration Order
1. Mirror Figma explicit components first (`navbar`, `Frame 66` variants) as presentational wrappers.
2. Extract shared button styles.
3. Extract `SectionHeader`.
4. Extract `AppHeader` and `SidebarNav` presentation only.
5. Extract `PropertyCard` and `StatCard`.
6. Extract row/list/table wrappers.

## Definition of Done (UI-Only)
- Visual consistency improved.
- Repetition reduced through reusable presentational components.
- No change in behavior, data outputs, route flow, auth checks, or API traffic.
