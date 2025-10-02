/**
 * Common feed endpoint paths to try during the blind search
 * @type {string[]}
 */
const FEED_ENDPOINTS = [
	// Standard RSS/Atom paths
	'&_rss=1', //ebay
	'.rss', // e.g. Reddit
	'rss',
	'rss/',
	'feed',
	'atom',
	'.atom',
	'.xml',
	'.json',
	'syndication/',
	'feeds',
	'feeds/',
	'atom.xml',
	'rss.xml', // this seems to be to lmost often used file name
	'rssfeed.xml',
	'rssfeed.rdf',
	'rss/rss.php',
	'rss/news/rss.xml',
	'index.rss',
	'index.xml',
	'index.xml',
	'rss.xml',
	'atom.xml',
	'feed.xml',
	'feed.json',
	'feed.rss',
	'feed.atom',
	'index.atom',
	'rss/index.xml',
	'atom/index.xml',
	
	// Blog platform specific paths
	'blog?format=rss', // Squarespace
	'blog/feed',
	'blog/rss',
	'blog/atom',
	'blog/feeds',
	'blog-feed.xml', //WIX sites
	'weblog/rss',
	'weblog/atom',
	
	// WordPress specific paths
	'?format=feed', // Joomla
	'index.php?format=feed', // Joomla
	'feed/rss/',
	'feed/rss2/',
	'feed/atom/',
	'feed/rdf/',
	'?feed=rss2',
	'?feed=atom',
	'wp-feed.php',
	'wp-rss.php',
	'wp-rss2.php',
	'wp-atom.php',
	'wp-rdf.php',
	
	// News sites and publications
	'rss/news/',
	'rss/articles/',
	'rss/latest/',
	'atom/news/',
	'news/rss',
	'news/atom',
	'articles/feed',
	'latest/feed',
	'latest.rss',
	'news.xml',
	
	// E-commerce and product feeds
	'products/rss',
	'products/atom',
	'catalog/feed',
	'catalog.xml', // product catalogs
	'inventory/feed',
	'inventory.rss', // inventory updates
	'deals/feed',
	'deals.xml', // deal/sale feeds
	'specials/feed',
	'promotions/feed',
	'products.rss', // product feeds
	
	// Podcast and media feeds
	'podcast/rss',
	'podcast/atom',
	'podcasts/feed',
	'audio/feed',
	'video/feed',
	'media/feed',
	'episodes/feed',
	'episodes.rss', // episodic content
	'shows/feed',
	'podcast.rss', // audio content
	'videos.rss', // video content
	'gallery.rss', // image galleries
	
	// Social media and community feeds
	'community/feed',
	'forum/rss',
	'forum.rss', // forum posts
	'forum/atom',
	'discussions/feed',
	'comments/feed',
	'reviews/feed',
	
	// Event and calendar feeds
	'events/feed',
	'events.rss', // calendar events
	'calendar/feed',
	'schedule/feed',
	'agenda/feed',
	
	// Job and career feeds
	'jobs/feed',
	'jobs.rss', // job listings
	'careers/feed',
	'opportunities/feed',
	'vacancies/feed',
	
	// Content management systems
	'content/feed',
	'pages/feed',
	'documents/feed',
	'resources/feed',
	
	// Newsletter and email feeds
	'newsletter/feed',
	'emails/feed',
	'mailinglist/feed',
	'subscription/feed',
	
	// Custom and alternative paths
	'newsfeed',
	'rssfeed',
	'atomfeed',
	'jsonfeed',
	
	// API style feeds
	'api/rss.xml', // API endpoints
	'api/feed',
	'api/rss',
	'api/atom',
	'api/v1/feed',
	'api/v2/feed',
	'v1/feed',
	'v2/feed',
	'api/mobile/feed',
	
	// Legacy and alternative extensions
	'.rdf',
	'rdf',
	'rdf/',
	'.opml',
	'opml',
	'opml/',
	
	// Category and tag feeds
	'category/*/feed',
	'tag/*/feed',
	'topics/feed',
	'tags/feed',
	
	// User and author feeds
	'author/*/feed',
	'user/*/feed',
	'profile/*/feed',
	
	// Time-based feeds
	'daily/feed',
	'weekly/feed',
	'monthly/feed',
	'yearly/feed',
	'archive/feed',
	
	// Specialized content feeds
	'press/feed',
	'releases/feed',
	'announcements/feed',
	'updates/feed',
	'changelog/feed',
	'revisions/feed',
	
	// Mobile and app feeds
	'mobile/feed',
	'app/feed',
	
	// Regional and local feeds
	'local/feed',
	'regional/feed',
	'national/feed',
	'international/feed',
	
	// Industry specific feeds
	'industry/feed',
	'sector/feed',
	'market/feed',
	'finance/feed',
	'sports/feed',
	'entertainment/feed',
	'technology/feed',
	'science/feed',
	'health/feed',
	'education/feed',
	
	// Aggregation and compilation feeds
	'all/feed',
	'everything/feed',
	'combined/feed',
	'aggregate/feed',
	'compilation/feed',
	
	// International variations
	'actualites/feed', // French news
	'noticias/feed', // Spanish news
	'nachrichten/feed', // German news
	'novosti/feed', // Russian news
	'nieuws/feed', // Dutch news
	
	// Query parameter based feeds
	'?rss=1',
	'?atom=1',
	'?feed=rss',
	'?feed=atom',
	'?format=rss',
	'?format=atom',
	'?format=feed',
	
	// Other existing paths from original list
	'export/rss.xml', // export directories
	'external?type=rss2',
	'feed',
	'feed.aspx', // ASP.NET feeds
	'feed.cml', // Wix, Weflow
	'feed/atom',
	'feed/atom.rss',
	'feed/atom.xml',
	'feed/rdf',
	'feed/rss.xml',
	'feed/rss2',
	'feeds',
	'extern.php?action=feed&type=atom',
	'index.php?action=.xml;type=rss',
	'posts.rss',
	'public/feed.xml', // public feeds
	'rss',
	'rss.aspx', // ASP.NET sites
	'rss.cfm', // ColdFusion sites
	'rss.php',
	'sitenews',
	'spip.php?page=backend',
	'spip.php?page=backend-breve',
	'spip.php?page=backend-sites',
	'syndicate/rss.xml',
	'syndication.php',
	'xml',
];

