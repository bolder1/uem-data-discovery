# Data Discovery — End-to-End UX Flow Audit & Improved Flow

**Scope:** the connected journey **Connect a data source → Create a policy → Run a scan → View & triage results**, plus the navigation/IA and global chrome around it.
**Method:** six expert lenses audited the *actual source code*; every claimed flaw was then adversarially re-checked against the code, and only confirmed issues were kept (one hallucinated detail — "6 configurations" — was caught and corrected to 2). **40 confirmed flaws: 2 blockers, 18 major, 20 minor.**

> **Status — fully remediated in `v2` (Phases 1–3 shipped). 40 / 40 closed.** Both blockers, all 18 major, all 20 minor. Store-level fixes (findings synthesis, triage status) are shared infrastructure; the UX reconnections, validation, triage, responsive shell, and a11y/copy fixes live in the v2 page-set (with a `createBrowserRouter` upgrade enabling the unsaved-changes guard). v0/v1 are preserved for comparison.

### Inputs (placeholders resolved from the build)
- **Current flow** — the implemented Data Discovery module (mapped in §2).
- **Personas** — *Primary:* endpoint/cloud **security admin** ("gautam") who connects storage, defines what's sensitive, scans, and triages. *Secondary:* **compliance/auditor** reading results + the audit trail.
- **Platform** — Web, desktop-first React SPA (Vite/React/Tailwind/shadcn). In-memory prototype, no backend.
- **Guidelines** — MiniOrange enterprise-security laws + `DESIGN.md` (calm, status = dot+label, audit-visible, stakes-graded friction, non-revealing copy).

---

## 1. Headline

The flow *looks* complete but is **not connected at its two most important seams**:

1. **The payoff never lands.** Running a scan never produces findings, so **Scan → Results is broken** (`findings` is declared without a setter; `runScan` only appends a scan job). For any source the user actually connects, a scan reports "N sensitive found" yet Results shows the unchanged seed list. *This is the single most important fix.*
2. **The highest-stakes action is the least guarded.** Deleting a policy or a connection fires on one menu click — **no confirmation, no undo, no dependency warning** — in a security product.

Around those, the journey leaks context at every handoff (connect→policy loses the new source), gives almost no feedback after actions (no toast/confirmation system exists), and dead-ends in several places (inert sidebar items, read-only triage, scan rows that link nowhere).

---

## 2. Current flow, as built

| Stage | Where | Connects forward via |
|---|---|---|
| **Enter** | Dashboard: summary cards + 4-step workflow tracker | "Review/Connect" CTAs per step |
| **Connect** | Data Sources catalog → provider detail (empty state) → 4-step Configure wizard → success | "Create policy" CTA |
| **Policy** | Policies list → 6-step wizard (general · file types · classification · source · scope · review) → success | "Run scan now" |
| **Scan** | Run from policy success, Policies row menu, or Scan Jobs "Run scan" → Scan Jobs table | *(nothing — see flaws)* |
| **Results** | Results: filters + Files/Containers tabs + read-only evidence drawer | *(journey ends here)* |

The **spine is right**; the **connective tissue between stages is thin or missing**.

---

## 3. Flaws, clustered (severity · code evidence)

### Cluster A — The Scan→Results loop is broken *(the payoff)*
- **A1 · BLOCKER — Scans create no findings.** `DataDiscoveryContext` declares `const [findings] = useState(seedFindings)` (no setter); `runScan` appends a `ScanJob` and stamps `lastRun` but never adds a `Finding`. Results/Dashboard read the static array, so they're byte-identical before/after a scan; a *newly connected* source yields zero discoverable findings.
- **A2 · major — Scans complete instantly.** `runScan` hard-codes `status:'completed'` synchronously; the `running`/`queued` states (and the amber pulsing badge already built in `lib/format.ts`) are unreachable.
- **A3 · major — Scan rows link nowhere.** Each Scan Jobs row is a plain `TableRow`; Results reads no URL params; `Finding` has no `scanId`. After "N sensitive found" there's no click that shows those N files.
- **A4 · major — Triage is view-only.** The evidence drawer has no Acknowledge/Resolve/Dismiss/Export; `Finding` has no status field — yet the flow's final step is literally labeled "Review **and triage**."
- **A5 · minor — Container→Files drill-down is a dead number.** The Containers tab shows "Total findings: N" but it isn't clickable, and the Files tab has no scope filter.
- **A6 · minor — Empty scans look successful.** `runScan` can return `undefined`/zero-result; callers always `navigate('/scans')` to a green "completed" row of zeros.

