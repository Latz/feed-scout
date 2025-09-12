// Test script to verify tree-shaking
import metaLinks from './dist/modules/metaLinks.js';

console.log('metaLinks module imported successfully');
console.log(typeof metaLinks); // Should be 'function'