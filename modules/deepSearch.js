// Beispiele: https://www.abendzeitung-muenchen.de/die-az/service/die-rss-feeds-der-abendzeitung-muenchen-art-667276

import checkFeed from './checkFeed.js';
import { parseHTML } from 'linkedom';
import tldts from 'tldts';
import EventEmitter from './eventEmitter.js';
import { queue } from 'async';
import fetchWithTimeout from './fetchWithTimeout.js';
// -------------------------------------------------------------------------------
/**
 * Checks if a URL points to a file with an excluded extension.
 * Used to avoid downloading large binary files during link crawling.
 *
 * @param {string} url - The URL to check
 * @returns {boolean} True if the URL ends with an excluded extension, false otherwise
 */
function excludedFile(url) {
	const excludedExtensions = [
		'.zip',
		'.rar',
		'.7z',
		'.tar.gz',
		'.tar.bz2',
		'.tar.xz',
		'.tar',
		'.gz',
		'.bz2',
		'.xz',
		'.tgz',
		'.epub',
		'.mobi',
		'.azw',
		'.pdf',
		'.doc',
		'.docx',
		'.xls',
		'.xlsx',
		'.ppt',
		'.pptx',
		'.jpg',
		'.jpeg',
		'.png',
		'.gif',
		'.bmp',
		'.tiff',
		'.svg',
		'.mp3',
		'.mp4',
		'.avi',
		'.mov',
		'.wmv',
		'.mpg',
		'.mpeg',
		'.flv',
		'.mkv',
		'.webm',
		'.ogg',
		'.ogv',
		'.ogx',
	];
	return excludedExtensions.some(extension => url.endsWith(extension));
}
// -------------------------------------------------------------------------------

class Crawler extends EventEmitter {
	constructor(
		startUrl,
		options = {}
	) {
		super();
		const {
			maxDepth = 3,
			concurrency = 5,
			maxLinks = 1000,
			checkForeignFeeds = false,
			maxErrors = 5,
			maxFeeds = 0,
			instance = null
		} = options;
		
		const absoluteStartUrl = new URL(startUrl);
		this.startUrl = absoluteStartUrl.href;
		this.maxDepth = maxDepth;
		this.concurrency = concurrency;
		this.maxLinks = maxLinks; // Maximum number of links to process
		this.mainDomain = tldts.getDomain(this.startUrl);
		this.checkForeignFeeds = checkForeignFeeds; // Whether to check external domains for feeds
		this.maxErrors = maxErrors; // Maximum number of errors before stopping
		this.maxFeeds = maxFeeds; // Maximum number of feeds to find before stopping
		this.errorCount = 0; // Current error count
		this.instance = instance; // Store the FeedScout instance
		// Initialize async queue with concurrency control
		// The queue processes crawlPage tasks with limited concurrency to prevent overwhelming the target server
		// bind(this) ensures 'this' context is preserved when crawlPage is called by the queue
		this.queue = queue(this.crawlPage.bind(this), this.concurrency);
		this.visitedUrls = new Set(); // Track visited URLs to prevent infinite loops
		this.timeout = 5000; // Default timeout value for HTTP requests
		this.maxLinksReachedMessageEmitted = false; // Flag to track if message was emitted

		this.feeds = []; // Array to store discovered feeds

		// Error handling strategy: Implement circuit breaker pattern
		// Stop crawling after maxErrors to prevent endless error loops on problematic sites
		this.queue.error(err => {
			// Only process if we haven't reached the error limit yet
			if (this.errorCount < this.maxErrors) {
				// Increment error count
				this.errorCount++;

				// Emit error event with the specified pattern when an error occurs
				this.emit('error', {
					module: 'deepSearch',
					error: `Async error: ${err}`,
					explanation:
						'An error occurred in the async queue while processing a crawling task. This could be due to network issues, invalid URLs, or server problems.',
					suggestion:
						'Check network connectivity and ensure the target website is accessible. The crawler will continue with other URLs.',
				});

				// Circuit breaker: Kill queue when error threshold is reached
				// This prevents the crawler from continuing to make requests to a problematic site
				if (this.errorCount >= this.maxErrors) {
					// Kill the queue to stop processing immediately
					this.queue.kill();
					// Emit log message about stopping due to errors
					this.emit('log', {
						module: 'deepSearch',
						message: `Stopped due to ${this.errorCount} errors (max ${this.maxErrors} allowed).`,
					});
				}
			}
		});
	} // constructor

