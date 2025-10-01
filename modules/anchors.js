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

// Helper function to detect common feed path patterns
/**
 * Detects if a URL path is likely to be a feed based on common patterns
 * @param {string} href - The URL path to check
 * @returns {boolean} True if the path matches common feed patterns, false otherwise
 */
function isLikelyFeedPath(href) {
  // Common feed path patterns organized by category
  const commonFeedPaths = [
    // Standard RSS/Atom paths
    '/rss/',
    '/rss',
    '/feed',
    '/atom',
    '.rss',
    '.atom',
    '.xml',
    '.json',
    '/syndication/',
    '/feeds/',
    
    // Blog platform specific paths
    '/blog/feed',           // Generic blog feeds
    '/blog/rss',
    '/blog/atom',
    '/blog/feeds',
    '/weblog/rss',          // Older weblog format
    '/weblog/atom',
    
    // WordPress specific paths
    '/feed/rss/',
    '/feed/rss2/',
    '/feed/atom/',
    '/feed/rdf/',
    '/?feed=rss2',
    '/?feed=atom',
    '/wp-feed.php',         // Older WordPress feed
    '/wp-rss.php',          // Very old WordPress RSS
    '/wp-rss2.php',         // Old WordPress RSS2
    '/wp-atom.php',         // Old WordPress Atom
    '/wp-rdf.php',          // Old WordPress RDF
    
    // News sites and publications
    '/rss/news/',
    '/rss/articles/',
    '/rss/latest/',
    '/atom/news/',
    '/news/rss',
    '/news/atom',
    '/articles/feed',
    '/latest/feed',
    
    // E-commerce and product feeds
    '/products/rss',
    '/products/atom',
    '/catalog/feed',
    '/inventory/feed',
    '/deals/feed',
    '/specials/feed',
    '/promotions/feed',
    
    // Podcast and media feeds
    '/podcast/rss',
    '/podcast/atom',
    '/podcasts/feed',
    '/audio/feed',
    '/video/feed',
    '/media/feed',
    '/episodes/feed',
    '/shows/feed',
    
    // Social media and community feeds
    '/community/feed',
    '/forum/rss',
    '/forum/atom',
    '/discussions/feed',
    '/comments/feed',
    '/reviews/feed',
    
    // Event and calendar feeds
    '/events/feed',
    '/calendar/feed',
    '/schedule/feed',
    '/agenda/feed',
    
    // Job and career feeds
    '/jobs/feed',
    '/careers/feed',
    '/opportunities/feed',
    '/vacancies/feed',
    
    // Content management systems
    '/content/feed',
    '/pages/feed',
    '/documents/feed',
    '/resources/feed',
    
    // Newsletter and email feeds
    '/newsletter/feed',
    '/emails/feed',
    '/mailinglist/feed',
    '/subscription/feed',
    
    // Custom and alternative paths
    '/newsfeed',
    '/rssfeed',
    '/atomfeed',
    '/jsonfeed',
    '/feed.json',
    '/feed.xml',
    '/rss.xml',
    '/atom.xml',
    '/feed.rss',
    '/feed.atom',
    '/index.rss',
    '/index.atom',
    '/index.xml',
    '/rss/index.xml',
    '/atom/index.xml',
    
    // International variations
    '/actualites/feed',     // French news
    '/noticias/feed',       // Spanish news
    '/nachrichten/feed',    // German news
    '/novosti/feed',        // Russian news
    '/nieuws/feed',         // Dutch news
    
    // Query parameter based feeds
    '?rss=1',
    '?atom=1',
    '?feed=rss',
    '?feed=atom',
    '?format=rss',
    '?format=atom',
    '?format=feed',
    
    // API style feeds
    '/api/feed',
    '/api/rss',
    '/api/atom',
    '/api/v1/feed',
    '/api/v2/feed',
    '/v1/feed',
    '/v2/feed',
    
    // Legacy and alternative extensions
    '.rdf',                 // RDF feeds
    '/rdf',
    '/rdf/',
    '.opml',                // OPML subscription lists
    '/opml',
    '/opml/',
    
    // Category and tag feeds
    '/category/*/feed',
    '/tag/*/feed',
    '/topics/feed',
    '/tags/feed',
    
    // User and author feeds
    '/author/*/feed',
    '/user/*/feed',
    '/profile/*/feed',
    
    // Time-based feeds
    '/daily/feed',
    '/weekly/feed',
    '/monthly/feed',
    '/yearly/feed',
    '/archive/feed',
    
    // Specialized content feeds
    '/press/feed',
    '/releases/feed',
    '/announcements/feed',
    '/updates/feed',
    '/changelog/feed',
    '/revisions/feed',
    
    // Mobile and app feeds
    '/mobile/feed',
    '/app/feed',
    '/api/mobile/feed',
    
    // Regional and local feeds
    '/local/feed',
    '/regional/feed',
    '/national/feed',
    '/international/feed',
    
    // Industry specific feeds
    '/industry/feed',
    '/sector/feed',
    '/market/feed',
    '/finance/feed',
    '/sports/feed',
    '/entertainment/feed',
    '/technology/feed',
    '/science/feed',
    '/health/feed',
    '/education/feed',
    
    // Aggregation and compilation feeds
    '/all/feed',
    '/everything/feed',
    '/combined/feed',
    '/aggregate/feed',
    '/compilation/feed'
  ];
  
  // Check if href matches any common feed path pattern
  return commonFeedPaths.some(pattern => href.includes(pattern));
}

