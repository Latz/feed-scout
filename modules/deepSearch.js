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
// -------------------------------------------------------------------------------

class Crawler extends EventEmitter {
	constructor(startUrl, maxDepth = 3, concurrency = 5, maxLinks = 1000) {
		super();
		const absoluteStartUrl = new URL(startUrl);
		this.startUrl = absoluteStartUrl.href;
		this.maxDepth = maxDepth;
		this.concurrency = concurrency;
		this.maxLinks = maxLinks; // Maximum number of links to process
		this.mainDomain = tldts.getDomain(this.startUrl);
		this.queue = queue(this.crawlPage.bind(this), this.concurrency);
		this.visitedUrls = new Set();
		this.timeout = 5000; // Default timeout value

		this.feeds = [];

		this.queue.error((err, task) => {
			// Emit error event with the specified pattern when an error occurs
			this.emit('error', { module: 'deepSearch', error: `Async error: ${err}` });
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
			const isValid =
				tldts.getDomain(url) == tldts.getDomain(this.startUrl) &&
				!excludedFile(url);
			return isValid;
		} catch (error) {
			// Emit error event with the specified pattern when an error occurs
			this.emit('error', { module: 'deepSearch', error: `Invalid URL: ${url}` });
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
			// If we've reached the limit, don't process this page
			return;
		}

		if (!this.isValidUrl(url)) return;
		this.visitedUrls.add(url);
		console.log(`[${depth}] ${url} ${this.visitedUrls.size}`);
		const response = await fetchWithTimeout(url, this.timeout); // Uses configurable timeout
		const html = await response.text();
		const { document } = parseHTML(html);
		let links = document.querySelectorAll('a');

		for (let link of links) {
			let absoluteUrl = new URL(link.href, this.startUrl).href;
			// Skip if we've already visited this URL
			if (this.visitedUrls.has(absoluteUrl)) continue;
			
			// Check if we've reached the maximum number of links to process
			if (this.visitedUrls.size >= this.maxLinks) {
				// If we've reached the limit, stop adding new links to the queue
				break;
			}
			
			try {
				// Check if the link itself is a feed
				const feedResult = await checkFeed(absoluteUrl);
				if (feedResult) {
					// Check if we already found this feed to avoid duplicates
					const alreadyFound = this.feeds.some(feed => feed.url === absoluteUrl);
					if (!alreadyFound) {
						this.feeds.push({ 
							url: absoluteUrl, 
							type: feedResult.type,
							title: feedResult.title
						});
						console.log('Found new feed:', { 
							url: absoluteUrl, 
							type: feedResult.type,
							title: feedResult.title
						});
					}
				}
			} catch (error) {
				// Emit error event with the specified pattern when an error occurs
				this.emit('error', { module: 'deepSearch', error: error.message });
			}
			// Then add the link to the queue for further crawling
			this.queue.push({ url: absoluteUrl, depth: depth + 1 });
		}
	}
} // class Crawler
export default async function deepSearch(url, options = {}) {
	const crawler = new Crawler(url, options.depth || 3, 5, options.maxLinks || 1000);
	crawler.timeout = (options.timeout || 5) * 1000; // Convert seconds to milliseconds
	crawler.start();
	// Create a promise that resolves when the queue is drained
	await new Promise((resolve) => {
		crawler.queue.drain(() => {
			resolve();
		});
	});
	console.log('🚀 ~ deepSearch ~ feeds:', crawler.feeds);
	return crawler.feeds;
}
