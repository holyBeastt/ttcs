---
name: sql-query-tester
description: >
  Use this skill when you need to run, inspect, or validate a SQL query against
  the local MySQL database of this project. Triggers when the user asks to
  "test this query", "run this SQL", "check the result of a query",
  "explain this query", or when you have just written a new query and want to
  verify it returns the expected structure before placing it in production code.
---

# SQL Query Tester Skill

## Purpose

Run, inspect, and validate SQL queries against the project local MySQL database
without modifying any source code. The skill provides three modes:

| Mode | Script | What it does |
|---|---|---|
| **run** | `scripts/run-query.js` | Execute a SELECT query and print results as a table |
| **explain** | `scripts/explain-query.js` | Run EXPLAIN on a query and warn about full-table scans |
| **multi** | `scripts/run-multi.js` | Run multiple queries from a `.sql` file sequentially |

## Directory Layout

```
skills/sql-query-tester/
  SKILL.md                  <- this file
  scripts/
    run-query.js            <- single query runner
    explain-query.js        <- EXPLAIN analyser
    run-multi.js            <- batch runner from .sql file
  queries/
    examples.sql            <- example queries to copy from
  output/
    .gitkeep                <- result snapshots written here (git-ignored)
  .gitignore
```

## How to Use

### 1. Run a single SELECT query

```bash
node skills/sql-query-tester/scripts/run-query.js "<SQL>"
```

Example:
```bash
node skills/sql-query-tester/scripts/run-query.js "SELECT id_User, TenNhanVien FROM NhanVien LIMIT 5"
```

Output: a formatted table printed to stdout + a JSON snapshot saved to
`skills/sql-query-tester/output/last-result.json`.

### 2. Explain a query

```bash
node skills/sql-query-tester/scripts/explain-query.js "<SQL>"
```

Prints the raw EXPLAIN rows and a human-readable warning if any row uses
`type = ALL` (full-table scan) or `key = NULL` (no index used).

### 3. Batch run from a .sql file

```bash
node skills/sql-query-tester/scripts/run-multi.js skills/sql-query-tester/queries/examples.sql
```

Each statement separated by `;` is executed and results printed in order.

## Connection

Scripts reuse `src/config/Pool.js` (mysql2/promise pool).
The `.env` file at the project root must be present with:
```
DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT
```

## Contracts

- Scripts are **read-only by default**. They will refuse to run any statement
  that starts with `INSERT`, `UPDATE`, `DELETE`, `DROP`, `TRUNCATE`, `ALTER`,
  or `CREATE` and will print an error instead.
- Results are automatically limited to **200 rows** unless the query already
  contains a `LIMIT` clause.
- Output JSON snapshots go to `output/` which is git-ignored.
- This skill must never be deployed to production; it exists only in local dev.