	/**
	 * Starts the crawling process
	 * @returns {Array} Array of found feeds
	 */
	start() {
		this.queue.push({ url: this.startUrl, depth: 0 });
		this.emit('start', { module: 'deepSearch', niceName: 'Deep search' });
		this.queue.drain(() => {
			this.emit('end', { module: 'deepSearch', feeds: this.feeds, visitedUrls: this.visitedUrls.size });
		});
		return this.feeds;
	}

	// ----------------------------------------------------------------------------------
	// Check if url is
	// * valid
	// * from same domain
	// * not visited before
	/**
	 * Checks if a URL is valid (same domain, not excluded file type)
	 * @param {string} url - The URL to validate
	 * @returns {boolean} True if the URL is valid, false otherwise
	 */
	isValidUrl(url) {
		try {
			// Domain comparison using tldts.getDomain() to extract the registrable domain
			// Example: both "blog.example.com" and "www.example.com" return "example.com"
			// This allows crawling subdomains of the same site while blocking external domains
			const sameDomain = tldts.getDomain(url) == tldts.getDomain(this.startUrl);

			// File type filtering prevents downloading large binary files (images, videos, archives)
			// See excludedFile() function for the complete list of blocked extensions
			const notExcludedFile = !excludedFile(url);

			return sameDomain && notExcludedFile;
		} catch (error) {
			// URL parsing can fail for malformed URLs - handle gracefully
			// Only process if we haven't reached the error limit yet
			if (this.errorCount < this.maxErrors) {
				// Increment error count
				this.errorCount++;

				// Emit error event with the specified pattern when an error occurs
				this.emit('error', {
					module: 'deepSearch',
					error: `Invalid URL: ${url}`,
					explanation:
						'A URL encountered during crawling could not be parsed or validated. This may be due to malformed URL syntax or unsupported URL schemes.',
					suggestion:
						'This is usually caused by broken links on the website. The crawler will skip this URL and continue with others.',
				});

				// Check if we've reached the maximum error count
				if (this.errorCount >= this.maxErrors) {
					// Kill the queue to stop processing immediately
					this.queue.kill();
					// Emit log message about stopping due to errors
					this.emit('log', {
						module: 'deepSearch',
						message: `Stopped due to ${this.errorCount} errors (max ${this.maxErrors} allowed).`,
					});
				}
			}
			// Return false for any URL that can't be validated
			return false;
		}
	}

	// ----------------------------------------------------------------------------------
	/**
	 * Handles pre-crawl checks and validations for a given URL.
	 * @param {string} url - The URL to check.
	 * @param {number} depth - The current crawl depth.
	 * @returns {boolean} True if the crawl should continue, false otherwise.
	 * @private
	 */
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

	/**
	 * Handles fetch errors and increments the error counter.
	 * @param {string} url - The URL that failed to fetch.
	 * @param {number} depth - The crawl depth at which the error occurred.
	 * @param {string} error - The error message.
	 * @returns {boolean} True if the crawl should stop, false otherwise.
	 * @private
	 */
	handleFetchError(url, depth, error) {
		if (this.errorCount < this.maxErrors) {
			this.errorCount++;
			this.emit('log', { module: 'deepSearch', url, depth, error });

			if (this.errorCount >= this.maxErrors) {
				this.queue.kill();
				this.emit('log', {
					module: 'deepSearch',
					message: `Stopped due to ${this.errorCount} errors (max ${this.maxErrors} allowed).`,
				});
				return true; // Stop crawling
			}
		}
		return false; // Continue crawling
	}

