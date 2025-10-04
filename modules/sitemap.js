/**
 * @fileoverview sitemap - Feed discovery through XML sitemap analysis
 *
 * This module searches for feeds by analyzing XML sitemaps. It fetches sitemap files,
 * parses their content, and identifies potential feed URLs from the listed pages.
 * Supports both standard sitemaps and sitemap index files.
 *
 * @module sitemap
 * @version 1.0.0
 * @author latz
 * @since 1.0.0
 */

import { parseHTML } from 'linkedom';
import checkFeed from './checkFeed.js';
import fetchWithTimeout from './fetchWithTimeout.js';

/**
 * Searches for feeds by analyzing XML sitemaps and their referenced URLs
 * Fetches sitemap.xml, parses URLs, and validates them as feeds
 * @param {object} instance - The FeedScout instance containing site URL and configuration
 * @param {string} instance.site - Base site URL to search for sitemaps
 * @param {object} instance.options - Configuration options including maxFeeds and timeout
 * @param {Function} instance.emit - Event emitter function for progress updates
 * @returns {Promise<Array<object>>} Array of found feed objects with url, title, and type properties
 * @throws {Error} When sitemap cannot be fetched or parsed
 * @example
 * const feedScout = new FeedScout('https://example.com');
 * const feeds = await sitemap(feedScout);
 * console.log(feeds); // [{ url: '...', title: '...', type: 'rss' }]
 */
export default async function sitemap(instance) {
	instance.emit('start', { module: 'sitemap', niceName: 'Sitemap' });

	const feeds = [];
	const sitemapUrl = new URL('sitemap.xml', instance.site).href;

	try {
		const response = await fetchWithTimeout(sitemapUrl);
		if (!response) {
			instance.emit('log', {
				module: 'sitemap',
				message: `Failed to fetch sitemap: ${sitemapUrl}`,
			});
			instance.emit('end', { module: 'sitemap', feeds });
			return feeds;
		}

		if (!response.ok) {
			instance.emit('log', { module: 'sitemap', message: `Failed to fetch sitemap: ${response.status}` });
			instance.emit('end', { module: 'sitemap', feeds });
			return feeds;
		}

		const content = await response.text();
		const { document } = parseHTML(content);

		// Find all loc elements in the sitemap
		const locElements = document.querySelectorAll('loc');

		// Check each URL in the sitemap for feeds
		for (const loc of locElements) {
			const url = loc.textContent.trim();

			try {
				// Skip non-http URLs
				if (!url.startsWith('http')) continue;

				// Check if this URL is a feed
				const feedType = await checkFeed(url, '');

				if (feedType) {
					feeds.push({
						url: url,
						type: feedType,
					});

					instance.emit('log', {
						module: 'sitemap',
						message: `Found feed: ${url} (${feedType})`,
					});
				}
			} catch (error) {
				// Emit error event with the specified pattern when an error occurs
				instance.emit('error', { module: 'sitemap', error: error.message });
			}
		}
	} catch (error) {
		// Emit error event with the specified pattern when an error occurs
		instance.emit('error', { module: 'sitemap', error: error.message });
	}

	instance.emit('end', { module: 'sitemap', feeds });
	return feeds;
}
