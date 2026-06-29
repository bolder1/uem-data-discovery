# PRODUCT.md — Data Discovery

## What

The Data Discovery module of **miniOrange Endpoint Defence** (UEM/CASB surface). It finds and
classifies sensitive data across connected cloud storage and endpoints, governs it with policies,
and surfaces findings for triage. This repo is a showcase prototype of a revamped experience.

## Who

- **Primary:** Endpoint / cloud security admin (the "gautam" persona in the shell). Connects
  storage accounts, defines what counts as sensitive, runs scans, triages exposure.
- **Secondary:** Compliance / auditor reading the results and the audit trail.

## Register

Enterprise security / admin tool. Fleet-scale mindset (design for many containers/buckets, not
a handful). High-stakes actions are audited; credentials are handled with provenance and masking.

## The workflow (the spine of the product)

`Configure data source → Create policy → Run scan → View results`

Surfaced three ways: as the sidebar order, as a data-driven tracker on the Dashboard, and as the
wizards that move work forward one decision per screen.

## Scope of this prototype

- **Live:** Amazon S3, Azure Blob Storage — full configure → policy → scan → results flow, including
  the AWS **Buckets** vs Azure **Containers** distinction.
- **Coming soon:** Google Drive, Endpoint Agents — shown in the catalog, not yet configurable.
- **Data:** in-memory seed; wizards append to an in-session store (`DataDiscoveryContext`). No backend.

## Constraints / future

- Built to scale to more integrations: a new provider is a row in `src/data/providers.ts` plus its
  scope noun (container/bucket/folder/path); tables and wizards are provider-driven.
- The store API (`addConfiguration`, `addPolicy`, `runScan`, …) is the seam where a real Cloud/API
  layer would attach — see [CLOUD.md](CLOUD.md).