	/**
	 * Processes a single link found on a page, checking if it's a feed.
	 * @param {string} url - The absolute URL of the link to process.
	 * @param {number} depth - The current crawl depth.
	 * @returns {Promise<boolean>} True if the crawl should stop, false otherwise.
	 * @private
	 */
	async processLink(url, depth) {
		if (this.visitedUrls.has(url)) return false;

		if (this.visitedUrls.size >= this.maxLinks) {
			if (!this.maxLinksReachedMessageEmitted) {
				this.emit('log', {
					module: 'deepSearch',
					message: `Max links limit of ${this.maxLinks} reached. Stopping deep search.`,
				});
				this.maxLinksReachedMessageEmitted = true;
			}
			return true; // Stop
		}

		const shouldCheckFeed = this.isValidUrl(url) || this.checkForeignFeeds;
		if (!shouldCheckFeed) return false;

		try {
			const feedResult = await checkFeed(url, '', this.instance);
			if (feedResult && !this.feeds.some(feed => feed.url === url)) {
				this.feeds.push({ url, type: feedResult.type, title: feedResult.title });
				this.emit('log', {
					module: 'deepSearch',
					url,
					depth: depth + 1,
					feedCheck: { isFeed: true, type: feedResult.type },
				});

				if (this.maxFeeds > 0 && this.feeds.length >= this.maxFeeds) {
					this.queue.kill();
					this.emit('log', {
						module: 'deepSearch',
						message: `Stopped due to reaching maximum feeds limit: ${this.feeds.length} feeds found (max ${this.maxFeeds} allowed).`,
					});
					return true; // Stop
				}
			} else if (!feedResult) {
				this.emit('log', { module: 'deepSearch', url, depth: depth + 1, feedCheck: { isFeed: false } });
			}
		} catch (error) {
			return this.handleFetchError(url, depth + 1, `Error checking feed: ${error.message}`);
		}

		if (depth + 1 <= this.maxDepth && this.isValidUrl(url)) {
			this.queue.push({ url, depth: depth + 1 });
		}
		return false;
	}

	/**
	 * Crawls a single page, extracting links and checking for feeds
	 * @param {object} task - The task object containing the URL and depth
	 * @param {string} task.url - The URL to crawl
	 * @param {number} task.depth - The current depth of crawling
	 * @returns {Promise<void>} A promise that resolves when the page has been crawled
	 */
	async crawlPage(task) {
		let { url, depth } = task;

		if (!this.shouldCrawl(url, depth)) return;

		this.visitedUrls.add(url);

		const response = await fetchWithTimeout(url, this.timeout);
		if (!response) {
			this.handleFetchError(url, depth, 'Failed to fetch URL - timeout or network error');
			return;
		}
		if (!response.ok) {
			this.handleFetchError(url, depth, `HTTP ${response.status} ${response.statusText}`);
			return;
		}

		const html = await response.text();
		const { document } = parseHTML(html);

		for (const link of document.querySelectorAll('a')) {
			const absoluteUrl = new URL(link.href, this.startUrl).href;
			const shouldStop = await this.processLink(absoluteUrl, depth);
			if (shouldStop) break;
		}
	}
} // class Crawler
export default async function deepSearch(url, options = {}, instance = null) {
	const crawler = new Crawler(url, {
		maxDepth: options.depth || 3,
		concurrency: 5,
		maxLinks: options.maxLinks || 1000,
		checkForeignFeeds: !!options.checkForeignFeeds, // Whether to check foreign domains for feeds
		maxErrors: options.maxErrors || 5, // Maximum number of errors before stopping
		maxFeeds: options.maxFeeds || 0, // Maximum number of feeds before stopping (0 = no limit)
		instance // Pass the FeedScout instance to the crawler
	});
	crawler.timeout = (options.timeout || 5) * 1000; // Convert seconds to milliseconds

	// If we have an instance, forward crawler events to the instance
	if (instance) {
		crawler.on('start', data => instance.emit('start', data));
		crawler.on('log', data => instance.emit('log', data));
		crawler.on('error', data => instance.emit('error', data));
		crawler.on('end', data => instance.emit('end', data));
	}

	crawler.start();
	// Create a promise that resolves when the queue is drained
	await new Promise(resolve => {
		crawler.queue.drain(() => {
			resolve();
		});
	});
	return crawler.feeds;
}
