import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import tldts from 'tldts';
import EventEmitter from '../modules/eventEmitter.js';

// Replicate internal functions and classes from deepSearch.js for testing

function excludedFile(url) {
	const excludedExtensions = [
		'.zip', '.rar', '.7z', '.tar.gz', '.tar.bz2', '.tar.xz', '.tar', '.gz', '.bz2', '.xz', '.tgz',
		'.epub', '.mobi', '.azw', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
		'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.svg', '.mp3', '.mp4', '.avi', '.mov',
		'.wmv', '.mpg', '.mpeg', '.flv', '.mkv', '.webm', '.ogg', '.ogv', '.ogx'
	];
	return excludedExtensions.some(extension => url.endsWith(extension));
}

class MockCrawler extends EventEmitter {
	constructor(startUrl, options = {}) {
		super();
		const {
			maxDepth = 3,
			maxLinks = 1000,
			maxErrors = 5
		} = options;
		
		this.startUrl = new URL(startUrl).href;
		this.maxDepth = maxDepth;
		this.maxLinks = maxLinks;
		this.maxErrors = maxErrors;
		this.mainDomain = tldts.getDomain(this.startUrl);
		this.visitedUrls = new Set();
		this.errorCount = 0;
		this.maxLinksReachedMessageEmitted = false;
	}

	isValidUrl(url) {
		try {
			const sameDomain = tldts.getDomain(url) === this.mainDomain;
			const notExcludedFile = !excludedFile(url);
			return sameDomain && notExcludedFile;
		} catch (error) {
			return false;
		}
	}

	shouldCrawl(url, depth) {
		if (depth > this.maxDepth) return false;
		if (this.visitedUrls.has(url)) return false;

		if (this.visitedUrls.size >= this.maxLinks) {
			if (!this.maxLinksReachedMessageEmitted) {
				this.emit('log', {
					module: 'deepSearch',
					message: `Max links limit of ${this.maxLinks} reached. Stopping deep search.`,
				});
				this.maxLinksReachedMessageEmitted = true;
			}
			return false;
		}

		return this.isValidUrl(url);
	}

	handleFetchError(url, depth, error) {
		if (this.errorCount < this.maxErrors) {
			this.errorCount++;
			if (this.errorCount >= this.maxErrors) {
				return true; // Stop crawling
			}
		}
		return false; // Continue crawling
	}
}

describe('Deep Search Module', () => {
	let crawler;

	beforeEach(() => {
		crawler = new MockCrawler('https://example.com');
	});

	describe('excludedFile() helper', () => {
		it('should return true for excluded file extensions', () => {
			assert.strictEqual(excludedFile('https://example.com/archive.zip'), true);
			assert.strictEqual(excludedFile('https://example.com/image.jpg'), true);
			assert.strictEqual(excludedFile('https://example.com/document.pdf'), true);
		});

		it('should return false for allowed file extensions', () => {
			assert.strictEqual(excludedFile('https://example.com/page.html'), false);
			assert.strictEqual(excludedFile('https://example.com/feed.xml'), false);
			assert.strictEqual(excludedFile('https://example.com/'), false);
		});
	});

	describe('isValidUrl() method', () => {
		it('should return true for valid, same-domain URLs', () => {
			assert.strictEqual(crawler.isValidUrl('https://example.com/page'), true);
			assert.strictEqual(crawler.isValidUrl('https://sub.example.com/page'), true); // Both should be valid as tldts matches registrable domain
		});

		it('should return false for external domains', () => {
			assert.strictEqual(crawler.isValidUrl('https://other.com/page'), false);
		});

		it('should return false for excluded file types', () => {
			assert.strictEqual(crawler.isValidUrl('https://example.com/image.jpg'), false);
		});

		it('should return false for invalid URLs', () => {
			assert.strictEqual(crawler.isValidUrl('not-a-url'), false);
		});
	});

	describe('shouldCrawl() method', () => {
		it('should return false if max depth is exceeded', () => {
			crawler.maxDepth = 2;
			assert.strictEqual(crawler.shouldCrawl('https://example.com/page', 3), false);
		});

		it('should return false if URL has been visited', () => {
			const url = 'https://example.com/page';
			crawler.visitedUrls.add(url);
			assert.strictEqual(crawler.shouldCrawl(url, 1), false);
		});

		it('should return false if max links limit is reached', () => {
			crawler.maxLinks = 1;
			crawler.visitedUrls.add('https://example.com/another-page');
			assert.strictEqual(crawler.shouldCrawl('https://example.com/page', 1), false);
		});

		it('should emit a log message when max links limit is reached', () => {
			let logEmitted = false;
			crawler.on('log', data => {
				if (data.message && data.message.includes('Max links limit')) {
					logEmitted = true;
				}
			});
			crawler.maxLinks = 0;
			crawler.shouldCrawl('https://example.com/page', 1);
			assert.strictEqual(logEmitted, true);
		});

		it('should return true for a valid, unvisited URL within limits', () => {
			assert.strictEqual(crawler.shouldCrawl('https://example.com/page', 1), true);
		});
	});

	describe('handleFetchError() method', () => {
		it('should increment error count on each call', () => {
			crawler.handleFetchError('url', 1, 'error');
			assert.strictEqual(crawler.errorCount, 1);
			crawler.handleFetchError('url', 1, 'error');
			assert.strictEqual(crawler.errorCount, 2);
		});

		it('should return true to stop crawling when maxErrors is reached', () => {
			crawler.maxErrors = 2;
			crawler.handleFetchError('url1', 1, 'error1'); // count = 1
			const shouldStop = crawler.handleFetchError('url2', 1, 'error2'); // count = 2
			assert.strictEqual(crawler.errorCount, 2);
			assert.strictEqual(shouldStop, true);
		});

		it('should return false if maxErrors is not reached', () => {
			crawler.maxErrors = 3;
			crawler.handleFetchError('url1', 1, 'error1');
			const shouldStop = crawler.handleFetchError('url2', 1, 'error2');
			assert.strictEqual(shouldStop, false);
		});
	});
});
