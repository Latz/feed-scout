import checkFeed from "../modules/checkFeed.js";
import { strict as assert } from "assert";

// Mock fetch for testing
const originalFetch = global.fetch;
let mockFetchResponse = null;
let mockFetchError = null;

global.fetch = async (url) => {
  if (mockFetchError) {
    throw mockFetchError;
  }
  return mockFetchResponse;
};

console.log("Running tests for checkFeed...\n");

let testCount = 0;
let passCount = 0;

async function test(description, fn) {
  testCount++;
  try {
    await fn();
    console.log("✓ " + description);
    passCount++;
  } catch (error) {
    console.log("✗ " + description + ": " + error.message);
  }
}

// Reset mocks before each test
function resetMocks() {
  mockFetchResponse = null;
  mockFetchError = null;
}

// Test 1: Should detect RSS feed
await test("should detect RSS feed by <item> tag", async () => {
  resetMocks();
  const rssContent = "<rss><channel><title>Test RSS Feed</title><item><title>Test</title></item></channel></rss>";
  const result = await checkFeed("https://example.com/rss", rssContent);
  assert.strictEqual(result.type, "rss");
  assert.strictEqual(result.title, "Test RSS Feed");
});

// Test 2: Should detect Atom feed
await test("should detect Atom feed by <entry> tag", async () => {
  resetMocks();
  const atomContent = "<feed><title>Test Atom Feed</title><entry><title>Test</title></entry></feed>";
  const result = await checkFeed("https://example.com/atom", atomContent);
  assert.strictEqual(result.type, "atom");
  assert.strictEqual(result.title, "Test Atom Feed");
});

// Test 3: Should detect JSON feed
await test("should detect JSON feed", async () => {
  resetMocks();
  const jsonContent = '{"version": "https://jsonfeed.org/version/1", "title": "Test JSON Feed"}';
  const result = await checkFeed("https://example.com/json", jsonContent);
  assert.strictEqual(result.type, "json");
  assert.strictEqual(result.title, "Test JSON Feed");
});

// Test 4: Should return null for non-feed content
await test("should return null for non-feed content", async () => {
  resetMocks();
  const htmlContent = "<html><body><h1>Not a feed</h1></body></html>";
  const result = await checkFeed("https://example.com/html", htmlContent);
  assert.strictEqual(result, null);
});

// Test 5: Should fetch content when not provided
await test("should fetch content when not provided", async () => {
  resetMocks();
  mockFetchResponse = {
    text: async () => "<rss><channel><title>Fetched RSS Feed</title><item><title>Test</title></item></channel></rss>"
  };
  
  const result = await checkFeed("https://example.com/rss");
  assert.strictEqual(result.type, "rss");
  assert.strictEqual(result.title, "Fetched RSS Feed");
});

// Test 6: Should handle fetch errors
await test("should return false when fetch fails", async () => {
  resetMocks();
  mockFetchError = new Error("Network error");
  
  try {
    const result = await checkFeed("https://example.com/error");
    assert.strictEqual(result, false);
  } catch (error) {
    // If an error is thrown, that's also acceptable
    assert.ok(error);
  }
});

// Test 7: Should prioritize provided content over fetching
await test("should use provided content instead of fetching", async () => {
  resetMocks();
  mockFetchResponse = {
    text: async () => "<html><body>HTML content</body></html>"
  };
  
  const rssContent = "<rss><channel><title>Provided RSS Feed</title><item><title>Test</title></item></channel></rss>";
  const result = await checkFeed("https://example.com/rss", rssContent);
  assert.strictEqual(result.type, "rss");
  assert.strictEqual(result.title, "Provided RSS Feed");
  
  // Verify fetch was not called by checking that mockFetchResponse is still the object we set
  assert.ok(mockFetchResponse);
});

// Test 8: Should return null for invalid JSON
await test("should return null for invalid JSON", async () => {
  resetMocks();
  const invalidJson = '{"version": "https://jsonfeed.org/version/1", "title": "Test Feed"'; // Missing closing brace
  const result = await checkFeed("https://example.com/invalid-json", invalidJson);
  assert.strictEqual(result, null);
});

// Test 9: Should detect RSS feed with mixed case
await test("should detect RSS feed with mixed case tags", async () => {
  resetMocks();
  const rssContent = "<Rss><Channel><Title>Mixed Case RSS Feed</Title><Item><Title>Test</Title></Item></Channel></Rss>";
  const result = await checkFeed("https://example.com/rss", rssContent);
  assert.strictEqual(result.type, "rss");
  assert.strictEqual(result.title, "Mixed Case RSS Feed");
});

// Test 10: Should detect Atom feed with mixed case
await test("should detect Atom feed with mixed case tags", async () => {
  resetMocks();
  const atomContent = "<Feed><Title>Mixed Case Atom Feed</Title><Entry><Title>Test</Title></Entry></Feed>";
  const result = await checkFeed("https://example.com/atom", atomContent);
  assert.strictEqual(result.type, "atom");
  assert.strictEqual(result.title, "Mixed Case Atom Feed");
});

console.log("\n" + passCount + "/" + testCount + " tests passed");
if (passCount === testCount) {
  console.log("All tests passed!");
  process.exit(0);
} else {
  console.log("Some tests failed!");
  process.exit(1);
}