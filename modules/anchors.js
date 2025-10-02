// New anchors.js module that collects all links on the page and checks if they are feeds
// instead of using predefined patterns

import checkFeed from './checkFeed.js';

/**
 * Checks if a URL is a valid HTTP or HTTPS URL
 * @param {string} url - The URL to validate
 * @returns {boolean} True if the URL is valid and has HTTP or HTTPS protocol, false otherwise
 */
function isValidHttpUrl(url) {
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'http:' || parsed.protocol === 'https:';
	} catch (e) {
		// If it fails to parse, it might be a relative URL
		return false;
	}
}

/**
 * Checks if a URL is a relative path (not an absolute URL)
 * @param {string} url - The URL to check
 * @returns {boolean} True if the URL is a relative path, false otherwise
 */
function isRelativePath(url) {
	// Check if it's not an absolute URL and doesn't contain a scheme
	try {
		new URL(url);
		// If it parses successfully, it's an absolute URL
		return false;
	} catch (e) {
		// If it fails to parse, check if it contains a scheme
		return !url.includes('://');
	}
}

/**
 * Checks all links on the page and verifies if they are feeds
 * @param {object} instance - The FeedScout instance containing document and site info
 * @returns {Promise<Array>} A promise that resolves to an array of found feed URLs
 */
async function checkAnchors(instance) {
	const baseUrl = new URL(instance.site); // Keep full URL for proper relative URL resolution
	let feedUrls = [];
	const anchors = instance.document.querySelectorAll('a');
	const maxFeeds = instance.options?.maxFeeds || 0; // Maximum number of feeds to find (0 = no limit)

	for (const anchor of anchors) {
		// Check if we've reached the maximum number of feeds
		if (maxFeeds > 0 && feedUrls.length >= maxFeeds) {
			instance.emit('log', {
				module: 'anchors',
				message: `Stopped due to reaching maximum feeds limit: ${feedUrls.length} feeds found (max ${maxFeeds} allowed).`,
			});
			break;
		}

		// Skip anchors without href
		if (!anchor.href) continue;

		let urlToCheck;

		// Handle different URL types properly
		const isAbsoluteHttp = isValidHttpUrl(anchor.href);
		const isRelative = isRelativePath(anchor.href);

		if (isAbsoluteHttp) {
			// Absolute HTTP/HTTPS URL - use as-is
			urlToCheck = anchor.href;
		} else if (isRelative) {
			// Relative path - resolve against base URL
			try {
				urlToCheck = new URL(anchor.href, baseUrl).href;
			} catch (error) {
				// Skip invalid relative URLs
				instance.emit('error', { module: 'anchors', error: `Invalid relative URL: ${anchor.href}` });
				continue;
			}
		} else {
			// Skip non-HTTP schemes (mailto:, javascript:, ftp:, etc.)
			continue;
		}

		// Check if the URL is likely to be a feed by testing it
		try {
			const feedResult = await checkFeed(urlToCheck);
			if (feedResult) {
				feedUrls.push({
					href: urlToCheck,
					title: anchor.textContent?.trim() || null,
					type: feedResult.type,
					feedTitle: feedResult.title,
				});

				// Check if we've reached the maximum number of feeds after adding
				if (maxFeeds > 0 && feedUrls.length >= maxFeeds) {
					instance.emit('log', {
						module: 'anchors',
						message: `Stopped due to reaching maximum feeds limit: ${feedUrls.length} feeds found (max ${maxFeeds} allowed).`,
					});
					break;
				}
			}
		} catch (error) {
			// Emit error event when checking if the URL is a feed fails
			instance.emit('error', { module: 'anchors', error: error.message });
		}
	}

	return feedUrls;
}

/**
 * Main function to check all anchors for feeds and return only the feed URLs
 * @param {object} instance - The FeedScout instance containing document and site info
 * @returns {Promise<Array>} A promise that resolves to an array of found feed URLs
 */
export default async function checkAllAnchors(instance) {
	instance.emit('start', {
		module: 'checkAllAnchors',
		niceName: 'Check all anchors',
	});

	const feeds = await checkAnchors(instance);

	instance.emit('end', { module: 'checkAllAnchors', feeds });
	return feeds;
}
