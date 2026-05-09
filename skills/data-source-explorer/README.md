# Data-Source-Explorer Skill

Purpose: Extract schema and sample rows for tables relevant to the overtime module so AI agents can reason about real fields and data shapes.

Usage:
- From the project root run:

```bash
node skills/data-source-explorer/scripts/extract-table-samples.js
```

Requirements:
- The project must be able to connect to the same database as the running app. The script uses the project's `src/config/databasePool.js` to obtain a connection. Ensure DB credentials in your environment or local config are correct.

Outputs:
- `skills/data-source-explorer/data-samples/<table>.json` — contains `schema` (DESCRIBE output) and `rows` (up to 10 rows).
- `skills/data-source-explorer/schemas/<table>.schema.json` — simplified JSON schema (column, type, nullable).

Tables scanned by default are listed in `config/tables.json`. You can edit that file to add/remove tables.

Security: The script only performs reads. Do not run against production without approval.
