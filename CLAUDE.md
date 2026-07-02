# UEM1 — Data Discovery

UI/visual conventions live in [DESIGN.md](DESIGN.md). Follow them when building or
editing any screen. Reuse `src/components/ui/*` and `src/components/common/*`
instead of re-styling.

## Table alignment (enforce on every table)

- **Content cells and headers are LEFT-aligned.** Never add `text-right` to a
  `<TableCell>` or `<TableHead>`, including numeric columns — keep `tabular-nums`
  for digit alignment, but stay left.
- **The action column only is CENTER-aligned** (`text-center` on its `<TableHead>`
  and `<TableCell>`): the row menu / icon button / navigate-arrow column. Nothing
  else is centered.
- Applies to all tables: `PolicyTable`, `ScopeTable` (v2 + discovery),
  `FindingsTable`, the Scan Jobs table, and the Connections table.