/**
 * Performs a "blind search" for RSS/Atom feeds by trying a list of common feed endpoint paths.
 * It traverses up the URL path from the instance's site URL to its origin,
 * appending various known feed endpoints at each level.
 *
 * @param {object} instance - The instance object containing site information and an event emitter.
 * @param {string} instance.site - The base URL to start the blind search from.
 * @param {object} instance.options - Options for the search.
 * @param {boolean} instance.options.keepQueryParams - Whether to keep query parameters from the original URL.
 * @param {boolean} instance.options.all - Whether to find all feeds instead of stopping at one of each type
 * @param {number} instance.options.maxFeeds - Maximum number of feeds to find before stopping (0 = no limit)
 * @param {boolean} instance.options.showErrors - Whether to show errors during the search
 * @param {function(string, object): void} instance.emit - A function to emit events (e.g., 'start', 'log', 'error', 'end').
 * @returns {Promise<Array<{url: string, feedType: string, title: string|null}>>} A promise that resolves to an array of found feed objects.
 *   Each object contains the `url` of the feed, its `feedType` ('rss' or 'atom'), and its `title` if available.
 */

import checkFeed from './checkFeed.js';

/**
 * Generates all possible endpoint URLs by traversing up the URL path
 * @param {string} siteUrl - The base site URL
 * @param {boolean} keepQueryParams - Whether to keep query parameters
 * @returns {string[]} Array of potential feed URLs
 */
function generateEndpointUrls(siteUrl, keepQueryParams) {
	const origin = new URL(siteUrl).origin;
	let path = siteUrl;
	const endpointUrls = [];

	// Extract query parameters if the keepQueryParams option is enabled
	let queryParams = '';
	if (keepQueryParams) {
		const urlObj = new URL(siteUrl);
		queryParams = urlObj.search; // This includes the '?' character if there are query parameters
	}

	while (path.length >= origin.length) {
		// Ensure we don't have a double slash by removing a trailing slash from the path.
		const basePath = path.endsWith('/') ? path.slice(0, -1) : path;
		FEED_ENDPOINTS.forEach(endpoint => {
			// Add query parameters to the endpoint URL if they exist and the option is enabled
			const urlWithParams = queryParams ? `${basePath}/${endpoint}${queryParams}` : `${basePath}/${endpoint}`;
			endpointUrls.push(urlWithParams);
		});
		path = path.slice(0, path.lastIndexOf('/'));
	}

	return endpointUrls;
}

/**
 * Adds a found feed to the feeds array and updates the feed type flags
 * @param {object} feedResult - The result from checkFeed
 * @param {string} url - The URL of the found feed
 * @param {Array} feeds - The array to add the feed to
 * @param {boolean} rssFound - Whether an RSS feed has already been found
 * @param {boolean} atomFound - Whether an Atom feed has already been found
 * @returns {{rssFound: boolean, atomFound: boolean}} Updated flags
 */
function addFeed(feedResult, url, feeds, rssFound, atomFound) {
	if (feedResult.type === 'rss') {
		rssFound = true;
	} else if (feedResult.type === 'atom') {
		atomFound = true;
	}

	feeds.push({
		url,
		feedType: feedResult.type,
		title: feedResult.title,
	});

	return { rssFound, atomFound };
}

/**
 * Determines if the search should continue based on options and found feeds
 * @param {number} currentIndex - Current index in the URL array
 * @param {number} totalUrls - Total number of URLs to check
 * @param {boolean} rssFound - Whether an RSS feed has been found
 * @param {boolean} atomFound - Whether an Atom feed has already been found
 * @param {boolean} shouldCheckAll - Whether to check all URLs regardless of what's found
 * @returns {boolean} Whether to continue searching
 */
function shouldContinueSearch(currentIndex, totalUrls, rssFound, atomFound, shouldCheckAll) {
	return currentIndex < totalUrls && !(shouldCheckAll ? false : rssFound && atomFound);
}

