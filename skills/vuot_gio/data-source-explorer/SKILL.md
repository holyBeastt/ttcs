---
name: data-source-explorer
description: Extract database schemas and sample rows from the overtime module tables. Read-only tool that generates JSON schema definitions and real data samples. Use for understanding table structures, validating queries, and learning data patterns before writing aggregation code.
license: Proprietary
metadata:
  domain: academic-workload
  version: "1.0"
compatibility: Requires database connection via project's databasePool.js config. Read-only operations only.
---

# Data-Source-Explorer Skill

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
- `data-samples/<table>.json` — full schema + sample rows
- `schemas/<table>.schema.json` — simplified schema only

Tables extracted from `config/tables.json` include all overtime sources and reference tables.

## Safety and compliance

Read-only operations only. Requires explicit human approval before running against production databases.
