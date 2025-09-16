// Helper function to clean titles by removing excessive whitespace and newlines
function cleanTitle(title) {
  if (!title) return title;
  // Remove leading/trailing whitespace and collapse multiple whitespace characters
  return title.replace(/\s+/g, ' ').trim();
}

// Helper function to detect common feed path patterns
function isLikelyFeedPath(href) {
  // Common feed path patterns
  const commonFeedPaths = [
    '/rss/',
    '/rss',
    '/feed',
    '/atom',
    '.rss',
    '.atom',
    '.xml',
    '.json',
    '/syndication/',
    '/feeds/'
  ];
  
  // Check if href matches any common feed path pattern
  return commonFeedPaths.some(pattern => href.includes(pattern));
}

// Helper functions to properly classify URLs
function isValidHttpUrl(url) {
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'http:' || parsed.protocol === 'https:';
	} catch (e) {
		// If it fails to parse, it might be a relative URL
		return false;
	}
}

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

import checkFeed from './checkFeed.js';
import fetchWithTimeout from './fetchWithTimeout.js';
import { parseHTML } from 'linkedom';

// noFeeds: Link with "RSS/Feed/Atom/Json" in the title but that aren't feeds. Check if they lead to a feed

async function checkAnchors(instance) {
	const baseUrl = new URL(instance.site); // Keep full URL for proper relative URL resolution
	let feedUrls = [];
	let noFeeds = [];
	const anchors = instance.document.querySelectorAll('a');
	const regex = /rss|feed|atom|json/gi;
	let count = 0;

	for (const anchor of anchors) {
		if (count++ % 10 === 0) {
			instance.emit('log', { module: 'anchors', anchor });
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
		
		let match = anchor.href.match(regex);
		let match1 = anchor.textContent.match(regex);
		let isLikelyFeed = isLikelyFeedPath(anchor.href);
		if (match || match1 || isLikelyFeed) {
			try {
				let feedResult = await checkFeed(urlToCheck);
				if (feedResult) {
					feedUrls.push({
						href: urlToCheck,
						title: cleanTitle(anchor.textContent),
						type: feedResult.type,
						feedTitle: feedResult.title
					});
				} else {
					noFeeds.push({
						href: urlToCheck,
						title: cleanTitle(anchor.textContent),
					});
				}
			} catch (error) {
				// Emit error event with the specified pattern when an error occurs
				instance.emit('error', { module: 'anchors', error: error.message });
			}
		}
	}
	return [feedUrls, noFeeds];
}

// ---------------------------------------------------------------------------------------
async function getDocument(url) {
	try {
		const response = await fetchWithTimeout(url);
		if (!response) {
			return null;
		}
		const content = await response.text();
		const { document } = parseHTML(content);
		return document;
	} catch (error) {
		// Emit error event with the specified pattern when an error occurs
		instance.emit('error', { module: 'anchors', error: `Error fetching ${url}: ${error.message}` });
		return null;
	}
}
// ---------------------------------------------------------------------------------------

export default async function checkAllAnchors(instance) {
	instance.emit('start', {
		module: 'checkAllAnchors',
		niceName: 'Check all anchors',
	});
	let [feeds, noFeeds] = await checkAnchors(instance);
	instance.emit('end', { module: 'checkAllAnchors', feeds, noFeeds });
	return feeds;
}
