// Function to remove CDATA tags from text

// https://www.totaltypescript.com/how-to-create-an-npm-package

function removeCDATA(text) {
	const cdataRegex = /<!\[CDATA\[(.*?)\]\]>/g;
	return text.replace(cdataRegex, '$1');
}

// Function to clean titles by removing excessive whitespace and newlines
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
	// only fetch content if it's not provided by the caller
	if (!content) {
		const response = await fetch(url);
		if (!response) {
			throw new Error(`Failed to fetch ${url}`);
		}
		content = await response.text();
	}

	// Rss feeds contain <item> elements, Atom feeds contain <entry> elements.
	const result = checkRss(content) || checkAtom(content) || checkJson(content) || null;
	return result;
}

// Helper function to extract title from RSS content
function extractRssTitle(content) {
	// Extract title from RSS feed (channel title, not item title)
	const channelRegex = /<channel>([\s\S]*?)<\/channel>/i;
	const channelMatch = content.match(channelRegex);
	if (channelMatch) {
		const channelContent = channelMatch[1];
		const titleRegex = /<title>([\s\S]*?)<\/title>/i;
		const titleMatch = channelContent.match(titleRegex);
		const title = titleMatch ? cleanTitle(removeCDATA(titleMatch[1])) : null;
		return title;
	}
	// Fallback to original method if channel parsing fails
	const titleRegex = /<title>([\s\S]*?)<\/title>/i;
	const match = content.match(titleRegex);
	const title = match ? cleanTitle(removeCDATA(match[1])) : null;
	return title;
}

function checkRss(content) {
	// First check for RSS version declaration (any version)
	// This regex accounts for other attributes that might appear before the version
	const rssVersionRegex = /<rss[^>]*\s+version\s*=\s*["'][\d.]+["']/i;
	if (rssVersionRegex.test(content)) {
		const title = extractRssTitle(content);
		return { type: 'rss', title };
	}

	// If RSS version declaration is not found, fallback to checking for <item> elements
	const regex = /<item>/i;
	if (regex.test(content)) {
		const title = extractRssTitle(content);
		return { type: 'rss', title };
	}
	return null;
}

function checkAtom(content) {
	const regex = /<entry>/i;
	if (regex.test(content)) {
		// Extract title from Atom feed (feed title, not entry title)
		const titleRegex = /<title>([\s\S]*?)<\/title>/i;
		const match = content.match(titleRegex);
		const title = match ? cleanTitle(removeCDATA(match[1])) : null;
		return { type: 'atom', title };
	}
	return null;
}

function checkJson(content) {
	try {
		const json = JSON.parse(content);
		// Check if it's a JSON feed by looking for common properties
		if (json.version || json.items || json.feed_url) {
			// Extract title from JSON feed
			const title = json.title || json.name || null;
			return { type: 'json', title: cleanTitle(title) };
		}
		return null;
	} catch (e) {
		return null;
	}
}
