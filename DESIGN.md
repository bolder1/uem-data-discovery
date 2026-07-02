# DESIGN.md — Data Discovery

The visual and interaction system. Tokens live in `src/index.css`; metadata maps in
`src/lib/format.ts`. Calibrated with the MiniOrange product-design laws (CASB/UEM lens).

## Register

Enterprise security / admin tool. Calm, dense where dense is correct, audit-visible,
never decorative. The user is an endpoint/cloud security admin scanning fleets of storage.

## Color

| Token | Value | Use |
|---|---|---|
| Canvas | `slate-50` | Page background — cool neutral, **never cream** |
| Surface | white | Cards, tables, sidebar |
| Border | `slate-200` | Hairline separators, `shadow-sm` |
| Primary | `blue-600` | CTAs (matches the live product's Add buttons) |
| Brand | `blue-600` | logo + selection/accent (shares the primary hue) |
| Status | emerald / amber / red / slate | Always paired with a label, never color alone |

Risk: Low `slate` · Medium `amber` · High `orange` · Critical `red` — each a dot **+** label badge.

## Type

Inter (self-hosted via `@fontsource/inter`), 400–700. Dense tables, generous section headers,
`tabular-nums` for figures.

## Laws applied (from the MiniOrange family)

- **Status = dot + label.** `ConnectionStatusBadge`, `ScanStatusBadge`, `RiskBadge`, `ExposurePill`.
- **One screen per decision.** Multi-step work (configure, create policy) lives on dedicated
  pages with a defined **Stepper**, not slide-in drawers. Drawers/dialogs are reserved for
  read-only detail (evidence) and destructive confirmations.
- **Audit-visible action.** Every save surfaces `AuditStamp` — "Logged · time · who · View audit entry".
- **Provenance on every credential.** `MaskedSecret` shows masked value + source + last-rotated;
  secrets are never revealed in read views.
- **Read paths are read-only.** View screens don't offer inline destructive actions; removal sits
  behind an explicit menu.
- **Non-revealing language.** The evidence drawer redacts matched values and points to the audit log.
- **Neutral empty states.** `EmptyState` is action-led, no marketing voice or exclamation marks.

## Anti-patterns avoided

No cream backgrounds, no color-only status, no side-stripe card borders, no spinners where a
skeleton fits, no modals for multi-step work, no marketing empty states.

## Steppers

The centerpiece. Numbered nodes, connector lines, explicit done/active/upcoming states
(`src/components/common/Stepper.tsx`). Reused in both wizards; the Dashboard shows a
data-driven version of the same four-step flow.

## Iterations (versioning)

The module ships as switchable iterations, chosen from the top-bar toggle
(`VersionProvider` + `src/versions.tsx`). `v0` is the original build (frozen baseline for
comparison); `v1` is the calm redesign. The resolver picks a page by version with a
fallback chain, so a version need only override the pages it changes and subversions
(e.g. `v1.1`) can extend their parent. New design work lands on the next version — v0 is
never disturbed, which also makes the toggle a one-click revert.

## v1 — colour & motion discipline

v1 deliberately calms the surface. Two standing rules:

- **No animation library.** v1 uses no `motion`/framer — only native CSS `transition-colors`
  / `transition-transform` for hover, selection, and expand feedback. (The risk slider keeps
  its risk gradient but is pure CSS.)
- **Colour is earned, not decorative.** Semantic colour is reserved for data that needs it —
  **risk** (`RiskBadge`, the slider gradient), **status** (`ConnectionStatusBadge` /
  `ScanStatusBadge`), and **exposure** (`ExposurePill`). Everything else is monochrome:
  **gray when idle, brand-blue when selected/active**. Selected chrome is `border-brand/40
  bg-brand/5`; selectable icons go `bg-secondary text-muted-foreground` → `bg-brand/10
  text-brand`; table icon chips stay gray; summary-card and accent icons use the single brand
  token. Primary blue stays for buttons, links, focus rings, and stepper progress.
