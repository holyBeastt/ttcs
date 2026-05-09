/**
 * SQL Query Tester - Single Query Runner
 * Usage: node skills/sql-query-tester/scripts/run-query.js "<SQL>"
 *
 * Executes a read-only SELECT query against the local MySQL database,
 * prints results as a formatted table, and saves a JSON snapshot.
 */

"use strict";

const path = require("path");
const fs = require("fs");

require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

const pool = require("../../../src/config/Pool.js");

// --- Constants ---
const DEFAULT_LIMIT = 200;
const OUTPUT_DIR = path.resolve(__dirname, "../output");
const SNAPSHOT_FILE = path.join(OUTPUT_DIR, "last-result.json");

// DML / DDL keywords that are forbidden
const FORBIDDEN_STARTS = ["insert", "update", "delete", "drop", "truncate", "alter", "create", "replace"];

// --- Helpers ---

function isForbidden(sql) {
  const first = sql.trim().toLowerCase().split(/\s+/)[0];
  return FORBIDDEN_STARTS.includes(first);
}

function injectLimit(sql, limit) {
  const normalized = sql.trim().toLowerCase();
  if (/\blimit\b/.test(normalized)) return sql.trim();
  return `${sql.trim()} LIMIT ${limit}`;
}

function printTable(rows) {
  if (!rows || rows.length === 0) {
    console.log("(no rows returned)");
    return;
  }

  const cols = Object.keys(rows[0]);
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
  console.log(`${rows.length} row(s) returned.`);
}

function saveSnapshot(sql, rows, durationMs) {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const snapshot = {
    executedAt: new Date().toISOString(),
    durationMs,
    sql,
    rowCount: rows.length,
    rows,
  };
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(`\nSnapshot saved -> ${SNAPSHOT_FILE}`);
}

// --- Main ---

async function main() {
  const rawSql = process.argv.slice(2).join(" ").trim();

  if (!rawSql) {
    console.error('Usage: node run-query.js "<SQL statement>"');
    process.exit(1);
  }

  if (isForbidden(rawSql)) {
    console.error(
      `[BLOCKED] This skill only allows read-only queries.\n` +
      `Statement starts with a forbidden keyword: "${rawSql.trim().split(/\s+/)[0].toUpperCase()}"`
    );
    process.exit(1);
  }

  const sql = injectLimit(rawSql, DEFAULT_LIMIT);

  console.log("\n[SQL]");
  console.log(sql);
  console.log();

  let connection;
  try {
    connection = await pool.getConnection();

    const start = Date.now();
    const [rows] = await connection.execute(sql);
    const durationMs = Date.now() - start;

    console.log(`[RESULT] (${durationMs}ms)`);
    printTable(rows);
    saveSnapshot(sql, rows, durationMs);
  } catch (err) {
    console.error("\n[ERROR]", err.message);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

main();