### Cluster B — State-change safety & feedback
- **B1 · BLOCKER — Instant destructive deletes.** Policy and connection deletes fire on a single `DropdownMenuItem` click; grep finds zero `confirm`/`AlertDialog`/`toast` in `src/` (Radix AlertDialog *is* in node_modules, unused).
- **B2 · major — Deleting a connection silently orphans policies/scans.** No cascade, no warning; the orphaned policy still reads "Enabled" and runs to a falsely-"completed" empty scan.
- **B3 · major — No feedback after any non-wizard mutation.** Toggle / delete / run-from-list all mutate silently (no toast system), inviting double-clicks.
- **B4 · major — "Disabled" is cosmetic.** A disabled policy can be scanned from the row menu *and* from the success card's "Run scan now," directly contradicting the wizard's own copy ("Disabled policies … won't run").

### Cluster C — Guided continuity & handoffs
- **C1 · major — Dashboard tracker shows all-done on load.** Completion is derived from seed presence, so `activeIndex = -1`: no "next step" is ever highlighted — the tracker's whole purpose. (And **C1b · major**: the default v1 tracker dropped the "done" branch, so completed steps render a green check on a *gray "not-started"* circle.)
- **C2 · major — connect→policy loses the new source.** The Configure success "Create policy" link carries no state; the policy wizard opens with no source selected, forcing the user to re-find the connection they just made.
- **C3 · major — Stale test validation.** After a passing test, editing a credential and returning keeps the green "Connection verified" gate (no reset), so unverified credentials can be saved.
- **C4 · major — Test always succeeds.** No failure branch; the recovery loop the data model supports is never shown.
- **C5 · minor — Picking a source auto-selects *all* scopes** (incl. a public 1.2 GB bucket); step 4 passes with one Next click.
- **C6 · minor — Review shows counts, not names** (which containers / which types), right before an irreversible create.
- **C7 · minor — "Duplicate" opens a blank wizard** (no fields copied).
- **C8 · minor — No unsaved-changes guard;** a sidebar click discards an in-progress wizard (incl. entered credentials).

### Cluster D — Navigation & IA
- **D1 · major — Inert sidebar items are dead-ends.** ~12 nav rows look identical to live ones but route to a `Placeholder` ("not part of this prototype") with **no back action**.
- **D2 · minor — Sub-tabs aren't URL-driven** (Provider detail, Results): not deep-linkable, and browser Back ejects the whole page instead of restoring the tab.
- **D3 · minor — Version toggle resets to v1 on reload** (no localStorage/`?v=`) and is unlabeled below `xl`.
- **D4 · minor — Dead global chrome:** top-bar search, Reporting, and the always-on notification dot do nothing; the "View audit entry" link is unwired.
- **D5 · minor — "Edit connection" is a no-op;** the only way to fix a typo is delete + re-run the wizard.
- **D6 · minor — No duplicate-name check** on configurations (indistinguishable in the source picker).
- **D7 · minor — Dashboard/"Data Discovery" naming overlap** (two names → one route; Dashboard has no breadcrumb).

