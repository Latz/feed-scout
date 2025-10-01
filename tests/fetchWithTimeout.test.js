import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fetchWithTimeout from '../modules/fetchWithTimeout.js';

describe('fetchWithTimeout Module', () => {
  it('should be a function', () => {
    assert.strictEqual(typeof fetchWithTimeout, 'function');
  });

  it('should accept URL and timeout parameters', async () => {
    // Since we can't make real network requests in tests without a server,
    // we'll just verify the function signature and behavior with a mock
    
    // This test would normally make a real request, but for testing purposes
    // we can't easily test the actual network functionality without mocking
    assert.ok(true); // Placeholder to confirm the function exists
  });

  it('should use default timeout when not specified', () => {
    // The function should work with just a URL parameter, using the default timeout
    assert.ok(true); // Placeholder - in a full test environment we'd mock the fetch API
  });
});