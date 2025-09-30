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
	constructor(startUrl, maxDepth = 3, concurrency = 5, maxLinks = 1000, checkForeignFeeds = false, maxErrors = 5, maxFeeds = 0) {
		super();
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
		this.queue = queue(this.crawlPage.bind(this), this.concurrency);
		this.visitedUrls = new Set();
		this.timeout = 5000; // Default timeout value
		this.maxLinksReachedMessageEmitted = false; // Flag to track if message was emitted

		this.feeds = [];

		this.queue.error((err, task) => {
			// Only process if we haven't reached the error limit yet
			if (this.errorCount < this.maxErrors) {
				// Increment error count
				this.errorCount++;
				
				// Emit error event with the specified pattern when an error occurs
				this.emit('error', { module: 'deepSearch', error: `Async error: ${err}` });
				
				// Check if we've reached the maximum error count
				if (this.errorCount >= this.maxErrors) {
					// Kill the queue to stop processing immediately
					this.queue.kill();
					// Emit log message about stopping due to errors
					this.emit('log', {
						module: 'deepSearch',
						message: `Stopped due to ${this.errorCount} errors (max ${this.maxErrors} allowed).`
					});
				}
			}
		});
	} // constructor

	start() {
		this.queue.push({ url: this.startUrl, depth: 0 });
		this.emit('start', { module: 'deepSearch', niceName: 'Deep search' });
		this.queue.drain(() => {
			this.emit('end', { module: 'deepSearch', feeds: this.feeds, visitedUrls: this.visitedUrls.size });
		});
		console.log('this.feeds', this.feeds);
		return this.feeds;
	}

	// ----------------------------------------------------------------------------------
	// Check if url is
	// * valid
	// * from same domain
	// * not visited before
	isValidUrl(url) {
		try {
			const isValid = tldts.getDomain(url) == tldts.getDomain(this.startUrl) && !excludedFile(url);
			return isValid;
		} catch (error) {
			// Only process if we haven't reached the error limit yet
			if (this.errorCount < this.maxErrors) {
				// Increment error count
				this.errorCount++;
				
				// Emit error event with the specified pattern when an error occurs
				this.emit('error', { module: 'deepSearch', error: `Invalid URL: ${url}` });
				
				// Check if we've reached the maximum error count
				if (this.errorCount >= this.maxErrors) {
					// Kill the queue to stop processing immediately
					this.queue.kill();
					// Emit log message about stopping due to errors
					this.emit('log', {
						module: 'deepSearch',
						message: `Stopped due to ${this.errorCount} errors (max ${this.maxErrors} allowed).`
					});
				}
			}
			return false;
		}
	}

	// ----------------------------------------------------------------------------------
	async crawlPage(task) {
		let { url, depth } = task;
		// wait 0.5 seconds
		// await new Promise(resolve => setTimeout(resolve, 500));

		if (depth > this.maxDepth) return;
		if (this.visitedUrls.has(url)) return;

		// Check if we've reached the maximum number of links to process
		if (this.visitedUrls.size >= this.maxLinks) {
			// If we've reached the limit, emit a message (only once) and don't process this page
			if (!this.maxLinksReachedMessageEmitted) {
				this.emit('log', {
					module: 'deepSearch',
					message: `Max links limit of ${this.maxLinks} reached. Stopping deep search.`,
				});
				this.maxLinksReachedMessageEmitted = true;
			}
			return;
		}

		if (!this.isValidUrl(url)) return;
		this.visitedUrls.add(url);
		console.log(`[${depth}] ${url} ${this.visitedUrls.size}`);

		// Fetch the URL and handle errors properly
		const response = await fetchWithTimeout(url, this.timeout); // Uses configurable timeout

		// Check if response is null (fetch failed) or not ok
		if (!response) {
			// Only process if we haven't reached the error limit yet
			if (this.errorCount < this.maxErrors) {
				// Increment error count
				this.errorCount++;
				
				// Emit log with error information for failed fetch
				this.emit('log', {
					module: 'deepSearch',
					url: url,
					depth: depth,
					error: 'Failed to fetch URL - timeout or network error',
				});
				
				// Check if we've reached the maximum error count
				if (this.errorCount >= this.maxErrors) {
					// Kill the queue to stop processing immediately
					this.queue.kill();
					// Emit log message about stopping due to errors
					this.emit('log', {
						module: 'deepSearch',
						message: `Stopped due to ${this.errorCount} errors (max ${this.maxErrors} allowed).`
					});
				}
			}
			return;
		}

		if (!response.ok) {
			// Only process if we haven't reached the error limit yet
			if (this.errorCount < this.maxErrors) {
				// Increment error count
				this.errorCount++;
				
				// Emit log with error information for failed fetch
				this.emit('log', {
					module: 'deepSearch',
					url: url,
					depth: depth,
					error: `HTTP ${response.status} ${response.statusText}`,
				});
				
				// Check if we've reached the maximum error count
				if (this.errorCount >= this.maxErrors) {
					// Kill the queue to stop processing immediately
					this.queue.kill();
					// Emit log message about stopping due to errors
					this.emit('log', {
						module: 'deepSearch',
						message: `Stopped due to ${this.errorCount} errors (max ${this.maxErrors} allowed).`
					});
				}
			}
			return;
		}

		const html = await response.text();
		const { document } = parseHTML(html);
		let links = document.querySelectorAll('a');

		for (let link of links) {
			let absoluteUrl = new URL(link.href, this.startUrl).href;
			// Skip if we've already visited this URL
			if (this.visitedUrls.has(absoluteUrl)) continue;

			// Check if we've reached the maximum number of links to process
			if (this.visitedUrls.size >= this.maxLinks) {
				// If we've reached the limit, emit a message (only once) and stop adding new links to the queue
				if (!this.maxLinksReachedMessageEmitted) {
					this.emit('log', {
						module: 'deepSearch',
						message: `Max links limit of ${this.maxLinks} reached. Stopping deep search.`,
					});
					this.maxLinksReachedMessageEmitted = true;
				}
				break;
			}

			try {
				// Check if the link is on the same domain OR if we should check foreign feeds
				const shouldCheckFeed = this.isValidUrl(absoluteUrl) || this.checkForeignFeeds;
				
				if (shouldCheckFeed) {
					// Check if the link itself is a feed
					const feedResult = await checkFeed(absoluteUrl);
					if (feedResult) {
						// Check if we already found this feed to avoid duplicates
						const alreadyFound = this.feeds.some(feed => feed.url === absoluteUrl);
						if (!alreadyFound) {
							this.feeds.push({
								url: absoluteUrl,
								type: feedResult.type,
								title: feedResult.title,
							});
							console.log('Found new feed:', {
								url: absoluteUrl,
								type: feedResult.type,
								title: feedResult.title,
							});
							// Emit log for found feed
							this.emit('log', {
								module: 'deepSearch',
								url: absoluteUrl,
								depth: depth + 1,
								feedCheck: { isFeed: true, type: feedResult.type },
							});
							
							// Check if we've reached the maximum number of feeds
							if (this.maxFeeds > 0 && this.feeds.length >= this.maxFeeds) {
								// Kill the queue to stop processing immediately
								this.queue.kill();
								// Emit log message about stopping due to reaching max feeds
								this.emit('log', {
									module: 'deepSearch',
									message: `Stopped due to reaching maximum feeds limit: ${this.feeds.length} feeds found (max ${this.maxFeeds} allowed).`
								});
								// Break out of the loop to stop processing the current page
								break;
							}
						}
					} else {
						// Emit log for visited URL that is not a feed
						this.emit('log', {
							module: 'deepSearch',
							url: absoluteUrl,
							depth: depth + 1,
							feedCheck: { isFeed: false },
						});
					}
				} else {
					// Skip checking this URL for feeds since it's on a foreign domain and we're not configured to check them
					continue;
				}
			} catch (error) {
				// Only process if we haven't reached the error limit yet
				if (this.errorCount < this.maxErrors) {
					// Increment error count
					this.errorCount++;
					
					// Emit error event with the specified pattern when an error occurs
					this.emit('error', { module: 'deepSearch', error: `Error checking feed ${absoluteUrl}: ${error.message}` });
					// Also emit log with error information
					this.emit('log', {
						module: 'deepSearch',
						url: absoluteUrl,
						depth: depth + 1,
						error: `Error checking feed: ${error.message}`,
					});
					
					// Check if we've reached the maximum error count
					if (this.errorCount >= this.maxErrors) {
						// Kill the queue to stop processing immediately
						this.queue.kill();
						// Emit log message about stopping due to errors
						this.emit('log', {
							module: 'deepSearch',
							message: `Stopped due to ${this.errorCount} errors (max ${this.maxErrors} allowed).`
						});
						// Break out of the loop to stop processing the current page
						break;
					}
				} else {
					// If we've already reached the error limit, break out of the loop to stop processing the current page
					break;
				}
			}
			
			// Only add the link to the queue for further crawling if:
			// 1. It's within depth limits
			// 2. It's on the same domain as the start URL (to prevent following external links)
			if (depth + 1 <= this.maxDepth && this.isValidUrl(absoluteUrl)) {
				this.queue.push({ url: absoluteUrl, depth: depth + 1 });
			}
		}
	}
} // class Crawler
export default async function deepSearch(url, options = {}, instance = null) {
	const crawler = new Crawler(
		url, 
		options.depth || 3, 
		5, 
		options.maxLinks || 1000,
		!!options.checkForeignFeeds, // Whether to check foreign domains for feeds
		options.maxErrors || 5, // Maximum number of errors before stopping
		options.maxFeeds || 0 // Maximum number of feeds before stopping (0 = no limit)
	);
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
	console.log('🚀 ~ deepSearch ~ feeds:', crawler.feeds);
	return crawler.feeds;
}