/**
 * @fileoverview metaLinks - Feed discovery through HTML meta link elements
 *
 * This module searches for RSS, Atom, and JSON feeds by analyzing <link> elements
 * in the HTML head section. It looks for specific rel and type attributes that
 * indicate feed URLs and validates them before returning results.
 *
 * @module metaLinks
 * @version 1.0.0
 * @author latz
 * @since 1.0.0
 */

// Helper function to clean titles by removing excessive whitespace and newlines
/**
 * Cleans titles by removing excessive whitespace and newlines
 * @param {string} title - The title to clean
 * @returns {string} The cleaned title
 */
function cleanTitle(title) {
	if (!title) return title;
	// Remove leading/trailing whitespace and collapse multiple whitespace characters
	return title.replace(/\s+/g, ' ').trim();
}

// Import the checkFeed function to verify if links are actually feeds
import checkFeed from './checkFeed.js';

/**
 * Processes a link element to check if it's a feed and adds it to the feeds array.
 * @param {HTMLLinkElement} link - The link element to process.
 * @param {object} instance - The FeedScout instance.
 * @param {Array<object>} feeds - The array of found feeds.
 * @param {Set<string>} foundUrls - A set of URLs that have already been added.
 * @returns {Promise<boolean>} A promise that resolves to true if the maxFeeds limit is reached, false otherwise.
 * @private
 */
async function processLink(link, instance, feeds, foundUrls) {
	const maxFeeds = instance.options?.maxFeeds || 0;
	if (!link.href) return false;

	const fullHref = new URL(link.href, instance.site).href;
	if (foundUrls.has(fullHref)) return false;

	instance.emit('log', { module: 'metalinks' });

	try {
		const feedResult = await checkFeed(fullHref, '', instance);
		if (feedResult) {
			feeds.push({
				url: fullHref,
				title: cleanTitle(link.title),
				type: feedResult.type,
				feedTitle: feedResult.title,
			});
			foundUrls.add(fullHref);

			if (maxFeeds > 0 && feeds.length >= maxFeeds) {
				instance.emit('log', {
					module: 'metalinks',
					message: `Stopped due to reaching maximum feeds limit: ${feeds.length} feeds found (max ${maxFeeds} allowed).`,
				});
				return true; // maxFeeds reached
			}
		}
	} catch (error) {
		if (instance.options?.showErrors) {
			instance.emit('error', {
				module: 'metalinks',
				error: error.message,
				explanation:
					'An error occurred while trying to fetch and validate a feed URL found in a meta link tag. This could be due to network issues, server problems, or invalid feed content.',
				suggestion:
					'Check if the meta link URL is accessible and returns valid feed content. The search will continue with other meta links.',
			});
		}
	}

	return false; // maxFeeds not reached
}

/**
 * Searches for feeds using meta links in the page head section
 * Analyzes <link> elements with feed-related rel and type attributes
 * @param {object} instance - The FeedScout instance containing parsed HTML and options
 * @param {object} instance.document - Parsed HTML document from linkedom
 * @param {string} instance.site - Base site URL for resolving relative links
 * @param {object} instance.options - Configuration options including maxFeeds
 * @param {Function} instance.emit - Event emitter function for progress updates
 * @returns {Promise<Array<object>>} Array of found feed objects with url, title, and type properties
 * @throws {Error} When feed validation fails or network errors occur
 * @example
 * const feedScout = new FeedScout('https://example.com');
 * const feeds = await metaLinks(feedScout);
 * console.log(feeds); // [{ url: '...', title: '...', type: 'rss' }]
 */
export default async function metaLinks(instance) {
	instance.emit('start', { module: 'metalinks', niceName: 'Meta links' });
	const feeds = [];
	const foundUrls = new Set();

	// 1. Check for links with specific feed `type` attributes.
	const feedTypes = ['feed+json', 'rss+xml', 'atom+xml', 'xml', 'rdf+xml'];
	const typeSelectors = feedTypes.map(type => `link[type="application/${type}"]`).join(', ');

	for (const link of instance.document.querySelectorAll(typeSelectors)) {
		if (await processLink(link, instance, feeds, foundUrls)) return feeds;
	}

	// 2. Check for `rel="alternate"` links with feed-related `type` attributes.
	const alternateTypeSelectors =
		'link[rel="alternate"][type*="rss"], link[rel="alternate"][type*="xml"], link[rel="alternate"][type*="atom"], link[rel="alternate"][type*="json"]';
	for (const link of instance.document.querySelectorAll(alternateTypeSelectors)) {
		if (await processLink(link, instance, feeds, foundUrls)) return feeds;
	}

	// 3. Check for `rel="alternate"` links with `href` patterns that suggest a feed.
	for (const link of instance.document.querySelectorAll('link[rel="alternate"]')) {
		const feedPatterns = ['/rss', '/feed', '/atom', '.rss', '.atom', '.xml', '.json'];
		const isLikelyFeed = link.href && feedPatterns.some(pattern => link.href.toLowerCase().includes(pattern));

		if (isLikelyFeed) {
			if (await processLink(link, instance, feeds, foundUrls)) return feeds;
		}
	}

	instance.emit('end', { module: 'metalinks', feeds });
	return feeds;
}
