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

// Pre-compiled regex patterns for all feed detection and processing
// Performance optimization: Compiling regex patterns once at module load time instead of
// creating new RegExp objects on every function call (eliminates 9+ regex compilations per checkFeed call)
const FEED_PATTERNS = {
	// CDATA processing - matches XML CDATA sections: <![CDATA[content]]>
	// Used to extract clean text content from feeds that wrap content in CDATA
	CDATA: /<!\[CDATA\[(.*?)\]\]>/g,

	// RSS feed detection patterns
	RSS: {
		// Matches RSS root element with version attribute: <rss version="2.0">
		// [^>]* matches any attributes before version, \s+ ensures whitespace before version
		VERSION: /<rss[^>]*\s+version\s*=\s*["'][\d.]+["'][^>]*>/i,

		// Matches RSS channel opening tag (required container for RSS content)
		CHANNEL: /<channel[^>]*>/i,

		// Matches RSS item opening tag (individual feed entries)
		ITEM: /<item[^>]*>/i,

		// Matches RSS description opening tag (content description)
		DESCRIPTION: /<description[^>]*>/i,

		// Matches RSS channel closing tag
		CHANNEL_END: /<\/channel>/i,

		// Captures entire channel content between opening and closing tags
		// [\s\S]*? uses non-greedy matching to capture everything including newlines
		CHANNEL_CONTENT: /<channel>([\s\S]*?)<\/channel>/i,

		// Captures title content between title tags (feed or item title)
		TITLE: /<title>([\s\S]*?)<\/title>/i,
	},

	// Atom feed detection patterns
	ATOM: {
		// Matches Atom feed opening tag with optional attributes: <feed ...>
		// (?:\s+[^>]*)? is a non-capturing group for optional attributes
		FEED_START: /<feed(?:\s+[^>]*)?>/i,

		// Matches Atom namespace declaration: xmlns="...atom..." or xmlns:atom="..."
		// These patterns ensure the feed uses the Atom XML namespace
		NAMESPACE_XMLNS: /<feed[^>]*xmlns[^>]*atom/i,
		NAMESPACE_XMLNS_ATOM: /<feed[^>]*xmlns:atom/i,
		NAMESPACE_ATOM_PREFIX: /<feed[^>]*atom:/i,

		// Matches Atom entry opening tag (individual feed entries)
		ENTRY: /<entry[^>]*>/i,

		// Matches Atom title opening tag
		TITLE_TAG: /<title[^>]*>/i,

		// Captures title content between title tags
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
export default async function checkFeed(url, content = '', instance) {
	// Check if URL pattern indicates this is likely an oEmbed endpoint
	if (url.includes('/wp-json/oembed/') || url.includes('/oembed')) {
		// WordPress oEmbed endpoints are not feeds
		return null;
	}

	// only fetch content if it's not provided by the caller
	if (!content) {
		const response = await fetchWithTimeout(url, instance.options.timeout * 1000);
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
	// Step 1: Check for RSS root element with version attribute
	// RSS feeds must start with an <rss> tag with a version attribute (RSS 0.91, 1.0, 2.0, etc.)
	if (FEED_PATTERNS.RSS.VERSION.test(content)) {
		// Step 2: Validate required RSS structure elements
		const hasChannel = FEED_PATTERNS.RSS.CHANNEL.test(content); // Container for feed metadata
		const hasItem = FEED_PATTERNS.RSS.ITEM.test(content); // Individual feed entries
		const hasDescription = FEED_PATTERNS.RSS.DESCRIPTION.test(content); // Content description

		// Step 3: Validate RSS structure - must have channel + description + (items OR proper channel closure)
		// The (hasItem || FEED_PATTERNS.RSS.CHANNEL_END.test(content)) check handles edge cases:
		// - Normal feeds: have <item> elements
		// - Empty feeds: have proper </channel> closure but no items yet
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