export default async function blindSearch(instance) {
	instance.emit('start', { module: 'blindsearch', niceName: 'Blind search' });

	// Generate all possible endpoint URLs
	const endpointUrls = generateEndpointUrls(instance.site, instance.options?.keepQueryParams || false);

	// Emit the total count so the CLI can display it
	instance.emit('log', {
		module: 'blindsearch',
		totalCount: endpointUrls.length,
	});

	const shouldCheckAll = instance.options?.all || false;
	const maxFeeds = instance.options?.maxFeeds || 0; // Maximum number of feeds to find (0 = no limit)

	// Process each URL to find feeds
	const results = await processFeeds(endpointUrls, shouldCheckAll, maxFeeds, instance);

	instance.emit('end', { module: 'blindsearch', feeds: results.feeds });
	return results.feeds;
}

/**
 * Processes a list of URLs to find feeds
 * @param {string[]} endpointUrls - Array of URLs to check for feeds
 * @param {boolean} shouldCheckAll - Whether to check all URLs regardless of what's found
 * @param {number} maxFeeds - Maximum number of feeds to find (0 = no limit)
 * @param {object} instance - The FeedScout instance
 * @returns {Promise<object>} A promise that resolves to an object containing feeds, rssFound, and atomFound status
 */
async function processFeeds(endpointUrls, shouldCheckAll, maxFeeds, instance) {
	const feeds = [];
	const foundUrls = new Set();
	let rssFound = false;
	let atomFound = false;
	let i = 0;

	while (shouldContinueSearch(i, endpointUrls.length, rssFound, atomFound, shouldCheckAll)) {
		// Check if we've reached the maximum number of feeds
		if (maxFeeds > 0 && feeds.length >= maxFeeds) {
			await handleMaxFeedsReached(instance, feeds, maxFeeds);
			break;
		}

		const url = endpointUrls[i];
		const result = await processSingleFeedUrl(url, instance, foundUrls, feeds, rssFound, atomFound, maxFeeds);

		// Update tracking flags if a feed was found
		if (result.found) {
			rssFound = result.rssFound;
			atomFound = result.atomFound;
			
			// Check if we've reached the maximum number of feeds
			if (maxFeeds > 0 && feeds.length >= maxFeeds) {
				await handleMaxFeedsReached(instance, feeds, maxFeeds);
				break;
			}
		}

		// Emit that a URL was checked, which will increment the counter and update the progress
		instance.emit('log', { module: 'blindsearch', url: true });

		i++;
	}

	return { feeds, rssFound, atomFound };
}

/**
 * Processes a single feed URL
 * @param {string} url - The URL to process
 * @param {object} instance - The FeedScout instance
 * @param {Set} foundUrls - Set of already found URLs
 * @param {Array} feeds - Array of found feeds
 * @param {boolean} rssFound - Whether an RSS feed has been found
 * @param {boolean} atomFound - Whether an Atom feed has been found
 * @param {number} maxFeeds - Maximum number of feeds to find (0 = no limit)
 * @returns {Promise<object>} A promise that resolves to an object containing found status and updated flags
 */
async function processSingleFeedUrl(url, instance, foundUrls, feeds, rssFound, atomFound, maxFeeds) {
	try {
		const feedResult = await checkFeed(url);

		// Only add feed if it hasn't been found before
		if (feedResult && !foundUrls.has(url)) {
			foundUrls.add(url); // Track this URL to prevent duplicates

			// Add feed and update tracking flags
			const updatedFlags = addFeed(feedResult, url, feeds, rssFound, atomFound);
			rssFound = updatedFlags.rssFound;
			atomFound = updatedFlags.atomFound;

			// Emit updated feed count immediately when a feed is found
			// This will trigger a display update with the new count
			instance.emit('log', {
				module: 'blindsearch',
				foundFeedsCount: feeds.length,
			});

			return { found: true, rssFound, atomFound };
		}
	} catch (error) {
		await handleFeedError(instance, url, error);
	}
	
	return { found: false, rssFound, atomFound };
}

/**
 * Handles the case when maximum feeds limit is reached
 * @param {object} instance - The FeedScout instance
 * @param {Array} feeds - Array of found feeds
 * @param {number} maxFeeds - Maximum number of feeds allowed
 * @returns {Promise<void>}
 */
async function handleMaxFeedsReached(instance, feeds, maxFeeds) {
	instance.emit('log', {
		module: 'blindsearch',
		message: `Stopped due to reaching maximum feeds limit: ${feeds.length} feeds found (max ${maxFeeds} allowed).`,
	});
}

/**
 * Handles errors that occur during feed checking
 * @param {object} instance - The FeedScout instance
 * @param {string} url - The URL that caused the error
 * @param {Error} error - The error that occurred
 * @returns {Promise<void>}
 */
async function handleFeedError(instance, url, error) {
	// Only show errors if the undocumented --show-errors flag is set
	if (instance.options?.showErrors) {
		instance.emit('error', {
			module: 'blindsearch',
			error: `Error fetching ${url}: ${error.message}`,
		});
	}
}
