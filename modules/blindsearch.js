/**
 * Common feed endpoint paths to try during the blind search
 * @type {string[]}
 */
const FEED_ENDPOINTS = [
	'&_rss=1', //ebay
	'.rss', // e.g. Reddit
	'/blog?format=rss', // Squarespace
	'/?format=feed', // Joomla
	'/index.php?format=feed', // Joomla
	'api/rss.xml', // API endpoints
	'atom.xml',
	'blog-feed.xml', //WIX sites
	'catalog.xml', // product catalogs
	'deals.xml', // deal/sale feeds
	'episodes.rss', // episodic content
	'events.rss', // calendar events
	'extern.php?action=feed&type=atom',
	'export/rss.xml', // export directories
	'external?type=rss2',
	'feed',
	'feed',
	'feed.aspx', // ASP.NET feeds
	'feed.cml', // Wix, Weflow
	'feed/atom',
	'feed/atom.rss',
	'feed/atom.xml',
	'feed/rdf',
	'feed/rss/',
	'feed/rss.xml',
	'feed/rss2',
	'feeds',
	'forum.rss', // forum posts
	'gallery.rss', // image galleries
	'index.php?action=.xml;type=rss',
	'index.rss',
	'index.xml',
	'inventory.rss', // inventory updates
	'jobs.rss', // job listings
	'latest/feed',
	'latest.rss',
	'news.xml',
	'podcast.rss', // audio content
	'posts.rss',
	'products.rss', // product feeds
	'public/feed.xml', // public feeds
	'rss',
	'rss.aspx', // ASP.NET sites
	'rss.cfm', // ColdFusion sites
	'rss.php',
	'rss/news/rss.xml',
	'rss/rss.php',
	'rssfeed.rdf',
	'rssfeed.xml',
	'rss.xml', // this seems to be to lmost often used file name
	'sitenews',
	'spip.php?page=backend',
	'spip.php?page=backend-breve',
	'spip.php?page=backend-sites',
	'syndicate/rss.xml',
	'syndication.php',
	'videos.rss', // video content
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
 * @returns {object} Object containing the found feeds and search status
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

				// Check if we've reached the maximum number of feeds
				if (maxFeeds > 0 && feeds.length >= maxFeeds) {
					await handleMaxFeedsReached(instance, feeds, maxFeeds);
					break;
				}
			}
		} catch (error) {
			await handleFeedError(instance, url, error);
		}

		// Emit that a URL was checked, which will increment the counter and update the progress
		instance.emit('log', { module: 'blindsearch', url: true });

		i++;
	}

	return { feeds, rssFound, atomFound };
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