// Helper functions to properly classify URLs
/**
 * Checks if a URL is a valid HTTP or HTTPS URL
 * @param {string} url - The URL to validate
 * @returns {boolean} True if the URL is valid and has HTTP or HTTPS protocol, false otherwise
 */
function isValidHttpUrl(url) {
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'http:' || parsed.protocol === 'https:';
	} catch (e) {
		// If it fails to parse, it might be a relative URL
		return false;
	}
}

/**
 * Checks if a URL is a relative path (not an absolute URL)
 * @param {string} url - The URL to check
 * @returns {boolean} True if the URL is a relative path, false otherwise
 */
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

// Helper function to check if a URL is from the same domain as the base URL
/**
 * Checks if a URL is from the same domain as the base URL
 * @param {string} url - The URL to check
 * @param {string} baseUrl - The base URL to compare against
 * @returns {boolean} True if both URLs are from the same domain, false otherwise
 */
function isSameDomain(url, baseUrl) {
	try {
		const urlObj = new URL(url);
		const baseObj = new URL(baseUrl);
		return urlObj.hostname === baseObj.hostname;
	} catch (e) {
		// If it fails to parse, assume it's not from the same domain
		return false;
	}
}

import checkFeed from './checkFeed.js';
import fetchWithTimeout from './fetchWithTimeout.js';
import { parseHTML } from 'linkedom';

// noFeeds: Link with "RSS/Feed/Atom/Json" in the title but that aren't feeds. Check if they lead to a feed

/**
 * Checks all anchor tags on the page for potential feed links
 * @param {object} instance - The FeedScout instance containing document and site info
 * @returns {Promise<Array>} A promise that resolves to an array of [feedUrls, noFeeds] where feedUrls are found feeds and noFeeds are links that looked like feeds but weren't
 */
async function checkAnchors(instance) {
	const baseUrl = new URL(instance.site); // Keep full URL for proper relative URL resolution
	let feedUrls = [];
	let noFeeds = [];
	const anchors = instance.document.querySelectorAll('a');
	const regex = /rss|feed|atom|json/gi;
	const maxFeeds = instance.options?.maxFeeds || 0; // Maximum number of feeds to find (0 = no limit)
	let count = 0;

	for (const anchor of anchors) {
		// Check if we've reached the maximum number of feeds
		if (maxFeeds > 0 && feedUrls.length >= maxFeeds) {
			instance.emit('log', {
				module: 'anchors',
				message: `Stopped due to reaching maximum feeds limit: ${feedUrls.length} feeds found (max ${maxFeeds} allowed).`
			});
			break;
		}
		
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
		
		// Skip URLs that are not from the same domain
		if (isAbsoluteHttp && !isSameDomain(urlToCheck, instance.site)) {
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
					
					// Check if we've reached the maximum number of feeds after adding
					if (maxFeeds > 0 && feedUrls.length >= maxFeeds) {
						instance.emit('log', {
							module: 'anchors',
							message: `Stopped due to reaching maximum feeds limit: ${feedUrls.length} feeds found (max ${maxFeeds} allowed).`
						});
						break;
					}
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
/**
 * Fetches and parses a document from a URL
 * @param {string} url - The URL to fetch and parse
 * @returns {Promise<object|null>} A promise that resolves to the parsed document or null if fetch failed
 */
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
	let [feeds, noFeeds] = await checkAnchors(instance);
	instance.emit('end', { module: 'checkAllAnchors', feeds, noFeeds });
	return feeds;
}
