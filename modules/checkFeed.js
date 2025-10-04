/**
 * @fileoverview checkFeed - Feed validation and type detection utility
 *
 * This module provides comprehensive feed validation for RSS, Atom, and JSON feeds.
 * It fetches feed URLs, analyzes their content structure, and extracts metadata
 * like titles and feed types. Uses pre-compiled regex patterns for optimal performance.
 *
 * @module checkFeed
 * @version 1.0.0
 * @author latz
 * @since 1.0.0
 */

import fetchWithTimeout from './fetchWithTimeout.js';

// Pre-compiled regex patterns for all feed detection and processing (performance optimization)
const FEED_PATTERNS = {
	// CDATA processing
	CDATA: /<!\[CDATA\[(.*?)\]\]>/g,

	// RSS patterns
	RSS: {
		VERSION: /<rss[^>]*\s+version\s*=\s*["'][\d.]+["'][^>]*>/i,
		CHANNEL: /<channel[^>]*>/i,
		ITEM: /<item[^>]*>/i,
		DESCRIPTION: /<description[^>]*>/i,
		CHANNEL_END: /<\/channel>/i,
		CHANNEL_CONTENT: /<channel>([\s\S]*?)<\/channel>/i,
		TITLE: /<title>([\s\S]*?)<\/title>/i,
	},

	// Atom patterns
	ATOM: {
		FEED_START: /<feed(?:\s+[^>]*)?>/i,
		NAMESPACE_XMLNS: /<feed[^>]*xmlns[^>]*atom/i,
		NAMESPACE_XMLNS_ATOM: /<feed[^>]*xmlns:atom/i,
		NAMESPACE_ATOM_PREFIX: /<feed[^>]*atom:/i,
		ENTRY: /<entry[^>]*>/i,
		TITLE_TAG: /<title[^>]*>/i,
		TITLE_CONTENT: /<title>([\s\S]*?)<\/title>/i,
	},
};

/**
 * Removes CDATA tags from text content
 * @param {string} text - The text to remove CDATA tags from
 * @returns {string} The text with CDATA tags removed
 */
function removeCDATA(text) {
	return text.replace(FEED_PATTERNS.CDATA, '$1');
}

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

/**
 * Validates if a URL is a feed (RSS, Atom, or JSON) by analyzing its content structure
 * Fetches content if not provided and uses pre-compiled regex patterns for efficient parsing
 * @param {string} url - The URL to check (must be a valid HTTP/HTTPS URL)
 * @param {string} [content=''] - The content to analyze (optional, will fetch if not provided)
 * @returns {Promise<object|null>} Feed object with type and title properties, or null if not a valid feed
 * @throws {Error} When network errors occur during content fetching
 * @example
 * // Check a URL by fetching its content
 * const result = await checkFeed('https://example.com/feed.xml');
 * console.log(result); // { type: 'rss', title: 'Example Blog' }
 *
 * // Check pre-fetched content
 * const content = '<rss version="2.0">...</rss>';
 * const result = await checkFeed('https://example.com/feed.xml', content);
 * console.log(result); // { type: 'rss', title: 'Example Blog' }
 *
 * // Returns null for non-feed content
 * const result = await checkFeed('https://example.com/not-a-feed');
 * console.log(result); // null
 */
export default async function checkFeed(url, content = '') {
	// Check if URL pattern indicates this is likely an oEmbed endpoint
	if (url.includes('/wp-json/oembed/') || url.includes('/oembed')) {
		// WordPress oEmbed endpoints are not feeds
		return null;
	}

	// only fetch content if it's not provided by the caller
	if (!content) {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
		}
		content = await response.text();
	}

	// Check for RSS, Atom, or JSON feeds
	const result = checkRss(content) || checkAtom(content) || checkJson(content) || null;
	return result;
}

/**
 * Extracts title from RSS content
 * @param {string} content - The RSS content to extract the title from
 * @returns {string|null} The extracted and cleaned title, or null if not found
 */
