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
	const allowedDomains = [
		'feedburner.com',
		'feeds.feedburner.com',
		'feedproxy.google.com',
		'feeds2.feedburner.com',
		// Add more feed hosting services as needed
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
async function handleMetaRefreshRedirect(instance) {
	const content = instance.document.querySelector('meta[http-equiv="refresh"]')?.getAttribute('content');
	if (content && content.toLowerCase().includes('url=')) {
		// Extract redirect URL from content attribute
		// Handle various formats: url=http://example.com, url="http://example.com", url='http://example.com'
		const urlMatch = content.match(/url=(?:["']?)([^"';,\s]+)(?:["']?)/i);
		if (urlMatch && urlMatch[1]) {
			const redirectUrl = urlMatch[1].trim();

			// Prevent empty URLs
			if (!redirectUrl) {
				instance.emit('error', {
					module: 'anchors',
					error: 'Meta refresh redirect URL is empty',
				});
				return;
			}

			const resolvedRedirectUrl = parseUrlSafely(redirectUrl, instance.site);
			if (!resolvedRedirectUrl) {
				instance.emit('error', {
					module: 'anchors',
					error: `Invalid meta refresh redirect URL: ${redirectUrl}`,
				});
				return;
			}

			// Prevent redirect to the same URL (infinite loop protection)
			if (resolvedRedirectUrl.href === instance.site) {
				instance.emit('error', {
					module: 'anchors',
					error: `Meta refresh redirect would create infinite loop: ${resolvedRedirectUrl.href}`,
				});
				return;
			}

			// Update the instance with the new URL and re-initialize
			instance.site = resolvedRedirectUrl.href;

			// Fetch the redirected page content
			const { default: fetchWithTimeout } = await import('./fetchWithTimeout.js');
			const { parseHTML } = await import('linkedom');

			try {
				const response = await fetchWithTimeout(resolvedRedirectUrl.href);
				if (response) {
					const newContent = await response.text();
					const { document } = parseHTML(newContent);
					instance.document = document;
				}
			} catch (error) {
				instance.emit('error', {
					module: 'anchors',
					error: `Failed to follow meta refresh redirect to ${resolvedRedirectUrl.href}: ${error.message}`,
				});
				// Continue with original document if redirect fails
			}
		}
	}
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
			instance.emit('error', { module: 'anchors', error: `Invalid relative URL: ${anchor.href}` });
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

	instance.emit('log', {
		module: 'anchors',
		anchor: urlToCheck,
	});

	try {
		const feedResult = await checkFeed(urlToCheck);
		if (feedResult) {
			feedUrls.push({
				href: urlToCheck,
				title: anchor.textContent?.trim() || null,
				type: feedResult.type,
				feedTitle: feedResult.title,
			});
		}
	} catch (error) {
		instance.emit('error', {
			module: 'anchors',
			error: `Error checking feed at ${urlToCheck}: ${error.message}`,
		});
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

	// Emit the count of anchors that will actually be processed
	instance.emit('log', {
		module: 'anchors',
		totalCount: totalCount,
		filteredCount: filteredAnchors.length, // Number of anchors that passed the domain filter
	});

	for (const anchor of filteredAnchors) {
		if (maxFeeds > 0 && context.feedUrls.length >= maxFeeds) {
			instance.emit('log', {
				module: 'anchors',
				message: `Stopped due to reaching maximum feeds limit: ${context.feedUrls.length} feeds found (max ${maxFeeds} allowed).`,
			});
			break;
		}
		await processAnchor(anchor, context);
	}

	return context.feedUrls;
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
