/**
 * Common feed endpoint paths to try during the blind search
 * This comprehensive list is based on analysis of popular websites and feed standards
 * Ordered roughly by frequency of use, with most common patterns first
 * @type {string[]}
 */
const FEED_ENDPOINTS = [
	// Standard RSS/Atom paths (most common)
	'&_rss=1', // eBay-style query parameter feeds
	'.atom', // Atom extension feeds
	'.json', // JSON Feed format
	'.rss', // Reddit-style extension feeds
	'.xml', // Generic XML feeds
	'atom', // Atom feed endpoint
	'atom.xml', // Standard Atom filename
	'atom/index.xml', // Atom directory index
	'feed', // Generic feed endpoint (very common)
	'feed.atom', // Atom with feed prefix
	'feed.json', // JSON Feed format
	'feed.rss', // RSS with feed prefix
	'feed.xml', // Generic feed XML
	'feeds', // Plural feeds directory
	'feeds/', // Feeds directory with trailing slash
	'index.atom', // Index-style Atom
	'index.rss', // Index-style RSS
	'index.xml', // Generic index XML
	'rss', // Simple RSS directory
	'rss/', // RSS directory with trailing slash
	'rss.xml', // Most commonly used RSS filename
	'rss/index.xml', // RSS directory index
	'rss/news/rss.xml', // News-specific RSS path
	'rss/rss.php', // PHP-generated RSS
	'rssfeed.rdf', // RDF-based RSS feeds
	'rssfeed.xml', // Descriptive RSS filename
	'syndication/', // Syndication directory

	// Blog platform specific paths
	'blog-feed.xml', // WIX sites
	'blog/atom',
	'blog/feed',
	'blog/feeds',
	'blog/rss',
	'blog?format=rss', // Squarespace
	'weblog/atom',
	'weblog/rss',

	// WordPress specific paths
	'?feed=atom',
	'?feed=rss2',
	'?format=feed', // Joomla
	'feed/atom/',
	'feed/rdf/',
	'feed/rss/',
	'feed/rss2/',
	'index.php?format=feed', // Joomla
	'wp-atom.php',
	'wp-feed.php',
	'wp-rdf.php',
	'wp-rss.php',
	'wp-rss2.php',

	// News sites and publications
	'articles/feed',
	'atom/news/',
	'latest.rss',
	'latest/feed',
	'news.xml',
	'news/atom',
	'news/rss',
	'rss/articles/',
	'rss/latest/',
	'rss/news/',

	// E-commerce and product feeds
	'catalog.xml', // product catalogs
	'catalog/feed',
	'deals.xml', // deal/sale feeds
	'deals/feed',
	'inventory.rss', // inventory updates
	'inventory/feed',
	'products.rss', // product feeds
	'products/atom',
	'products/rss',
	'promotions/feed',
	'specials/feed',

	// Podcast and media feeds
	'audio/feed',
	'episodes.rss', // episodic content
	'episodes/feed',
	'gallery.rss', // image galleries
	'media/feed',
	'podcast.rss', // audio content
	'podcast/atom',
	'podcast/rss',
	'podcasts/feed',
	'shows/feed',
	'video/feed',
	'videos.rss', // video content

	// Social media and community feeds
	'comments/feed',
	'community/feed',
	'discussions/feed',
	'forum.rss', // forum posts
	'forum/atom',
	'forum/rss',
	'reviews/feed',

	// Event and calendar feeds
	'agenda/feed',
	'calendar/feed',
	'events.rss', // calendar events
	'events/feed',
	'schedule/feed',

	// Job and career feeds
	'careers/feed',
	'jobs.rss', // job listings
	'jobs/feed',
	'opportunities/feed',
	'vacancies/feed',

	// Content management systems
	'content/feed',
	'documents/feed',
	'pages/feed',
	'resources/feed',

	// Newsletter and email feeds
	'emails/feed',
	'mailinglist/feed',
	'newsletter/feed',
	'subscription/feed',

	// Custom and alternative paths
	'atomfeed',
	'jsonfeed',
	'newsfeed',
	'rssfeed',

	// API style feeds
	'api/atom',
	'api/feed',
	'api/mobile/feed',
	'api/rss',
	'api/rss.xml', // API endpoints
	'api/v1/feed',
	'api/v2/feed',
	'v1/feed',
	'v2/feed',

	// Legacy and alternative extensions
	'.opml',
	'.rdf',
	'opml',
	'opml/',
	'rdf',
	'rdf/',

	// Category and tag feeds
	'category/*/feed',
	'tag/*/feed',
	'tags/feed',
	'topics/feed',

	// User and author feeds
	'author/*/feed',
	'profile/*/feed',
	'user/*/feed',

	// Time-based feeds
	'archive/feed',
	'daily/feed',
	'monthly/feed',
	'weekly/feed',
	'yearly/feed',

	// Specialized content feeds
	'announcements/feed',
	'changelog/feed',
	'press/feed',
	'releases/feed',
	'revisions/feed',
	'updates/feed',

	// Mobile and app feeds
	'app/feed',
	'mobile/feed',

	// Regional and local feeds
	'international/feed',
	'local/feed',
	'national/feed',
	'regional/feed',

	// Industry specific feeds
	'education/feed',
	'entertainment/feed',
	'finance/feed',
	'health/feed',
	'industry/feed',
	'market/feed',
	'science/feed',
	'sector/feed',
	'sports/feed',
	'technology/feed',

	// Aggregation and compilation feeds
	'aggregate/feed',
	'all/feed',
	'combined/feed',
	'compilation/feed',
	'everything/feed',

	// International variations
	'actualites/feed', // French news
	'nachrichten/feed', // German news
	'nieuws/feed', // Dutch news
	'noticias/feed', // Spanish news
	'novosti/feed', // Russian news

	// Query parameter based feeds
	'?atom=1',
	'?download=atom',
	'?download=rss',
	'?export=atom',
	'?export=rss',
	'?feed=atom',
	'?feed=rss',
	'?format=atom',
	'?format=feed',
	'?format=rss',
	'?output=atom',
	'?output=rss',
	'?rss=1',
	'?syndicate=atom',
	'?syndicate=rss',
	'?type=atom',
	'?type=rss',
	'?view=feed',
	'?view=rss',

	// Other existing paths from original list
	'export/rss.xml', // export directories
	'extern.php?action=feed&type=atom',
	'external?type=rss2',
	'feed.aspx', // ASP.NET feeds
	'feed.cml', // Wix, Weflow
	'feed/atom',
	'feed/atom.rss',
	'feed/atom.xml',
	'feed/rdf',
	'feed/rss.xml',
	'feed/rss2',
	'index.php?action=.xml;type=rss',
	'posts.rss',
	'public/feed.xml', // public feeds
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

	// Additional modern feed endpoints
	'feed.jsp', // Java Server Pages feeds
	'feed.php', // PHP-generated feeds
	'feed.pl', // Perl feeds
	'feed.py', // Python feeds
	'feed.rb', // Ruby feeds
	'feeds.json', // JSON feeds directory
	'feeds.php', // PHP feeds directory
	'feeds.xml', // XML feeds directory

	// Static site generators
	'_site/feed.xml', // Jekyll default
	'build/feed.xml', // React build
	'dist/feed.xml', // Build output
	'out/feed.xml', // Next.js output

	// Headless CMS feeds
	'api/feed.xml', // Headless CMS
	'cms/feed', // CMS endpoints
	'contentful/feed', // Contentful
	'sanity/feed', // Sanity CMS
	'strapi/feed', // Strapi CMS

	// Documentation feeds
	'docs/feed', // Documentation feeds
	'documentation/feed',
	'help/feed',
	'kb/feed', // Knowledge base
	'support/feed',
	'wiki/feed', // Wiki feeds

	// Repository and code feeds
	'branches/feed', // Git branches
	'commits/feed', // Git commits
	'issues/feed', // Issue tracker
	'pull-requests/feed', // PR feeds
	'releases/feed', // Software releases
	'tags/feed', // Git tags

	// Analytics and tracking feeds
	'analytics/feed', // Analytics data
	'metrics/feed', // Metrics feeds
	'reports/feed', // Report feeds
	'stats/feed', // Statistics feeds

	// Multi-language feeds
	'de/feed', // German
	'en/feed', // English
	'es/feed', // Spanish
	'fr/feed', // French
	'it/feed', // Italian
	'ja/feed', // Japanese
	'ko/feed', // Korean
	'pt/feed', // Portuguese
	'ru/feed', // Russian
	'zh/feed', // Chinese

	// Additional file extensions
	'feed.csv', // CSV feeds
	'feed.txt', // Plain text feeds
	'feed.yaml', // YAML feeds
	'feed.yml', // YAML feeds (alternative)

	// Specialized platforms
	'drupal/feed', // Drupal CMS
	'joomla/feed', // Joomla CMS
	'magento/feed', // Magento stores
	'opencart/feed', // OpenCart
	'prestashop/feed', // PrestaShop
	'shopify/feed', // Shopify stores
	'typo3/feed', // TYPO3 CMS
	'woocommerce/feed', // WooCommerce

	// Social and community platforms
	'discourse/feed', // Discourse forums
	'invision/feed', // Invision Community
	'phpbb/feed', // phpBB forums
	'vbulletin/feed', // vBulletin forums
	'xenforo/feed', // XenForo forums
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
 * Uses a "path traversal" algorithm that starts from the specific URL and works up to the domain root
 * @param {string} siteUrl - The base site URL
 * @param {boolean} keepQueryParams - Whether to keep query parameters
 * @returns {string[]} Array of potential feed URLs
 */
function generateEndpointUrls(siteUrl, keepQueryParams) {
	const origin = new URL(siteUrl).origin;
	let path = siteUrl;
	const endpointUrls = [];

	// Extract query parameters if the keepQueryParams option is enabled
	// This preserves original URL parameters like ?category=tech in feed URLs
	let queryParams = '';
	if (keepQueryParams) {
		const urlObj = new URL(siteUrl);
		queryParams = urlObj.search; // This includes the '?' character if there are query parameters
	}

	// Path traversal algorithm: Start from specific path, work up to domain root
	// Example: https://example.com/blog/posts → https://example.com/blog → https://example.com
	// This strategy tries more specific locations first, then falls back to general ones
	while (path.length >= origin.length) {
		// Normalize path by removing trailing slash to prevent double slashes in URLs
		// Example: "https://example.com/blog/" becomes "https://example.com/blog"
		const basePath = path.endsWith('/') ? path.slice(0, -1) : path;

		// Try each known feed endpoint at this path level
		FEED_ENDPOINTS.forEach(endpoint => {
			// Construct final URL: basePath + "/" + endpoint + queryParams (if any)
			// Example: "https://example.com/blog" + "/" + "feed" + "?category=tech"
			const urlWithParams = queryParams ? `${basePath}/${endpoint}${queryParams}` : `${basePath}/${endpoint}`;
			endpointUrls.push(urlWithParams);
		});

		// Move up one directory level by removing everything after the last "/"
		// Example: "https://example.com/blog/posts" → "https://example.com/blog"
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
 * Implements early termination logic: stop when both RSS and Atom feeds are found (unless checking all)
 * @param {number} currentIndex - Current index in the URL array
 * @param {number} totalUrls - Total number of URLs to check
 * @param {boolean} rssFound - Whether an RSS feed has been found
 * @param {boolean} atomFound - Whether an Atom feed has already been found
 * @param {boolean} shouldCheckAll - Whether to check all URLs regardless of what's found
 * @returns {boolean} Whether to continue searching
 */
function shouldContinueSearch(currentIndex, totalUrls, rssFound, atomFound, shouldCheckAll) {
	// Continue if we haven't processed all URLs AND we haven't found both feed types
	// Logic breakdown:
	// - If shouldCheckAll is true: never stop early (!(false) = true)
	// - If shouldCheckAll is false: stop when both RSS and Atom are found (!(true && true) = false)
	// - Always stop when currentIndex >= totalUrls
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
			explanation:
				'An error occurred while trying to fetch a potential feed URL during blind search. This could be due to network timeouts, server errors, 404 not found, or invalid content.',
			suggestion:
				'This is normal during blind search as many URLs are tested. The search will continue with other potential feed endpoints.',
		});
	}
}
