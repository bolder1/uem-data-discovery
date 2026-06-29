# Data Discovery — miniOrange Endpoint Defence (showcase)

A from-scratch, SaaS-grade prototype of the revamped **Data Discovery** module for
miniOrange Endpoint Defence (UEM). It demonstrates a clear end-to-end workflow:

> **Connect a data source → Create a policy → Run a scan → View results**

All data is in-memory seed data; the wizards append to an in-session store. No backend.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production bundle
```

## What's inside

| Area | Route | Notes |
|---|---|---|
| Dashboard | `/data-discovery` | Summary cards, end-to-end workflow tracker, findings-by-classification, recent scans |
| Data Sources | `/data-discovery/sources` | Card / grid / list catalog. AWS S3 + Azure Blob live; Google Drive + Endpoint "coming soon" |
| Source detail | `/data-discovery/sources/:provider` | Empty state → tabs: Configurations · Policies · Results · Containers/Buckets |
| Configure | `…/sources/:provider/configure` | 4-step wizard: credentials → test → select scope → review → audit-stamped save |
| Policies | `/data-discovery/policies` | List + 6-step wizard with conditional **Buckets (AWS) / Containers (Azure)** step |
| Scan Jobs | `/data-discovery/scans` | Runs feed Results; computed totals; status dot+label |
| Results | `/data-discovery/results` | Filters, Files / Containers tabs, evidence drawer with redacted snippets |

The surrounding product shell (sidebar, top bar) is rendered for context; only Data
Discovery is interactive. Other modules route to a placeholder.

## Iterations (v0 / v1 / v2)

The module ships as switchable iterations via the **top-bar toggle**:

- **v0** — original build (frozen baseline for comparison).
- **v1** — calm redesign: no animation library (CSS-only feedback), colour reserved for
  meaningful data (risk / status / exposure), everything else gray-idle → blue-selected,
  plus the risk slider and the Cards / Split / Table source views.
- **v2** — reconnected flow (default): a scan now **produces findings** (running → completed),
  scan rows **deep-link to their results**, deletes require a **confirmation** that names
  dependents, the Dashboard tracker highlights a **next step**, and connect → policy carries
  the new source. (See [UX-AUDIT.md](UX-AUDIT.md) for the full flaw set behind these.)

Versions resolve per-page with a fallback chain (`src/versions.tsx`), so a version overrides
only the pages it changes and future work lands on the next version without touching the
earlier ones. The store-level fixes (findings synthesis, etc.) are shared infrastructure, so
the corrected Scan → Results loop is visible in every version.

## Stack

Vite · React 19 · TypeScript · Tailwind v4 · shadcn/ui · React Router · lucide-react.

## Structure

```
src/
  components/
    layout/      AppShell, Sidebar, Topbar
    ui/          shadcn primitives
    common/      Stepper, badges, SummaryCard, EmptyState, ViewToggle, MaskedSecret, AuditStamp…
    discovery/   PolicyTable, ScopeTable, FindingsTable
  data/          seed providers, configurations, policies, scans, findings + option lists
  pages/         data-discovery/* + Placeholder
  store/         DataDiscoveryContext (in-session state + actions)
  lib/           cn, formatters, status/risk metadata
  types.ts       domain model
```

See [PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md), [CLOUD.md](CLOUD.md) for the product
brief, design system, and data layer.