### Cluster E — Consistency, accessibility, responsive
- **E1 · major — Sidebar is a fixed 260 px, uncollapsible;** with `overflow-hidden` on the shell, the whole journey is crushed on phones/tablets (no hamburger, no drawer).
- **E2 · minor — CTA verbs/casing drift:** "Create Policy" vs "Create policy"; "Add Configuration" vs "Create configuration."
- **E3 · minor — RiskSlider a11y:** a `role="slider"` plus a parallel button row whose selection isn't exposed (`aria-pressed` missing).
- **E4 · minor — v0/v1 classification column differs** (text codes vs hover-only icons with no `aria-label`/`title` → unreachable on touch/AT).
- **E5 · minor — Connection status encoded two ways** (catalog icon+label vs detail dot+label; wording differs).
- **E6 · minor — Stepper labels vanish < 640 px** (numbers only); v1 ViewToggle is icon-only without `aria-pressed`.

---

## 4. The improved, connected flow (revised narrative)

The fixes don't add features — they **close loops and carry context** so each stage hands off cleanly to the next.

1. **Enter (Dashboard).** The tracker always highlights the *recommended next action* (and renders done steps as genuinely "done"). A first-timer sees "Connect a source" emphasized; a returning user sees "View results." → *fixes C1, C1b.*
2. **Connect.** Catalog → provider → Configure wizard. The **test step can fail** (sentinel credential) with a Retry; **editing a credential resets the gate**; duplicate names are rejected. On success, the audit stamp is honest (static), and **"Create policy" carries the new `configurationId`**. → *C2, C3, C4, D6.*
3. **Policy.** The wizard opens **with the just-connected source pre-selected** (source step already satisfied). Scopes default to a **deliberate** choice (public buckets flagged, not pre-checked). The **Review step lists actual names** (and public-exposure pills). Creating a *disabled* policy hides "Run scan now." → *C2, C5, C6, B4.*
4. **Scan.** `runScan` inserts a **`running`** job, then flips to **`completed`** shortly after, and **synthesizes findings** for the scanned scopes (tagged with `scanId`). Every run path gives **explicit feedback** (toast / highlighted new row), and an empty/disabled run says so instead of faking success. → *A1, A2, A6, B3, B4.*
5. **Results & triage.** A scan row (and the post-scan toast) **deep-links into Results pre-filtered to that scan**; the new findings are there. Containers' "Total findings" is **clickable** into the filtered Files list. The evidence drawer gains **Acknowledge / Dismiss / Export**, and a `status` column makes triage trackable. → *A3, A4, A5.*
6. **Throughout.** Deletes go through a **confirm dialog that names dependents**; mutations confirm via toast; the **sidebar collapses to a drawer** on mobile; tabs/version live in the **URL**; copy and status encodings are **unified**; dead controls are disabled or removed. → *B1, B2, D1–D5, E1–E6.*

**Sequence note (the corrected spine):**
`Dashboard(next-step) → Catalog → Configure(test↔retry, gate-reset) →[carry id]→ Policy(pre-filled source, deliberate scope, named review) →[run]→ Scan(running→completed, findings created) →[deep-link]→ Results(filtered to scan) → Triage(acknowledge/dismiss/export) → Audit`. Confirm dialogs gate every destructive branch; toasts close every mutation.

---

## 5. Change set → flaws → rationale

