#!/usr/bin/env node
/**
 * Extract DB table schemas and sample rows for Data-Source-Explorer skill
 * Outputs JSON files under skills/data-source-explorer/data-samples and schemas/
 */

const path = require('path');
const fs = require('fs');

const projectRoot = path.join(__dirname, '..', '..', '..');
const dbPoolPath = path.join(projectRoot, 'src', 'config', 'databasePool');

let createPoolConnection;
try {
  createPoolConnection = require(dbPoolPath);
} catch (err) {
  console.error('Could not load databasePool from', dbPoolPath, err.message);
  process.exit(1);
}

const tablesCfg = path.join(__dirname, '..', 'config', 'tables.json');
const tables = JSON.parse(fs.readFileSync(tablesCfg, 'utf8'));

const outSamples = path.join(__dirname, '..', 'data-samples');
const outSchemas = path.join(__dirname, '..', 'schemas');
if (!fs.existsSync(outSamples)) fs.mkdirSync(outSamples, { recursive: true });
if (!fs.existsSync(outSchemas)) fs.mkdirSync(outSchemas, { recursive: true });

async function run() {
  let connection;
  try {
    connection = await createPoolConnection();

    for (const table of tables) {
      try {
        const [schemaRows] = await connection.execute(`DESCRIBE \`${table}\``);
        const [rows] = await connection.execute(`SELECT * FROM \`${table}\` LIMIT 10`);

        const simpleSchema = schemaRows.map(r => ({ field: r.Field, type: r.Type, nullable: r.Null === 'YES', key: r.Key, default: r.Default }));

        fs.writeFileSync(path.join(outSchemas, `${table}.schema.json`), JSON.stringify(simpleSchema, null, 2), 'utf8');
        fs.writeFileSync(path.join(outSamples, `${table}.json`), JSON.stringify({ schema: simpleSchema, rows }, null, 2), 'utf8');

        console.log(`Wrote samples for ${table} (${rows.length} rows)`);
      } catch (err) {
        console.warn(`Could not extract table ${table}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Error connecting to DB:', err.message);
  } finally {
    if (connection && typeof connection.release === 'function') connection.release();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
