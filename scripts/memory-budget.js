#!/usr/bin/env node
/**
 * Memory budget check for @soapjs/soap-express.
 *
 * Measures the RSS increase caused by requiring the package and fails if it
 * exceeds the configured budget.
 *
 * Usage:
 *   node --expose-gc scripts/memory-budget.js
 *
 * The --expose-gc flag is optional but improves measurement accuracy by
 * running GC before sampling.
 *
 * Environment variables:
 *   MEMORY_BUDGET_MB   RSS budget in MB (default: 30)
 */
'use strict';

const BUDGET_MB = Number(process.env.MEMORY_BUDGET_MB) || 30;

function toMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2);
}

function gc() {
  if (typeof global.gc === 'function') {
    global.gc();
    global.gc();
  }
}

gc();
const baseline = process.memoryUsage().rss;

// Require the built package entry point.
// Adjust the path if the build directory changes.
require('../build/index.js');

gc();
const after = process.memoryUsage().rss;

const deltaMB = (after - baseline) / 1024 / 1024;

console.log('──────────────────────────────────────────');
console.log(' @soapjs/soap-express — memory budget check');
console.log('──────────────────────────────────────────');
console.log(` Baseline RSS : ${toMB(baseline)} MB`);
console.log(` After import : ${toMB(after)} MB`);
console.log(` Delta        : ${deltaMB.toFixed(2)} MB`);
console.log(` Budget       : ${BUDGET_MB} MB`);
console.log('──────────────────────────────────────────');

if (deltaMB > BUDGET_MB) {
  console.error(`\n❌  Budget exceeded: ${deltaMB.toFixed(2)} MB > ${BUDGET_MB} MB`);
  console.error('    Re-run footprint analysis and look for new barrel imports.');
  process.exit(1);
} else {
  console.log(`\n✅  Budget OK: ${deltaMB.toFixed(2)} MB < ${BUDGET_MB} MB`);
  process.exit(0);
}