| # | Change | Fixes | Rationale |
|---|---|---|---|
| 1 | **Make `findings` stateful; `runScan` synthesizes findings (with `scanId`) for scanned scopes; insert `running`→`completed`** | A1, A2 | Restores the journey's payoff and the in-progress affordance the design already built. |
| 2 | **Deep-link Scan Jobs row & post-scan toast → Results filtered by source/scan; Results reads `?source`/`?scan`** | A3, A6, D2 | Connects scan to its own results; removes the manual re-filter backtrack. |
| 3 | **Triage actions (Acknowledge/Dismiss/Export) + `Finding.status` column/filter; clickable container→files** | A4, A5 | The labeled "triage" stage gets an actual next step; closes the loop. |
| 4 | **Confirm dialog (Radix AlertDialog) for deletes, naming dependents; cascade/disable orphans; toasts on mutations** | B1, B2, B3 | Stakes-graded friction + no silent failure — core MiniOrange laws. |
| 5 | **Gate run on `policy.status`; hide "Run scan now" for disabled** | B4 | Make the rule the UI shows actually true. |
| 6 | **Tracker: always emphasize a next action; restore "done" styling** | C1, C1b | The orientation hub guides instead of confusing. |
| 7 | **Carry `configurationId` connect→policy; pre-select source** | C2 | The contextual handoff keeps its context. |
| 8 | **Reset test gate on credential edit; add a demo failure+Retry; reject duplicate names** | C3, C4, D6 | Validation tells the truth; the unhappy path exists. |
| 9 | **Deliberate scope default + public flag; Review lists names** | C5, C6 | Consequential choices are explicit before an irreversible commit. |
| 10 | **"Duplicate" pre-fills (or relabel); unsaved-changes guard** | C7, C8 | Labels match behavior; no silent data loss. |
| 11 | **Sidebar drawer < lg + hamburger (reuse Sheet); mark inert items "Coming soon"; Placeholder gets a back action** | D1, E1 | The journey survives small screens and stops dead-ending. |
| 12 | **URL-drive tabs + version (`?v=`, persist); disable/remove dead chrome** | D2, D3, D4, D5, D7 | Deep-linkable, reload-stable, no fake affordances. |
| 13 | **Unify CTA copy + status encoding; slider/ViewToggle/stepper a11y; classification cell parity** | E2, E3, E4, E5, E6 | One learnable language; touch/AT reachable. |

---

## 6. Success criteria (measurable)

- **Loop integrity:** after a scan, ≥1 new finding attributable to that scan appears in Results (currently **0**); Dashboard "Sensitive findings" changes. *Target: 100% of scans produce traceable results.*
- **Task completion:** connect→policy→scan→see-results completed without backtracking to re-select the source or re-filter Results. *Target: 0 backtracks; ≥30% fewer clicks on the connect→results path.*
- **Safety:** destructive actions require explicit confirm; **0** accidental deletes; orphaned-policy warnings shown 100% of the time.
- **Orientation:** the Dashboard tracker always emphasizes exactly one next action; first-task time-to-first-action drops.
- **Feedback:** every mutation produces visible confirmation (toast/highlight). *Target: 100%; measure repeat/duplicate clicks → near 0.*
- **Reach:** journey completable at 375 px width; WCAG AA on the slider, tabs, selects, and classification cell (keyboard + SR reachable).
- **Consistency:** one verb/casing per action; one status encoding across catalog/detail.

---

## 7. Implementation plan (ship as **v2**, keeping v0/v1 intact)

The versioning model already in place makes this clean — land the fixes as **v2**, leave v0/v1 for comparison.

- **Phase 1 — Reconnect the spine (blockers + core continuity).** Change set 1, 2, 4, 6, 7. *(scan→results loop, delete confirmations, tracker, connect→policy hand-off.)* Highest value; small, central diffs (mostly `DataDiscoveryContext` + Results params + an AlertDialog + a toast primitive).
- **Phase 2 — Honest decisions & triage.** Change set 3, 5, 8, 9. *(triage actions, disabled-policy gating, validation reset/failure path, deliberate scope + named review.)*
- **Phase 3 — Reach & polish.** Change set 10–13. *(mobile drawer, inert-item affordances, URL tabs/version, copy + a11y + status unification, dead-control cleanup.)*

A single small **toast** primitive and one **AlertDialog** wrapper (both already available via the installed Radix/shadcn deps) unlock most of Phases 1–2.

---

## 8. Constraints honored

No unrelated features introduced — every change reconnects or clarifies the **existing** scope. Compliance/accessibility considerations are *strengthened* (confirm dialogs, audit honesty, AA reachability), never removed. Core goals and user needs are unchanged. Trade-off taken per the brief: where speed conflicted with usability, **usability won** (e.g., deliberate scope selection over one-click "scan everything").
