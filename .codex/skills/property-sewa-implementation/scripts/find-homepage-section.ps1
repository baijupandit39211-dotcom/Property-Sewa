param(
  [string]$Pattern = "hero|gradient|search"
)

rg -n $Pattern client/app/page.tsx
