/**
 * SQL Query Tester - EXPLAIN Analyser
 * Usage: node skills/sql-query-tester/scripts/explain-query.js "<SQL>"
 *
 * Runs EXPLAIN on the given query and warns about performance issues:
 *   - type = ALL  -> full table scan
 *   - key = NULL  -> no index used
 *   - rows > 1000 -> large estimated row scan
 */

"use strict";

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

const pool = require("../../../src/config/Pool.js");

const FORBIDDEN_STARTS = ["insert", "update", "delete", "drop", "truncate", "alter", "create", "replace"];

function isForbidden(sql) {
  const first = sql.trim().toLowerCase().split(/\s+/)[0];
  return FORBIDDEN_STARTS.includes(first);
}

function analyseExplainRows(explainRows) {
  const warnings = [];
  explainRows.forEach((row, idx) => {
    const label = row.table ? `Table "${row.table}"` : `Step ${idx + 1}`;
    if (row.type === "ALL") {
      warnings.push(`[WARN] ${label}: FULL TABLE SCAN (type=ALL). Consider adding an index.`);
    }
    if (row.key === null) {
      warnings.push(`[WARN] ${label}: No index used (key=NULL).`);
    }
    if (Number(row.rows) > 1000) {
      warnings.push(`[WARN] ${label}: Estimated ${row.rows} rows scanned. Could be slow on large datasets.`);
    }
  });
  return warnings;
}

function printExplainTable(rows) {
  if (!rows || rows.length === 0) {
    console.log("(no EXPLAIN output)");
    return;
  }

  const cols = ["id", "select_type", "table", "type", "possible_keys", "key", "key_len", "ref", "rows", "Extra"];
  const widths = cols.map((c) =>
    Math.max(c.length, ...rows.map((r) => String(r[c] ?? "NULL").length))
  );

  const separator = widths.map((w) => "-".repeat(w + 2)).join("+");
  const header = cols.map((c, i) => ` ${c.padEnd(widths[i])} `).join("|");

  console.log(`+${separator}+`);
  console.log(`|${header}|`);
  console.log(`+${separator}+`);
  rows.forEach((row) => {
    const line = cols.map((c, i) => ` ${String(row[c] ?? "NULL").padEnd(widths[i])} `).join("|");
    console.log(`|${line}|`);
  });
  console.log(`+${separator}+`);
}

async function main() {
  const rawSql = process.argv.slice(2).join(" ").trim();

  if (!rawSql) {
    console.error('Usage: node explain-query.js "<SQL statement>"');
    process.exit(1);
  }

  if (isForbidden(rawSql)) {
    console.error(
      `[BLOCKED] This skill only allows read-only queries.\n` +
      `Statement starts with a forbidden keyword: "${rawSql.trim().split(/\s+/)[0].toUpperCase()}"`
    );
    process.exit(1);
  }

  const explainSql = `EXPLAIN ${rawSql.trim()}`;

  console.log("\n[EXPLAIN SQL]");
  console.log(explainSql);
  console.log();

  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(explainSql);

    console.log("[EXPLAIN RESULT]");
    printExplainTable(rows);

    const warnings = analyseExplainRows(rows);
    if (warnings.length === 0) {
      console.log("\n[OK] No performance issues detected.");
    } else {
      console.log("\n[PERFORMANCE ANALYSIS]");
      warnings.forEach((w) => console.log(w));
    }
  } catch (err) {
    console.error("\n[ERROR]", err.message);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

main();
