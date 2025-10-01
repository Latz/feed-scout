import { run } from 'node:test';
import { pipeline } from 'stream/promises';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

// Run all tests in the tests directory
const testResults = await run({ 
  files: [
    './tests/eventEmitter.test.js',
    './tests/checkFeed.test.js', 
    './tests/feedScout.test.js',
    './tests/anchors.test.js',
    './tests/metaLinks.test.js',
    './tests/fetchWithTimeout.test.js'
  ] 
});

// Collect results
let passed = 0;
let failed = 0;
let skipped = 0;

for await (const event of testResults) {
  if (event.type === 'test:pass') {
    passed++;
    console.log(`✓ ${event.data.name}`);
  } else if (event.type === 'test:fail') {
    failed++;
    console.log(`✗ ${event.data.name}`);
  } else if (event.type === 'test:skip') {
    skipped++;
    console.log(`- ${event.data.name} (skipped)`);
  }
}

console.log(`\\nTest Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);

if (failed > 0) {
  process.exit(1);
}