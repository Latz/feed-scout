import fetchWithTimeout from './fetchWithTimeout.js';
import checkFeed from './checkFeed.js';
import { parseHTML } from 'linkedom';
import validateUrl from 'isurl-module';
import tldts from 'tldts';

class ConcurrentFetcher {
	/**
	 * Creates a new ConcurrentFetcher instance
	 * @param {number} maxConcurrent - Maximum number of concurrent requests (default: 5)
	 * @param {number} timeout - Timeout in milliseconds for each request (default: 5000)
	 */
	constructor(maxConcurrent = 5, timeout = 5000) {
		this.maxConcurrent = maxConcurrent;
		this.timeout = timeout;
		this.active = 0;
		this.queue = [];
	}

	/**
	 * Fetches a URL with concurrency control
	 * @param {string} url - The URL to fetch
	 * @returns {Promise<string|null>} A promise that resolves to the content string or null if fetch failed
	 */
	async fetch(url) {
		if (this.active >= this.maxConcurrent) {
			await new Promise(resolve => this.queue.push(resolve));
		}

		this.active++;

		try {
			const response = await fetchWithTimeout(url, this.timeout);
			if (!response) {
				return null;
			}
			return await response.text();
		} finally {
			this.active--;
			if (this.queue.length > 0) {
				this.queue.shift()();
			}
		}
	}
}

/**
 * Processes a single URL by fetching its content and checking for feeds and links
 * @param {string} url - The URL to process
 * @param {string} baseUrl - The base URL for relative link resolution
 * @param {string} siteDomain - The domain of the site being crawled
 * @param {ConcurrentFetcher} fetcher - The concurrent fetcher instance
 * @param {object} instance - The FeedScout instance for emitting events
 * @returns {Promise<object>} A promise that resolves to an object containing links and feeds found
 */
async function processSingleUrl(url, baseUrl, siteDomain, fetcher, instance) {
	try {
		const content = await fetcher.fetch(url);
		if (!content) {
			return { links: new Set(), feeds: [] };
		}
		const { document } = parseHTML(content);
		document.documentURI = url;

		const results = {
			links: new Set(),
			feeds: [],
		};

		const anchors = document.querySelectorAll('a');
		const linkPromises = Array.from(anchors)
			.map(anchor => {
				try {
					const link = new URL(anchor.href, baseUrl);
					if (!isValidLink(link.href, siteDomain, url)) {
						return null;
					}
					return link.href;
				} catch (error) {
					// Emit error event with the specified pattern when an error occurs
					instance.emit('error', { module: 'concurrentFetcher', error: `Error processing link: ${error.message}` });
					return null;
				}
			})
			.filter(Boolean);

		// Process unique links in parallel batches
		const uniqueLinks = [...new Set(linkPromises)];
		const feedChecks = await Promise.allSettled(
			uniqueLinks.map(async link => {
				try {
					const feedResult = await checkFeed(link);
					if (feedResult) {
						return { link, feedType: feedResult.type, title: feedResult.title };
					}
					results.links.add(link);
					return null;
				} catch (error) {
					// Emit error event with the specified pattern when an error occurs
					instance.emit('error', { module: 'concurrentFetcher', error: `Error checking feed: ${error.message}` });
					return null;
				}
			})
		);

		// Process successful feed checks
		feedChecks.forEach(result => {
			if (result.status === 'fulfilled' && result.value) {
				results.feeds.push(result.value);
			}
		});

		return results;
	} catch (error) {
		// Emit error event with the specified pattern when an error occurs
		instance.emit('error', { module: 'concurrentFetcher', error: `Error processing ${url}: ${error.message}` });
		return { links: new Set(), feeds: [] };
	}
}

/**
 * Retrieves all links from a list of URLs at a given depth
 * @param {Array<string>} urls - The URLs to process
 * @param {string} siteDomain - The domain of the site being crawled
 * @param {number} currentDepth - The current depth of the crawling process
 * @param {object} instance - The FeedScout instance for emitting events
 * @param {object} options - Options for the crawling process (optional)
 * @returns {Promise<object>} A promise that resolves to an object containing links and feeds found
 */
async function getAllLinks(urls, siteDomain, currentDepth, instance, options = {}) {
	const fetcher = new ConcurrentFetcher(options.maxConcurrent || 5, options.timeout || 5000);

	console.log(`Depth ${currentDepth}: Processing ${urls.length} URLs`);

	const results = await Promise.allSettled(urls.map(url => processSingleUrl(url, url, siteDomain, fetcher, instance)));

	const allLinks = new Set();
	const allFeeds = [];

	results.forEach(result => {
		if (result.status === 'fulfilled') {
			const { links, feeds } = result.value;
			links.forEach(link => allLinks.add(link));
			allFeeds.push(...feeds);
		}
	});

	if (allFeeds.length > 0) {
		console.log(`Found ${allFeeds.length} feeds at depth ${currentDepth}`);
	}

	return {
		links: Array.from(allLinks),
		feeds: allFeeds,
	};
}

/**
 * Performs a deep search by crawling the website and checking for feeds
 * @param {string} url - The starting URL to crawl
 * @param {object} options - Options for the crawling process (optional)
 * @param {object} instance - The FeedScout instance for emitting events
 * @returns {Promise<Array>} A promise that resolves to an array of found feeds
 */
export default async function deepSearch(url, options = {}, instance) {
	const maxDepth = options.depth || 3;
	const siteDomain = getMainDomain(url);
	const allFeeds = new Set();

	let currentDepth = 0;
	let currentUrls = [url];

	while (currentDepth < maxDepth && currentUrls.length > 0) {
		const { links, feeds } = await getAllLinks(currentUrls, siteDomain, currentDepth, instance, options);

		feeds.forEach(feed => allFeeds.add(JSON.stringify(feed)));
		currentUrls = links;

		if (options.maxUrls && currentUrls.length > 0) {
			currentUrls = currentUrls.slice(0, options.maxUrls);
		}

		currentDepth++;
	}

	let feeds = Array.from(allFeeds).map(feed => JSON.parse(feed));
	console.log('🚀 ~ deepSearch ~ feeds:', feeds);
	return feeds;
}

function isValidLink(href, siteDomain, currentUrl) {
	return (
		validateUrl.isUrl(href) && tldts.parse(href).domain === siteDomain && href !== currentUrl && !excludedFile(href)
	);
}

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
		'epub',
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

function getMainDomain(url) {
	return tldts.getDomain(url);
}
