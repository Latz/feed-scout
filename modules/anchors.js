/**
 * @fileoverview anchors - Feed discovery through anchor link analysis
 *
 * This module analyzes anchor elements (<a> tags) on web pages to discover potential
 * feed URLs. It includes utilities for URL parsing, domain filtering, meta refresh
 * handling, and comprehensive anchor processing with memory optimization.
 *
 * @module anchors
 * @version 1.0.0
 * @author latz
 * @since 1.0.0
 */

// New anchors.js module that collects all links on the page and checks if they are feeds
// instead of using predefined patterns

import checkFeed from './checkFeed.js';

/**
 * Safely parses a URL and returns the parsed URL object or null if invalid
 * @param {string} url - The URL to parse
 * @param {string|URL} [base] - The base URL for resolving relative URLs (optional)
 * @returns {URL|null} The parsed URL object or null if parsing fails
 */
function parseUrlSafely(url, base) {
	try {
		return new URL(url, base);
	} catch (e) {
		return null;
	}
}

/**
 * Checks if a URL is a valid HTTP or HTTPS URL
 * @param {string} url - The URL to validate
 * @returns {boolean} True if the URL is valid and has HTTP or HTTPS protocol, false otherwise
 */
function isValidHttpUrl(url) {
	const parsed = parseUrlSafely(url);
	if (!parsed) {
		// If it fails to parse, it might be a relative URL
		return false;
	}
	return parsed.protocol === 'http:' || parsed.protocol === 'https:';
}

/**
 * Checks if a URL is a relative path (not an absolute URL)
 * @param {string} url - The URL to check
 * @returns {boolean} True if the URL is a relative path, false otherwise
 */
function isRelativePath(url) {
	// Check if it's not an absolute URL and doesn't contain a scheme
	const parsed = parseUrlSafely(url);
	if (parsed) {
		// If it parses successfully, it's an absolute URL
		return false;
	}
	// If it fails to parse, check if it contains a scheme
	return !url.includes('://');
}

/**
 * Checks if a URL is on the same domain as the base URL or is an allowed external domain (like feed hosting services)
 * @param {string} url - The URL to check
 * @param {URL} baseUrl - The base URL for comparison
 * @returns {boolean} True if the URL is on the same domain or is an allowed external domain, false otherwise
 */
function isAllowedDomain(url, baseUrl) {
	const parsedUrl = parseUrlSafely(url);
	if (!parsedUrl) {
		// If URL parsing fails, it's likely a relative URL which should be same-domain by definition
		return true;
	}

	// Check if it's the same domain
	if (parsedUrl.hostname === baseUrl.hostname) {
		return true;
	}

	// Allow common feed hosting services as exceptions
	// These services host feeds for other websites and should be considered valid external sources
	const allowedDomains = [
		// Google FeedBurner (most common feed hosting service)
		'feedburner.com',
		'feeds.feedburner.com',
		'feedproxy.google.com',
		'feeds2.feedburner.com',
	];
	return (
		allowedDomains.includes(parsedUrl.hostname) ||
		allowedDomains.some(domain => parsedUrl.hostname.endsWith('.' + domain))
	);
}

/**
 * Handles meta refresh redirects if present in the document.
 * It will fetch the content of the new URL and update the instance's document.
 * @param {object} instance - The FeedScout instance containing document and site info.
 */
function handleMetaRefreshRedirect(instance) {
	if (instance.options.followMetaRefresh) {
		if (instance.document && typeof instance.document.querySelector === 'function') {
			const content = instance.document.querySelector('meta[http-equiv="refresh"]')?.getAttribute('content');
			if (content) {
				const match = content.match(/url=(.*)/i);
				if (match && match[1]) {
					const redirectUrl = new URL(match[1], instance.site).href;
					instance.emit('log', {
						module: 'anchors',
						message: `Following meta refresh redirect to ${redirectUrl}`,
					});
					// Recursively call checkAnchors on the new URL
					return checkAnchors({ ...instance, site: redirectUrl });
				}
			}
		}
	}
	return null;
}

/**
 * Resolves the URL from an anchor element.
 * @param {HTMLAnchorElement} anchor - The anchor element.
 * @param {URL} baseUrl - The base URL for resolving relative paths.
 * @param {object} instance - The FeedScout instance for emitting errors.
 * @returns {string|null} The resolved URL or null if invalid.
 */
