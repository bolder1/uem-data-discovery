# CLOUD.md — data & state layer

This prototype has **no backend**. State is an in-memory store seeded from `src/data/`. This file
documents the data model and the seam where a real API would attach.

## Domain model (`src/types.ts`)

- **Provider** — a catalog entry (Azure Blob, S3, Drive, Endpoint). Carries `scopeNoun`
  (`container | bucket | folder | path`) which drives provider-specific labels everywhere.
- **Configuration** — a connection to a provider. Azure fields (storage account, tenant/client id,
  masked secret, endpoint suffix) or AWS fields (access key id, masked secret, region), plus the
  **Scopes** discovered on it.
- **Scope** — a container (Azure) or bucket (AWS): objects, sensitive count, size, public access, last scan.
- **Policy** — name, risk, enabled flag, selected `fileTypeIds` + `classificationIds`, a
  `configurationId`, and `scopeIds` to scan.
- **ScanJob** — a run of a policy: status, started, duration, objects/sensitive/bytes, scope ids.
- **Finding** — a discovered file: path, type, risk, classifications, exposure, and redacted `evidence`.

Option lists (`classifications`, `fileTypes`) and lookups (`providerById`, `classificationById`, …)
live alongside the seed data.

## Store (`src/store/DataDiscoveryContext.tsx`)

A React context holding `configurations`, `policies`, `scans`, `findings`, with actions:

| Action | Effect |
|---|---|
| `addConfiguration(input)` | Appends a connection (status `connected`, audit fields stamped) |
| `deleteConfiguration(id)` | Removes a connection |
| `addPolicy(input)` | Prepends a policy |
| `togglePolicy(id)` / `deletePolicy(id)` | Enable/disable / remove |
| `runScan(policyId)` | Creates a completed `ScanJob` with totals summed from the policy's scopes, updates `lastRun` |

## Wiring a real backend

Each action is the integration seam. Replace the in-memory `setState` calls with API requests:

- `addConfiguration` → `POST /data-discovery/configurations` (server validates creds, returns discovered scopes).
- `runScan` → `POST /scans` (async job; poll or stream status — the `ScanStatus` enum already covers
  `queued | running | completed | failed`).
- Findings → `GET /findings?configurationId=&classification=&risk=&exposure=` mirrors the Results filters.

Credentials should be write-only at the API boundary; the client only ever holds the masked form
plus provenance (source + last-rotated), as the UI already assumes.
