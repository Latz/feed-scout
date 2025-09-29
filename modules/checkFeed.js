// Function to remove CDATA tags from text
function removeCDATA(text) {
    const cdataRegex = /<!\[CDATA\[(.*?)\]\]>/g;
  return text.replace(cdataRegex, "$1");
}

// Function to clean titles by removing excessive whitespace and newlines
function cleanTitle(title) {
  if (!title) return title;
  // Remove leading/trailing whitespace and collapse multiple whitespace characters
  return title.replace(/\s+/g, ' ').trim();
}

export default async function checkFeed(url, content = "") {
  // only fetch content if it's not provided by the caller
  if (!content) {
    const response = await fetch(url);
    if (!response) {
      throw new Error(`Failed to fetch ${url}`);
    }
    content = await response.text();
  }

  // Rss feeds contain <item> elements, Atom feeds contain <entry> elements.
  const result =
    checkRss(content) || checkAtom(content) || checkJson(content) || null;
  return result;
}

function checkRss(content) {
  // First check for RSS version declaration
  const rssVersionRegex = /<rss\s+version\s*=\s*["']2\.0["']/i;
  if (rssVersionRegex.test(content)) {
    // Extract title from RSS feed (channel title, not item title)
    const channelRegex = /<channel>([\s\S]*?)<\/channel>/i;
    const channelMatch = content.match(channelRegex);
    if (channelMatch) {
      const channelContent = channelMatch[1];
      const titleRegex = /<title>([\s\S]*?)<\/title>/i;
      const titleMatch = channelContent.match(titleRegex);
      const title = titleMatch ? cleanTitle(removeCDATA(titleMatch[1])) : null;
      return { type: "rss", title };
    }
    // Fallback to original method if channel parsing fails
    const titleRegex = /<title>([\s\S]*?)<\/title>/i;
    const match = content.match(titleRegex);
    const title = match ? cleanTitle(removeCDATA(match[1])) : null;
    return { type: "rss", title };
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
    return { type: "atom", title };
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
      return { type: "json", title: cleanTitle(title) };
    }
    return null;
  } catch (e) {
    return null;
  }
}