function getUrlFromAnchor(anchor, baseUrl, instance) {
	if (!anchor.href) {
		return null;
	}

	if (isValidHttpUrl(anchor.href)) {
		return anchor.href;
	}

	if (isRelativePath(anchor.href)) {
		const resolvedUrl = parseUrlSafely(anchor.href, baseUrl);
		if (!resolvedUrl) {
			instance.emit('error', {
				module: 'anchors',
				error: `Invalid relative URL: ${anchor.href}`,
				explanation:
					'A relative URL found in an anchor tag could not be resolved against the base URL. This may be due to malformed relative path syntax.',
				suggestion:
					'Check the anchor href attribute for proper relative path format (e.g., "./feed.xml", "../rss.xml", or "/feed").',
			});
			return null;
		}
		return resolvedUrl.href;
	}

	// Skips non-HTTP schemes (mailto:, javascript:, ftp:, etc.)
	return null;
}

/**
 * Checks a single anchor to see if it's a feed and adds it to the list if so.
 * @param {HTMLAnchorElement} anchor - The anchor element to check.
 * @param {object} context - The context containing instance, baseUrl, and feedUrls array.
 * @returns {Promise<void>}
 */
async function processAnchor(anchor, context) {
	const { instance, baseUrl, feedUrls } = context;
	const urlToCheck = getUrlFromAnchor(anchor, baseUrl, instance);

	if (!urlToCheck) {
		return;
	}

	try {
		const feedResult = await checkFeed(urlToCheck, '', instance);
		if (feedResult) {
			feedUrls.push({
				href: urlToCheck,
				title: anchor.textContent?.trim() || null,
				type: feedResult.type,
				feedTitle: feedResult.title,
			});
		}
	} catch (error) {
		if (instance.options?.showErrors) {
			instance.emit('error', {
				module: 'anchors',
				error: `Error checking feed at ${urlToCheck}: ${error.message}`,
				explanation:
					'An error occurred while trying to fetch and validate a potential feed URL found in an anchor tag. This could be due to network timeouts, server errors, or invalid feed content.',
				suggestion:
					'Check if the URL is accessible and returns valid feed content. Network connectivity issues or server problems may cause this error.',
			});
		}
	}
}

/**
 * Checks all links on the page and verifies if they are feeds
 * @param {object} instance - The FeedScout instance containing document and site info
 * @returns {Promise<Array>} A promise that resolves to an array of found feed URLs
 */
async function checkAnchors(instance) {
	await handleMetaRefreshRedirect(instance);

	const baseUrl = new URL(instance.site);

	// Get all anchors and filter for same-host or allowed domains in a single operation
	const allAnchors = instance.document.querySelectorAll('a');
	const filteredAnchors = [];
	let totalCount = 0;

	// Process anchors one by one to avoid creating intermediate arrays
	for (const anchor of allAnchors) {
		totalCount++;
		const urlToCheck = getUrlFromAnchor(anchor, baseUrl, instance);
		if (urlToCheck && isAllowedDomain(urlToCheck, baseUrl)) {
			filteredAnchors.push(anchor);
		}
	}

	const maxFeeds = instance.options?.maxFeeds || 0;
	const context = {
		instance,
		baseUrl,
		feedUrls: [],
	};

	let count = 1;
	for (const anchor of filteredAnchors) {
		if (maxFeeds > 0 && context.feedUrls.length >= maxFeeds) {
			instance.emit('log', {
				module: 'anchors',
				message: `Stopped due to reaching maximum feeds limit: ${context.feedUrls.length} feeds found (max ${maxFeeds} allowed).`,
			});
			break;
		}
		instance.emit('log', { module: 'anchors', totalCount: count++, totalEndpoints: filteredAnchors.length });
		await processAnchor(anchor, context);
	}

	return context.feedUrls;
}

/**
 * Main function to analyze all anchor elements on a page for potential feed URLs
 * Processes anchors with memory optimization, domain filtering, and comprehensive validation
 * @param {object} instance - The FeedScout instance containing parsed HTML and configuration
 * @param {object} instance.document - Parsed HTML document from linkedom
 * @param {string} instance.site - Base site URL for resolving relative links and domain filtering
 * @param {object} instance.options - Configuration options including maxFeeds and domain restrictions
 * @param {Function} instance.emit - Event emitter function for progress updates
 * @returns {Promise<Array<object>>} Array of validated feed objects with url, title, and type properties
 * @throws {Error} When feed validation fails or network errors occur
 * @example
 * const feedScout = new FeedScout('https://example.com');
 * const feeds = await checkAllAnchors(feedScout);
 * console.log(feeds); // [{ url: '...', title: '...', type: 'rss' }]
 */
export default async function checkAllAnchors(instance) {
	instance.emit('start', {
		module: 'anchors',
		niceName: 'Check all anchors',
	});

	const feeds = await checkAnchors(instance);

	instance.emit('end', { module: 'anchors', feeds });
	return feeds;
}
