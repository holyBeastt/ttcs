/**
 * SQL Query Tester - Batch Runner
 * Usage: node skills/sql-query-tester/scripts/run-multi.js <path-to-.sql-file>
 *
 * Reads a .sql file, splits statements by ";" and runs each one sequentially.
 * Only SELECT statements are allowed. Results are printed per-statement.
 */

"use strict";

const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

const pool = require("../../../src/config/Pool.js");

const DEFAULT_LIMIT = 200;
const FORBIDDEN_STARTS = ["insert", "update", "delete", "drop", "truncate", "alter", "create", "replace"];

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
    console.log("  (no rows returned)");
    return;
  }
  const cols = Object.keys(rows[0]);
  const widths = cols.map((c) =>
    Math.max(c.length, ...rows.map((r) => String(r[c] ?? "NULL").length))
  );
  const separator = widths.map((w) => "-".repeat(w + 2)).join("+");
  const header = cols.map((c, i) => ` ${c.padEnd(widths[i])} `).join("|");
  console.log(`  +${separator}+`);
  console.log(`  |${header}|`);
  console.log(`  +${separator}+`);
  rows.forEach((row) => {
    const line = cols.map((c, i) => ` ${String(row[c] ?? "NULL").padEnd(widths[i])} `).join("|");
    console.log(`  |${line}|`);
  });
  console.log(`  +${separator}+`);
  console.log(`  ${rows.length} row(s)`);
}

async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error("Usage: node run-multi.js <path-to-sql-file>");
    process.exit(1);
  }

  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`[ERROR] File not found: ${resolvedPath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(resolvedPath, "utf8");
  const statements = fileContent
    .split(";")
    .map((s) => s.replace(/--.*$/gm, "").trim())  // strip single-line comments
    .filter((s) => s.length > 0);

  if (statements.length === 0) {
    console.log("No statements found in file.");
    process.exit(0);
  }

  console.log(`\nFound ${statements.length} statement(s) in ${path.basename(resolvedPath)}\n`);

  let connection;
  try {
    connection = await pool.getConnection();

    for (let i = 0; i < statements.length; i++) {
      const raw = statements[i];
      console.log(`--- Statement ${i + 1} ---`);
      console.log(raw);
      console.log();

      if (isForbidden(raw)) {
        console.log(`[BLOCKED] Statement starts with forbidden keyword "${raw.split(/\s+/)[0].toUpperCase()}". Skipping.\n`);
        continue;
      }

      const sql = injectLimit(raw, DEFAULT_LIMIT);
      const start = Date.now();
      try {
        const [rows] = await connection.execute(sql);
        console.log(`[RESULT] (${Date.now() - start}ms)`);
        printTable(rows);
      } catch (stmtErr) {
        console.error(`[ERROR] ${stmtErr.message}`);
      }
      console.log();
    }
  } catch (err) {
    console.error("\n[FATAL]", err.message);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

main();
