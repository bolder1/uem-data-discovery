# Devices (iOS and macOS): live product vs Jamf vs revamp

Sources, reviewed 2026-11-16: the live product (`/view-devices`, iOS and macOS
tabs, one iPhone and one Mac detail page) and Jamf Pro (one iPhone and one Mac
record). Both were browsed read-only. The revamp is in `src/pages/devices/` and
`src/components/devices/`.

## List

| | Live product | Jamf Pro | Revamp |
|---|---|---|---|
| Columns | iOS and macOS use different sets (iOS has no device name; macOS adds Ownership, Agent, Uninstall permission) | Saved searches, per-admin columns | One column model with per-platform defaults; Device (name + serial) is always first |
| Platform split | MacBooks appear under the iOS tab | Separate Computers / Devices areas | iOS = iPhone + iPad, macOS = Mac; counts shown on the tabs |
| Health | Active / Inactive only | Not on the list | Compliant / At risk / Not compliant / Not checked in, as clickable count tiles |
| Freshness | Not shown | Last check-in column | Last check-in on every row, red when silent 7+ days |
| Row menu | Same 13 commands for every device; Start and Stop Lost Mode both offered to a phone already in Lost Mode; inactive devices can only be deleted | No row menu | Grouped, and filtered by state from the same catalog as the detail page; disabled items say why |
| Bulk action | Always-visible select, dead until rows are checked | Mass actions from a search | Bar appears only when rows are selected: Sync, Lock, Restart, Add to group |
| Data quality | Duplicate records (6 × serial "UNKNOWN"); names render as `adminb\u0019s` | — | Not reproducible in the prototype; flagged for engineering |

## Detail page

| | Live product | Jamf Pro | Revamp |
|---|---|---|---|
| Verdict | None. "No passcode" and "Data protection: Disabled" sit unflagged in a sub-section | None. 15 (iPhone) / 21 (Mac) inventory sub-screens | Hero verdict ("5 issues to fix · FileVault is off") and an Overview tab with one fix per issue |
| Freshness | Header says Active for a Mac whose system details are a month old | "Managed" for a Mac silent 5 months | Status pill reads "Inactive · silent N days"; System details says "Last known state" |
| State consistency | List shows "Lost Mode Enabled"; details say "MDM Lost Mode: Disabled"; header says nothing | — | One record feeds list, header banner, issues, actions and System details |
| Platform fit | Same header for both platforms | Different records, same layout | iPhone vitals: battery, passcode/data protection, Lost Mode banner. Mac vitals: FileVault, miniOrange agent |
| Tabs | iOS: 4 tabs. macOS: 5 (Groups & Policies only on Mac) | Inventory / Management / History | Both platforms: Overview, Actions, System details, Apps, Groups & policies, Activity, Location |
| Actions | Grouped list with "Find an action"; toggles are a "Choose action" dropdown; Lost Mode row has no control | 24 flat buttons; Wipe next to Send Blank Push; Enable/Disable pairs | Quick tiles + grouped catalog + search; switches show the last reported state; risky actions confirm; unavailable ones explain why |
| System details | Left section nav; "No Device Posture Data Found" repeated in every section; many "Unavailable" rows | Long label/value lists | Same left nav with a to-fix count per section; flagged rows tinted; unreported fields folded into one line; recovery keys masked and reveals audited |
| Commands | Not visible after sending | Pending/failed table, no age; one pending since a month back | Activity tab: Failed (raw error + plain explanation + Retry), Waiting (age, "Stuck" after 7 days, Resend/Cancel), Completed. Every action lands there immediately |
| Location | "Location not found" | — | iOS: shown only in Lost Mode, with the privacy reason when off. Mac: tied to the agent |

## Round 2 — detail page layout (current)

Replaces the hero + Overview tab described above.

- **Frame:** unchanged from round 1 — breadcrumb with Activity / Sync / Remote cast, the profile card with vitals and an "N issues" popover, full-width tabs starting at Actions.

Tabs rebuilt around the jobs admins come for, after reviewing Kandji, Microsoft Intune and FileWave docs:

- **Actions:** starts from the situation, the way tickets arrive — *Lost or stolen*, *User is locked out*, *Something is not working*, *Offboard or hand over* (platform-specific steps). Each opens its ordered steps with state-aware buttons. Below, **All commands** grouped, toggles showing current state. **One Action history** for the whole tab on the right, with Retry / Cancel. Wipe and Deprovision require typing the word (Kandji's ERASE pattern). Added *Send blank push*.
- **System details:** for looking up one fact. Search first; quick reference (serial, UDID, IMEI or Wi‑Fi MAC, model identifier) with copy; a security posture list; then one property table per category (Intune-style), "Not reported" shown in place.
- **Activity:** "Waiting on the device" pinned on top with Send blank push and Cancel all; below, a history table (time, event, type, status, by) grouped by day, check-ins hidden by default, filters for type, status and person; commands expand to delivery steps and the device's response.
- **Fleet activity (`/devices/activity`):** every command across all Apple devices with follow-up / in-flight / done tiles, search, platform and sender filters; filterable to one device.
- **Location:** the product's two sections, improved. *Last location*: time, full address (copy), accuracy, source, coordinates; Map, Satellite (with Labels) or a 3D Globe. *History*: range (24 h / 3 d / 7 d) and List, Map (places sized by visits) or Route (numbered stops in order). Tiles from Esri (no key); globe from `cobe`.

## Open items

- `offlinePolicy()` in `src/data/deviceActions.ts`: which commands may queue for an offline device.
- Engineering: dedupe enrollment records and fix name encoding in the live product.
- Not built: Enroll device flow, Add to group, Manage user, real CSV export.
