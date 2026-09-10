# Data-Source-Explorer Skill

> **Source-of-truth status:** Reconciled against the current Vượt Giờ V2 repositories on **2026-09-10**. When this skill conflicts with source code, source code is authoritative. The old `vg_coi_cham_ra_de` sample/schema is historical; current KTHP runtime uses `vg_kthp` plus its three child tables.

Purpose: Extract schema and sample rows for tables relevant to the overtime module so AI agents can reason about real fields and data shapes.

Usage:
- From the project root run:

```bash
node skills/vuot_gio/data-source-explorer/scripts/extract-table-samples.js
```

Requirements:
- The project must be able to connect to the same database as the running app. The script uses the project's `src/config/databasePool.js` to obtain a connection. Ensure DB credentials in your environment or local config are correct.

Outputs:
- `skills/vuot_gio/data-source-explorer/data-samples/<table>.json` — contains `schema` (DESCRIBE output) and `rows` (up to 10 rows).
- `skills/vuot_gio/data-source-explorer/schemas/<table>.schema.json` — simplified JSON schema (column, type, nullable).

Tables scanned by default are listed in `skills/vuot_gio/data-source-explorer/config/tables.json`. The list includes projected/official Vượt Giờ sources, KTHP parent/child tables, and shared reference tables. You can edit that file to add/remove tables.

The checked-in files `data-samples/vg_coi_cham_ra_de.json` and `schemas/vg_coi_cham_ra_de.schema.json` are retained only as historical extraction artifacts. Do not use them to build current KTHP queries.

Security: The script only performs reads. Do not run against production without approval.
