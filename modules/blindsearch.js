/**
 * Performs a "blind search" for RSS/Atom feeds by trying a list of common feed endpoint paths.
 * It traverses up the URL path from the instance's site URL to its origin,
 * appending various known feed endpoints at each level.
 *
 * @param {object} instance - The instance object containing site information and an event emitter.
 * @param {string} instance.site - The base URL to start the blind search from.
 * @param {object} instance.options - Options for the search.
 * @param {boolean} instance.options.keepQueryParams - Whether to keep query parameters from the original URL.
 * @param {function(string, object): void} instance.emit - A function to emit events (e.g., 'start', 'log', 'error', 'end').
 * @returns {Promise&lt;Array&lt;{url: string, feedType: string, title: string|null}&gt;&gt;} A promise that resolves to an array of found feed objects.
 *   Each object contains the `url` of the feed, its `feedType` ('rss' or 'atom'), and its `title` if available.
 */

import checkFeed from './checkFeed.js';

export default async function blindSearch(instance) {
	instance.emit('start', { module: 'blindsearch', niceName: 'Blind search' });

	/**
	 * A list of common feed endpoint paths to try during the blind search.
	 * @type {string[]}
	 */
	const endpoints = [
		'rss.xml', // this seems to be to lmost often used file name
		'.rss', // e.g. Reddit
		'&_rss=1', //ebay
		'atom.xml',
		'blog-feed.xml', //WIX sites
		'extern.php?action=feed&type=atom',
		'external?type=rss2',
		'feed',
		'feed.cml', // Wix, Weflow
		'feed/atom.rss',
		'feed/atom.xml',
		'feed/atom',
		'feed/rdf',
		'feed/rss.xml',
		'feed/rss/',
		'feed/rss2',
		'feeds',
		'index.php?action=.xml;type=rss',
		'index.rss',
		'index.xml',
		'latest.rss',
		'latest/feed',
		'news.xml',
		'posts.rss',
		'rss.php',
		'rss',
		'rss/news/rss.xml',
		'rss/rss.php',
		'rssfeed.rdf',
		'sitenews',
		'spip.php?page=backend-breve',
		'spip.php?page=backend-sites',
		'spip.php?page=backend',
		'syndication.php',
		'xml',
		'rssfeed.xml',
		'/index.php?format=feed', // Joomla
		'/?format=feed', // Joomla
		'/blog?format=rss', // Squarespace
		'rss.aspx', // ASP.NET sites
		'feed.aspx', // ASP.NET feeds
		'rss.cfm', // ColdFusion sites
		'products.rss', // product feeds
		'catalog.xml', // product catalogs
		'deals.xml', // deal/sale feeds
		'inventory.rss', // inventory updates
		'podcast.rss', // audio content
		'episodes.rss', // episodic content
		'events.rss', // calendar events
		'jobs.rss', // job listings
		'forum.rss', // forum posts
		'gallery.rss', // image galleries
		'videos.rss', // video content
		'api/rss.xml', // API endpoints
		'export/rss.xml', // export directories
		'public/feed.xml', // public feeds
		'syndicate/rss.xml',
	];

	// create an array of Urls with the potential feed paths down to the base url
	const origin = new URL(instance.site).origin;
	let path = instance.site;
	const endpointUrls = [];
	const feeds = [];

	// Use a Set to track found feed URLs and prevent duplicates
	const foundUrls = new Set();

	// Extract query parameters if the keepQueryParams option is enabled
	let queryParams = '';
	if (instance.options?.keepQueryParams) {
		const urlObj = new URL(instance.site);
		queryParams = urlObj.search; // This includes the '?' character if there are query parameters
	}

	while (path.length >= origin.length) {
		// Ensure we don't have a double slash by removing a trailing slash from the path.
		const basePath = path.endsWith('/') ? path.slice(0, -1) : path;
		endpoints.forEach(endpoint => {
			// Add query parameters to the endpoint URL if they exist and the option is enabled
			const urlWithParams = queryParams ? `${basePath}/${endpoint}${queryParams}` : `${basePath}/${endpoint}`;
			endpointUrls.push(urlWithParams);
		});
		path = path.slice(0, path.lastIndexOf('/'));
	}

	// Emit the total count so the CLI can display it
	instance.emit('log', {
		module: 'blindsearch',
		totalCount: endpointUrls.length,
	});

	// we short stop if an atom and a rss feed is found (unless --all is specified)
	// TODO: parallize
	let rssFound = false;
	let atomFound = false;
	let i = 0;
	const shouldCheckAll = instance.options?.all || false;
	while (i < endpointUrls.length && !(shouldCheckAll ? false : (rssFound && atomFound))) {
		let url = endpointUrls[i];

		// Emit log for unvisited site
		instance.emit('log', { module: 'blindsearch', url: false });

		try {
			let feedResult = await checkFeed(url);

			// Emit log for visited site
			instance.emit('log', { module: 'blindsearch', url: true });

			// Only add feed if it hasn't been found before
			if (feedResult && !foundUrls.has(url)) {
				foundUrls.add(url); // Track this URL to prevent duplicates

				if (feedResult.type === 'rss') {
					rssFound = true;
					feeds.push({
						url,
						feedType: feedResult.type,
						title: feedResult.title,
					});
				}
				if (feedResult.type === 'atom') {
					atomFound = true;
					feeds.push({
						url,
						feedType: feedResult.type,
						title: feedResult.title,
					});
				}
				// Handle JSON feeds as well
				if (feedResult.type === 'json') {
					feeds.push({
						url,
						feedType: feedResult.type,
						title: feedResult.title,
					});
				}
			}
		} catch (error) {
			// Emit log for visited site (even if it failed)
			instance.emit('log', { module: 'blindsearch', url: true });

			// Log error to console instead of emitting error event to prevent process exit
			// Emit error event with the specified pattern when an error occurs
			instance.emit('error', {
				module: 'blindsearch',
				error: `Error fetching ${url}: ${error.message}`,
			});
		}
		i++;
	}
	instance.emit('end', { module: 'blindsearch', feeds });
	return feeds;
}