function extractRssTitle(content) {
	// Extract title from RSS feed (channel title, not item title)
	const channelMatch = FEED_PATTERNS.RSS.CHANNEL_CONTENT.exec(content);
	if (channelMatch) {
		const channelContent = channelMatch[1];
		const titleMatch = FEED_PATTERNS.RSS.TITLE.exec(channelContent);
		const title = titleMatch ? cleanTitle(removeCDATA(titleMatch[1])) : null;
		return title;
	}
	// Fallback to original method if channel parsing fails
	const match = FEED_PATTERNS.RSS.TITLE.exec(content);
	const title = match ? cleanTitle(removeCDATA(match[1])) : null;
	return title;
}

/**
 * Checks if content is an RSS feed
 * @param {string} content - The content to check for RSS feed elements
 * @returns {object|null} Object with type 'rss' and title if RSS feed, null otherwise
 */
function checkRss(content) {
	// Check for RSS root element with version attribute
	// RSS feeds must start with an <rss> tag with a version attribute
	if (FEED_PATTERNS.RSS.VERSION.test(content)) {
		// Check if it also contains required RSS elements like <channel> and <item>
		const hasChannel = FEED_PATTERNS.RSS.CHANNEL.test(content);
		const hasItem = FEED_PATTERNS.RSS.ITEM.test(content);

		// Additional check: RSS feeds should also have specific elements like description
		const hasDescription = FEED_PATTERNS.RSS.DESCRIPTION.test(content);

		if (hasChannel && hasDescription && (hasItem || FEED_PATTERNS.RSS.CHANNEL_END.test(content))) {
			const title = extractRssTitle(content);
			return { type: 'rss', title };
		}
	}
	return null;
}

/**
 * Checks if content is an Atom feed
 * @param {string} content - The content to check for Atom feed elements
 * @returns {object|null} Object with type 'atom' and title if Atom feed, null otherwise
 */
function checkAtom(content) {
	// Check for Atom feed root element with appropriate namespace
	const hasAtomNamespace =
		FEED_PATTERNS.ATOM.NAMESPACE_XMLNS.test(content) ||
		FEED_PATTERNS.ATOM.NAMESPACE_XMLNS_ATOM.test(content) ||
		FEED_PATTERNS.ATOM.NAMESPACE_ATOM_PREFIX.test(content);

	if (FEED_PATTERNS.ATOM.FEED_START.test(content) && hasAtomNamespace) {
		// For Atom feeds, having <entry> elements is required to be a valid feed
		const hasEntry = FEED_PATTERNS.ATOM.ENTRY.test(content);

		// Additional check: Atom feeds should also have a feed-level title
		const hasTitle = FEED_PATTERNS.ATOM.TITLE_TAG.test(content);

		if (hasEntry && hasTitle) {
			// Extract title from Atom feed (feed title, not entry title)
			const match = FEED_PATTERNS.ATOM.TITLE_CONTENT.exec(content);
			const title = match ? cleanTitle(removeCDATA(match[1])) : null;
			return { type: 'atom', title };
		}
	}
	return null;
}

/**
 * Checks if content is a JSON feed
 * @param {string} content - The content to check for JSON feed properties
 * @returns {object|null} Object with type 'json' and title if JSON feed, null otherwise
 */
function checkJson(content) {
	try {
		const json = JSON.parse(content);

		// Check if this looks like an oEmbed response - these are NOT feeds
		// oEmbed responses typically have type: 'rich', 'video', 'photo', 'link', etc.
		// They also have version: '1.0' or '2.0' for oEmbed, not 'jsonfeed'
		if (
			json.type &&
			['rich', 'video', 'photo', 'link'].includes(json.type) &&
			(json.version === '1.0' || json.version === '2.0')
		) {
			// This is almost certainly an oEmbed response, not a feed
			return null;
		}

		// Additional check for other oEmbed indicators
		if (json.type && json.version && json.html) {
			// Another common pattern for oEmbed responses
			return null;
		}

		// Check if it's a JSON feed by looking for common properties
		// JSON feeds should have the version property with 'jsonfeed' in the value
		// or both 'items' array and other feed properties
		if (
			(json.version && typeof json.version === 'string' && json.version.includes('jsonfeed')) ||
			(json.items && Array.isArray(json.items)) ||
			json.feed_url
		) {
			// Extract title from JSON feed
			const title = json.title || json.name || null;
			return { type: 'json', title: cleanTitle(title) };
		}
		return null;
	} catch (e) {
		return null;
	}
}
