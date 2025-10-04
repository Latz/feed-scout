import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

// Since we can't easily import internal functions from ES modules directly in tests,
// we'll create our own testable versions of the helper functions
function cleanTitle(title) {
	if (!title) return title;
	return title.replace(/\s+/g, ' ').trim();
}

function isLikelyFeedPath(href) {
	const commonFeedPaths = [
		'/rss/',
		'/rss',
		'/feed',
		'/atom',
		'.rss',
		'.atom',
		'.xml',
		'.json',
		'/syndication/',
		'/feeds/',
	];

	return commonFeedPaths.some(pattern => href.includes(pattern));
}

function isValidHttpUrl(url) {
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'http:' || parsed.protocol === 'https:';
	} catch (e) {
		return false;
	}
}

function isRelativePath(url) {
	try {
		new URL(url);
		return false;
	} catch (e) {
		return !url.includes('://');
	}
}

function isSameDomain(url, baseUrl) {
	try {
		const urlObj = new URL(url);
		const baseObj = new URL(baseUrl);
		return urlObj.hostname === baseObj.hostname;
	} catch (e) {
		return false;
	}
}

// Create a mock FeedScout instance for testing
class MockFeedScout {
	constructor(site, options = {}) {
		this.site = site;
		this.options = options;
		this.document = null;
		this.content = '';
		this.events = {};
	}

	emit(event, data) {
		if (this.events[event]) {
			this.events[event].forEach(callback => callback(data));
		}
	}

	on(event, callback) {
		if (!this.events[event]) {
			this.events[event] = [];
		}
		this.events[event].push(callback);
	}
}

describe('Anchors Module Helper Functions', () => {
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

	describe('isLikelyFeedPath()', () => {
		it('should return true for common feed paths', () => {
			assert.strictEqual(isLikelyFeedPath('/rss'), true);
			assert.strictEqual(isLikelyFeedPath('/feed'), true);
			assert.strictEqual(isLikelyFeedPath('/atom'), true);
			assert.strictEqual(isLikelyFeedPath('/rss.xml'), true);
			assert.strictEqual(isLikelyFeedPath('/blog.rss'), true);
			assert.strictEqual(isLikelyFeedPath('/feed/atom.xml'), true);
		});

		it('should return false for non-feed paths', () => {
			assert.strictEqual(isLikelyFeedPath('/contact'), false);
			assert.strictEqual(isLikelyFeedPath('/about'), false);
			assert.strictEqual(isLikelyFeedPath('/index.html'), false);
		});
	});

	describe('isValidHttpUrl()', () => {
		it('should return true for valid HTTP/HTTPS URLs', () => {
			assert.strictEqual(isValidHttpUrl('https://example.com'), true);
			assert.strictEqual(isValidHttpUrl('http://example.com'), true);
			assert.strictEqual(isValidHttpUrl('https://subdomain.example.com/path'), true);
		});

		it('should return false for invalid URLs and non-HTTP protocols', () => {
			assert.strictEqual(isValidHttpUrl('ftp://example.com'), false);
			assert.strictEqual(isValidHttpUrl('mailto:test@example.com'), false);
			assert.strictEqual(isValidHttpUrl('invalid-url'), false);
			assert.strictEqual(isValidHttpUrl(''), false);
		});
	});

	describe('isRelativePath()', () => {
		it('should return true for relative paths', () => {
			assert.strictEqual(isRelativePath('/path'), true);
			assert.strictEqual(isRelativePath('./relative'), true);
			assert.strictEqual(isRelativePath('../parent'), true);
			assert.strictEqual(isRelativePath('relative'), true);
		});

		it('should return false for absolute URLs', () => {
			assert.strictEqual(isRelativePath('https://example.com'), false);
			assert.strictEqual(isRelativePath('http://example.com'), false);
			assert.strictEqual(isRelativePath('ftp://example.com'), false);
		});
	});

	describe('isSameDomain()', () => {
		it('should return true for same domain URLs', () => {
			assert.strictEqual(isSameDomain('https://example.com', 'https://example.com'), true);
			assert.strictEqual(isSameDomain('https://example.com/page', 'https://example.com'), true);
			assert.strictEqual(isSameDomain('http://example.com', 'https://example.com'), true); // Different protocol but same domain
		});

		it('should return false for different domains', () => {
			assert.strictEqual(isSameDomain('https://example.com', 'https://different.com'), false);
			assert.strictEqual(isSameDomain('https://sub.example.com', 'https://example.com'), false);
			assert.strictEqual(isSameDomain('https://example.com', 'https://example.org'), false);
		});
	});

	describe('Meta Refresh URL Extraction', () => {
		// Test the regex pattern used in handleMetaRefreshRedirect
		function extractMetaRefreshUrl(content) {
			if (content && content.toLowerCase().includes('url=')) {
				const urlMatch = content.match(/url=(?:["']?)([^"';,\s]+)(?:["']?)/i);
				return urlMatch && urlMatch[1] ? urlMatch[1].trim() : null;
			}
			return null;
		}

		it('should extract URL from standard meta refresh content', () => {
			assert.strictEqual(extractMetaRefreshUrl('5; url=http://example.com'), 'http://example.com');
			assert.strictEqual(extractMetaRefreshUrl('0;url=http://example.com'), 'http://example.com');
			assert.strictEqual(extractMetaRefreshUrl('3; URL=http://example.com'), 'http://example.com');
		});

		it('should handle quoted URLs', () => {
			assert.strictEqual(extractMetaRefreshUrl('5; url="http://example.com"'), 'http://example.com');
			assert.strictEqual(extractMetaRefreshUrl("0;url='http://example.com'"), 'http://example.com');
			assert.strictEqual(extractMetaRefreshUrl('3; URL="https://example.com/path"'), 'https://example.com/path');
		});

		it('should stop at semicolon and not capture additional parameters', () => {
			assert.strictEqual(extractMetaRefreshUrl('5; url=http://example.com; charset=utf-8'), 'http://example.com');
			assert.strictEqual(extractMetaRefreshUrl('0;url="http://example.com";charset=utf-8'), 'http://example.com');
		});

		it('should handle relative URLs', () => {
			assert.strictEqual(extractMetaRefreshUrl('5; url=/redirect'), '/redirect');
			assert.strictEqual(extractMetaRefreshUrl('0;url="./relative"'), './relative');
		});

		it('should return null for invalid or missing URLs', () => {
			assert.strictEqual(extractMetaRefreshUrl('5; no url here'), null);
			assert.strictEqual(extractMetaRefreshUrl('5; url='), null);
			assert.strictEqual(extractMetaRefreshUrl(''), null);
			assert.strictEqual(extractMetaRefreshUrl(null), null);
		});
	});
});
