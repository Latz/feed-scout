import fetchWithTimeout from './fetchWithTimeout.js';

// Function to remove CDATA tags from text
function removeCDATA(text) {
	const cdataRegex = new RegExp('<!\\[CDATA\\[(.*?)\\]\\]>', 'g');
	return text.replace(cdataRegex, '$1');
}

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
	const result = checkRss(content) || checkAtom(content) || checkJson(content) || none();
	return result;
}

function checkRss(content) {
	const regex = /<item>/i;
	if (regex.test(content)) {
		// Extract title from RSS feed (channel title, not item title)
		const channelRegex = /<channel>([\s\S]*?)<\/channel>/i;
		const channelMatch = content.match(channelRegex);
		if (channelMatch) {
			const channelContent = channelMatch[1];
			const titleRegex = /<title>([\s\S]*?)<\/title>/i;
			const titleMatch = channelContent.match(titleRegex);
			const title = titleMatch ? removeCDATA(titleMatch[1]) : null;
			return { type: 'rss', title };
		}
		// Fallback to original method if channel parsing fails
		const titleRegex = /<title>([\s\S]*?)<\/title>/i;
		const match = content.match(titleRegex);
		const title = match ? removeCDATA(match[1]) : null;
		return { type: 'rss', title };
	}
	return false;
}

function checkAtom(content) {
	const regex = /<entry>/i;
	if (regex.test(content)) {
		// Extract title from Atom feed (feed title, not entry title)
		const titleRegex = /<title>([\s\S]*?)<\/title>/i;
		const match = content.match(titleRegex);
		const title = match ? removeCDATA(match[1]) : null;
		return { type: 'atom', title };
	}
	return false;
}

function checkJson(content) {
	try {
		const json = JSON.parse(content);
		// Check if it's a JSON feed by looking for common properties
		if (json.version || json.items || json.feed_url) {
			// Extract title from JSON feed
			const title = json.title || json.name || null;
			return { type: 'json', title };
		}
		return false;
	} catch (e) {
		return false;
	}
}

function none() {
	return false;
}