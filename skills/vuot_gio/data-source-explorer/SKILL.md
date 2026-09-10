---
name: data-source-explorer
description: Extract database schemas and sample rows from the overtime module tables. Read-only tool that generates JSON schema definitions and real data samples. Use for understanding table structures, validating queries, and learning data patterns before writing aggregation code.
license: Proprietary
metadata:
  domain: academic-workload
  version: "1.1"
compatibility: Requires database connection via project's databasePool.js config. Read-only operations only.
---

# Data-Source-Explorer Skill

> **Source-of-truth status:** The default table list was reconciled against the Vượt Giờ V2 repositories on **2026-09-10**. Runtime source code is authoritative. Any pre-existing sample for `vg_coi_cham_ra_de` is historical and is not a current KTHP source.

Extracts schema and sample rows from the university's overtime module database tables.

## What it does

Automatically queries configured database tables and generates:
- **Schema files**: Column definitions, types, nullability, keys
- **Sample data**: Up to 10 real rows per table (for learning data patterns)
- **JSON output**: Machine-readable format for agents to understand data shapes

## When to use it

Use this skill when:
- Building queries that touch overtime-related tables
- Validating data mappings and field names
- Understanding real column types and defaults
- Generating test fixtures

## How to run

```bash
node scripts/extract-table-samples.js
```

Outputs to:
- `skills/vuot_gio/data-source-explorer/data-samples/<table>.json` — full schema + sample rows
- `skills/vuot_gio/data-source-explorer/schemas/<table>.schema.json` — simplified schema only

Tables extracted from `config/tables.json` include projected/official overtime sources, the KTHP parent/child tables, and shared reference tables. The extractor is read-only; it does not migrate legacy samples into the current schema.

## Safety and compliance

Read-only operations only. Requires explicit human approval before running against production databases.
