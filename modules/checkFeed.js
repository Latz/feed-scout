/**
 * Removes CDATA tags from text content
 * @param {string} text - The text to remove CDATA tags from
 * @returns {string} The text with CDATA tags removed
 */
function removeCDATA(text) {
	const cdataRegex = new RegExp('<!\\[CDATA\\[(.*?)\\]\\]>', 'g');
	return text.replace(cdataRegex, '$1');
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
 * Checks if a URL is a feed (RSS, Atom, or JSON) by examining its content
 * @param {string} url - The URL to check
 * @param {string} content - The content to check (optional, will fetch if not provided)
 * @returns {Promise<object|null>} An object containing the feed type and title, or null if not a feed
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
	const channelRegex = new RegExp('<channel>([\\s\\S]*?)<\\/channel>', 'i');
	const channelMatch = channelRegex.exec(content);
	if (channelMatch) {
		const channelContent = channelMatch[1];
		const titleRegex = new RegExp('<title>([\\s\\S]*?)<\\/title>', 'i');
		const titleMatch = titleRegex.exec(channelContent);
		const title = titleMatch ? cleanTitle(removeCDATA(titleMatch[1])) : null;
		return title;
	}
	// Fallback to original method if channel parsing fails
	const titleRegex = new RegExp('<title>([\\s\\S]*?)<\\/title>', 'i');
	const match = titleRegex.exec(content);
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
	const rssVersionRegex = new RegExp('<rss[^>]*\\s+version\\s*=\\s*["\'][\\d.]+["\'][^>]*>', 'i');
	if (rssVersionRegex.test(content)) {
		// Ensure the root element is indeed <rss> and verify structure
		const rssStartRegex = new RegExp('<rss[^>]*\\s+version\\s*=\\s*["\'][\\d.]+["\'][^>]*>', 'i');
		if (rssStartRegex.test(content)) {
			// Check if it also contains required RSS elements like <channel> and <item>
			const hasChannel = new RegExp('<channel[^>]*>', 'i').test(content);
			const hasItem = new RegExp('<item[^>]*>', 'i').test(content);
			
			// Additional check: RSS feeds should also have specific elements like description
			const hasDescription = new RegExp('<description[^>]*>', 'i').test(content);
			
			if (hasChannel && hasDescription && (hasItem || new RegExp('<\\/channel>', 'i').test(content))) {
				const title = extractRssTitle(content);
				return { type: 'rss', title };
			}
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
	const feedStartRegex = new RegExp('<feed(?:\\s+[^>]*)?>', 'i');
	const hasAtomNamespace = new RegExp('<feed[^>]*[^>]*xmlns[^=]*[^>]*atom', 'i').test(content) ||
							new RegExp('<feed[^>]*[^>]*xmlns:atom', 'i').test(content) ||
							new RegExp('<feed[^>]*[^>]*atom:', 'i').test(content);
	
	if (feedStartRegex.test(content) && hasAtomNamespace) {
		// For Atom feeds, having <entry> elements is required to be a valid feed
		const hasEntry = new RegExp('<entry[^>]*>', 'i').test(content);
		
		// Additional check: Atom feeds should also have a feed-level title
		const hasTitle = new RegExp('<title[^>]*>', 'i').test(content);
		
		if (hasEntry && hasTitle) {
			// Extract title from Atom feed (feed title, not entry title)
			const titleRegex = new RegExp('<title>([\\s\\S]*?)<\\/title>', 'i');
			const match = titleRegex.exec(content);
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
		if (json.type && ['rich', 'video', 'photo', 'link'].includes(json.type) && 
			(json.version === '1.0' || json.version === '2.0')) {
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
		if ((json.version && typeof json.version === 'string' && json.version.includes('jsonfeed')) || 
			(json.items && Array.isArray(json.items)) || 
			json.feed_url) {
			// Extract title from JSON feed
			const title = json.title || json.name || null;
			return { type: 'json', title: cleanTitle(title) };
		}
		return null;
	} catch (e) {
		return null;
	}
}