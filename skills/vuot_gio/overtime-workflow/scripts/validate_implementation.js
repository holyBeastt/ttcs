#!/usr/bin/env node
/**
 * Validator: compare canonical formulas to implementation
 * Usage: node validate_implementation.js [--propose]
 * - reads examples/fixtures.json
 * - requires ../../src/mappers/vuotgio_v2/summary.mapper.js and calls calculateOvertime
 * - produces a JSON report in reports/
 * - DOES NOT change code or skill files without --propose (and even then will only write a proposed_update.md)
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const fixturesPath = path.join(__dirname, '..', 'examples', 'fixtures.json');
// project root is three levels up from this script: skills/overtime-workflow/scripts -> project
const mapperPath = path.join(__dirname, '..', '..', '..', 'src', 'mappers', 'vuotgio_v2', 'summary.mapper.js');

function checksumOfFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function loadMapper() {
  try {
    const mapper = require(mapperPath);
    if (!mapper || typeof mapper.calculateOvertime !== 'function') {
      throw new Error('calculateOvertime not found in mapper');
    }
    return mapper;
  } catch (err) {
    console.error('Error loading mapper:', err.message);
    process.exit(1);
  }
}

function run() {
  const mapper = loadMapper();
  const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));
  const results = [];

  // compute checksum of mapper file
  let mapperChecksum = null;
  try {
    mapperChecksum = checksumOfFile(mapperPath);
  } catch (err) {
    console.warn('Could not compute checksum of mapper file:', err.message);
  }

  // read meta baseline if present
  const metaPath = path.join(__dirname, '..', 'meta.json');
  let baseline = null;
  if (fs.existsSync(metaPath)) {
    try { baseline = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (e) { baseline = null; }
  }

  fixtures.forEach(f => {
    const input = f.input || {};
    const actual = mapper.calculateOvertime(input);
    // if expected provided, compute field diffs
    const expected = f.expected || null;
    let diffs = null;
    if (expected) {
      diffs = [];
      Object.keys(Object.assign({}, expected, actual)).forEach(k => {
        const ev = expected[k];
        const av = actual[k];
        if (JSON.stringify(ev) !== JSON.stringify(av)) {
          diffs.push({ field: k, expected: ev, actual: av });
        }
      });
    }
    results.push({ id: f.id, description: f.description, input, actual, expected, diffs });
  });

  const reportsDir = path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  const outFile = path.join(reportsDir, `diff-report-${Date.now()}.json`);
  const report = { timestamp: new Date().toISOString(), mapperChecksum, baselineChecksum: baseline?.mapperChecksum || null, results };
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2), 'utf8');
  console.log('Validation report written to', outFile);

  // If any expected exists and differs, show a summary
  const diffs = results.filter(r => r.diffs && r.diffs.length > 0);

  if (baseline && baseline.mapperChecksum && mapperChecksum && baseline.mapperChecksum !== mapperChecksum) {
    console.warn('Mapper checksum differs from baseline. Implementation may have drifted.');
  }

  if (diffs.length > 0) {
    console.warn('Found diffs for', diffs.length, 'fixtures. Run with --propose to generate a proposed update.');
  } else {
    console.log('No diffs detected against provided expected outputs.');
  }

  if (process.argv.includes('--propose')) {
    const proposedPath = path.join(__dirname, '..', 'references', 'proposed_update.md');
    const summary = {
      mapperChecksum,
      baselineChecksum: baseline?.mapperChecksum || null,
      diffs: diffs.map(d => ({ id: d.id, diffs: d.diffs })),
      note: 'This is a proposed update. Do NOT apply automatically. Human confirmation required.'
    };
    const text = `Proposed update generated: ${new Date().toISOString()}\n\n` + JSON.stringify(summary, null, 2);
    fs.writeFileSync(proposedPath, text, 'utf8');
    console.log('Proposed update written to', proposedPath);
  }
}

run();
