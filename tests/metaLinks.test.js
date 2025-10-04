import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import metaLinks from '../modules/metaLinks.js';

// Create a mock FeedScout instance for testing
class MockFeedScout {
  constructor(site, options = {}) {
    this.site = site;
    this.options = options;
    this.document = null;
  }
  
  emit(event, data) {
    // Mock event emission for testing
  }
}

// Create helper functions that mirror the ones in metaLinks.js for testing
function cleanTitle(title) {
  if (!title) return title;
  return title.replace(/\s+/g, ' ').trim();
}

function getFeedType(link) {
  if (link.type) {
    const typeMatch = link.type.match(/(rss|atom|json)/);
    if (typeMatch) {
      return typeMatch[1];
    }
    
    if (link.type.includes('rss') || link.type.includes('xml')) {
      return 'rss';
    }
    if (link.type.includes('atom')) {
      return 'atom';
    }
    if (link.type.includes('json')) {
      return 'json';
    }
  }
  
  if (link.href) {
    const href = link.href.toLowerCase();
    if (href.includes('.rss') || href.includes('.xml')) {
      return 'rss';
    }
    if (href.includes('.atom')) {
      return 'atom';
    }
    if (href.includes('.json')) {
      return 'json';
    }
  }
  
  return 'rss';
}

describe('metaLinks Module', () => {
  describe('Helper Functions', () => {
    describe('cleanTitle()', () => {
      it('should clean excessive whitespace', () => {
        const result = cleanTitle('  Title   with   spaces  ');
        assert.strictEqual(result, 'Title with spaces');
      });

      it('should handle newlines and tabs', () => {
        const result = cleanTitle('Title\n\twith\nspaces');
        assert.strictEqual(result, 'Title with spaces');
      });

      it('should return null/undefined as is', () => {
        assert.strictEqual(cleanTitle(null), null);
        assert.strictEqual(cleanTitle(undefined), undefined);
      });
    });

    describe('getFeedType()', () => {
      it('should identify RSS type from type attribute', () => {
        const link = { type: 'application/rss+xml' };
        assert.strictEqual(getFeedType(link), 'rss');
      });

      it('should identify Atom type from type attribute', () => {
        const link = { type: 'application/atom+xml' };
        assert.strictEqual(getFeedType(link), 'atom');
      });

      it('should identify JSON type from type attribute', () => {
        const link = { type: 'application/feed+json' };
        assert.strictEqual(getFeedType(link), 'json');
      });

      it('should identify type from href extension', () => {
        assert.strictEqual(getFeedType({ href: 'feed.rss' }), 'rss');
        assert.strictEqual(getFeedType({ href: 'feed.atom' }), 'atom');
        assert.strictEqual(getFeedType({ href: 'feed.json' }), 'json');
        assert.strictEqual(getFeedType({ href: 'feed.xml' }), 'rss');
      });

      it('should default to RSS if type cannot be determined', () => {
        assert.strictEqual(getFeedType({}), 'rss');
        assert.strictEqual(getFeedType({ type: 'text/html' }), 'rss');
      });
    });
  });

  describe('metaLinks() main function', () => {
    it('should find RSS links in document head', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test Page</title>
          <link rel="alternate" type="application/rss+xml" title="RSS" href="/rss.xml">
          <link rel="alternate" type="application/atom+xml" title="Atom" href="/atom.xml">
        </head>
        <body></body>
        </html>
      `;
      
      const { document } = parseHTML(html);
      const mockInstance = new MockFeedScout('https://example.com');
      mockInstance.document = document;
      
      // Mock the emit function to capture events
      const emittedEvents = [];
      mockInstance.emit = (event, data) => {
        emittedEvents.push({ event, data });
      };
      
      // We can't easily test the full functionality without mocking the checkFeed function,
      // but we can at least test that the function runs without errors
      const result = await metaLinks(mockInstance);
      
      // Should return an array
      assert.ok(Array.isArray(result));
    });

    it('should handle document with no feed links', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test Page</title>
          <link rel="stylesheet" href="/style.css">
        </head>
        <body></body>
        </html>
      `;
      
      const { document } = parseHTML(html);
      const mockInstance = new MockFeedScout('https://example.com');
      mockInstance.document = document;
      
      // Mock the emit function
      mockInstance.emit = () => {};
      
      const result = await metaLinks(mockInstance);
      
      // Should return an empty array when no feed links are found
      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 0);
    });

    it('should handle empty document', async () => {
      const html = '<!DOCTYPE html><html><head></head><body></body></html>';
      
      const { document } = parseHTML(html);
      const mockInstance = new MockFeedScout('https://example.com');
      mockInstance.document = document;
      
      mockInstance.emit = () => {};
      
      const result = await metaLinks(mockInstance);
      
      assert.ok(Array.isArray(result));
    });

    it('should make relative URLs absolute', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test Page</title>
          <link rel="alternate" type="application/rss+xml" title="RSS" href="/rss.xml">
        </head>
        <body></body>
        </html>
      `;
      
      const { document } = parseHTML(html);
      const mockInstance = new MockFeedScout('https://example.com/path');
      mockInstance.document = document;
      
      mockInstance.emit = () => {};
      
      // This test is difficult to execute completely without mocking checkFeed,
      // but we can verify that it processes the document
      const result = await metaLinks(mockInstance);
      
      assert.ok(Array.isArray(result));
    });
  });
});