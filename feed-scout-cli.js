import { Command } from 'commander';
import chalk from 'chalk';
import { createRequire } from 'module';
import FeedScout from './feed-scout.js';
import banner from './modules/banner.js';

/**
 * Displays the banner with a gradient color effect
 */
function displayGradientBanner() {
	const text = banner;
	const lines = text.split('\n');
	let coloredText = '';

	// Simple blue to red gradient
	const startColor = { r: 0, g: 0, b: 255 }; // Blue
	const endColor = { r: 255, g: 0, b: 0 }; // Red

	// Count non-empty lines for gradient calculation
	const nonEmptyLines = lines.filter(line => line.trim() !== '').length;
	let nonEmptyIndex = 0;

	lines.forEach(line => {
		// Preserve empty lines
		if (line.trim() === '') {
			coloredText += line + '\n';
			return;
		}

		// Calculate color ratio for this line
		const ratio = nonEmptyLines > 1 ? nonEmptyIndex / (nonEmptyLines - 1) : 0;

		// Calculate RGB values
		const r = Math.round(startColor.r + ratio * (endColor.r - startColor.r));
		const g = Math.round(startColor.g + ratio * (endColor.g - startColor.g));
		const b = Math.round(startColor.b + ratio * (endColor.b - startColor.b));

		// Apply color to the entire line
		coloredText += chalk.rgb(r, g, b)(line) + '\n';
		nonEmptyIndex++;
	});

	console.log(coloredText);
}

displayGradientBanner();
// Store the options globally so we can access them in the end function
let currentOptions = {};
// Flag to track if we've already shown the deepsearch suggestion
let hasShownDeepSearchSuggestion = false;

// Trackers for visited and unvisited sites
let visitedCount = 0;
let unvisitedCount = 0;
let progressLineActive = false;
let blindsearchStartTime = 0;

const program = new Command();
program.name(`feed-scout`).description('Find RSS, Atom, and JSON feeds on any website with Feed Scout.');

// global options

program
	.command('version')
	.description('Get version')
	.action(() => {
		const require = createRequire(import.meta.url);
		const packageConfig = require('./package.json');
		process.stdout.write(`${packageConfig.version}\n`);
	});

program
	.argument('[site]', 'The website URL to search for feeds')
	.option('-m, --metasearch', 'Meta search only')
	.option('-b, --blindsearch', 'Blind search only')
	.option('-a, --anchorsonly', 'Anchors search only')
	.option('-d, --deepsearch', 'Enable deep search')
	.option('--depth <number>', 'Depth of deep search', 3)
	.option('--max-links <number>', 'Maximum number of links to process during deep search', 1000)
	.option('--timeout <seconds>', 'Timeout for fetch requests in seconds', 5)
	.option('--keep-query-params', 'Keep query parameters from the original URL when searching')
	.option('--check-foreign-feeds', "Check if foreign domain URLs are feeds (but don't crawl them)")
	.option('--max-errors <number>', 'Stop after a certain number of errors', 5)
	.option('--max-feeds <number>', 'Stop search after finding a certain number of feeds', 0)
	.description('Find feeds for site')
	.action((site, options) => {
		if (!site) {
			program.help();
		} else {
			getFeeds(site, options);
		}
	});

program.parse();

// ---------------------------------------------------------------------------------------
/**
 * Logs progress and information to the console based on the module and data provided.
 * Handles different display formats for deep search, blind search, and other modules.
 *
 * @param {object} data - The data object containing information about the current event or progress.
 * @param {string} data.module - The name of the module sending the log (e.g., 'deepSearch', 'blindsearch').
 * @param {string} [data.url] - The URL being processed (relevant for 'deepSearch' and 'blindsearch').
 * @param {boolean} [data.error] - Indicates if an error occurred (relevant for 'deepSearch').
 * @param {number} [data.depth] - The current deep search depth (relevant for 'deepSearch').
 * @param {object} [data.feedCheck] - Object containing feed check results (relevant for 'deepSearch').
 * @param {boolean} [data.feedCheck.isFeed] - True if the URL is a feed (relevant for 'deepSearch').
 * @param {number} [data.totalCount] - The total number of URLs to process in blind search (initial call for 'blindsearch').
 */
function log(data) {
	// display url if deep searching
	if (data.module == 'deepSearch') {
		handleDeepSearchLog(data);
	} else if (data.module === 'blindsearch') {
		handleBlindSearchLog(data);
	} else if (data.module === 'anchors') {
		handleAnchorsLog(data);
	} else {
		// For other modules, show progress dots
		process.stdout.write('.');
	}
}

/**
 * Handle logging for deep search module
 * @param {object} data - The data object containing information about the current event or progress.
 */
function handleDeepSearchLog(data) {
	// Handle max links message
	if (data.message) {
		process.stdout.write(chalk.yellow(`\n${data.message}\n`));
		return;
	}

	// Handle HTTP errors and fetch failures
	if (data.error) {
		process.stdout.write(`[${data.depth}] ${data.url} `);
		process.stdout.write(chalk.red(`❌ ${data.error}\n`));
		return;
	}

	// Display progress for deep search
	process.stdout.write(`[${data.depth}] ${data.url}`);

	// Show feed indicator if it's a feed
	if (data.feedCheck?.isFeed) {
		process.stdout.write(chalk.green(` [feed]\n`));
	} else {
		process.stdout.write(` ❌\n`);
	}
}

/**
 * Handle logging for blind search module
 * @param {object} data - The data object containing information about the current event or progress.
 */
/**\n * Handle logging for blind search and anchor modules\n * @param {object} data - The data object containing information about the current event or progress.\n * @param {string} moduleName - The name of the module for display purposes.\n */
function handleProgressLog(data, moduleName) {
	// Handle totalCount parameter
	if (data.totalCount) {
		unvisitedCount = data.totalCount;
		blindsearchStartTime = Date.now(); // Record start time
		return;
	}

	// Update counters
	if (data.url || data.anchor || data.link) {
		visitedCount++;
	}

	// Only update display if we have a module from blindsearch
	// Move to beginning of line and clear it
	if (progressLineActive) {
		process.stdout.write('\r' + ' '.repeat(80) + '\r');
	} else {
		progressLineActive = true;
	}

	// Calculate ETA instead of percentage
	const elapsedTime = Date.now() - blindsearchStartTime;
	const avgTimePerUrl = visitedCount > 0 ? elapsedTime / visitedCount : 0;
	const remainingUrls = unvisitedCount - visitedCount;
	const etaMs = avgTimePerUrl * remainingUrls;

	// Format ETA (convert milliseconds to minutes and seconds)
	const etaSeconds = Math.round(etaMs / 1000);
	const etaMinutes = Math.floor(etaSeconds / 60);
	const etaRemainingSeconds = etaSeconds % 60;
	const etaFormatted = `${etaMinutes}m ${etaRemainingSeconds}s remaining`;

	// Create new display showing "Started moduleName (visited urls/total urls) ETA"
	const displayText = `Started ${moduleName} (${visitedCount}/${unvisitedCount}) ${etaFormatted}`;
	process.stdout.write(displayText);
}

/**\n * Handle logging for blind search module\n * @param {object} data - The data object containing information about the current event or progress.\n */
function handleBlindSearchLog(data) {
	handleProgressLog(data, 'Blind search');
}

/**
 * Handle logging for anchors module
 * @param {object} data - The data object containing information about the current event or progress.
 */
function handleAnchorsLog(data) {
	handleProgressLog(data, 'Check all anchors');
}

/**
 * Handles the start event, initializing progress tracking
 * @param {object} data - The data object containing module and display information
 */
function start(data) {
	// Reset counters when starting a new search
	visitedCount = 0;
	unvisitedCount = 0;
	progressLineActive = false;
	blindsearchStartTime = 0;

	// Hide cursor for blindsearch and anchors
	if (data.niceName === 'Blind search' || data.niceName === 'Check all anchors') {
		process.stdout.write('\x1B[?25l'); // Hide cursor
	}

	process.stdout.write(`Start ${data.niceName} `);
}

/**
 * Handles the end event, displaying results and cleaning up
 * @param {object} data - The data object containing feed results and module information
 */
function end(data) {
	// Add newline after progress display
	if (progressLineActive) {
		process.stdout.write('\n');
		progressLineActive = false;
	}

	// Show cursor again after blindsearch and anchors
	if (data.module === 'blindsearch' || data.module === 'anchors' || data.module === 'checkAllAnchors') {
		process.stdout.write('\x1B[?25h'); // Show cursor
	}

	// Determine the module name for the finished message
	let moduleName = '';
	if (data.module === 'blindsearch') {
		moduleName = 'Blind search';
	} else if (data.module === 'anchors' || data.module === 'checkAllAnchors') {
		moduleName = 'Check all anchors';
	} else if (data.module === 'deepSearch') {
		moduleName = 'Deep search';
	} else {
		moduleName = 'Search';
	}

	// Handle case when no feeds are found
	if (data.feeds.length === 0) {
		process.stdout.write(chalk.yellow(`Finished ${moduleName}`));
		process.stdout.write(chalk.red(` No feeds found`));
		
		// Show additional info for deep search
		if (data.module === 'deepSearch') {
			process.stdout.write(` visited ${data.visitedUrls} pages`);
		}
		// Add newline at the very end
		process.stdout.write(`\n`);

		return;
	}

	// Handle case when feeds are found
	const feedCount = data.feeds.length;
	const feedWord = feedCount === 1 ? 'feed' : 'feeds';
	process.stdout.write(chalk.green(`Finished ${moduleName}`));
	process.stdout.write(chalk.green(` ${feedCount} ${feedWord} found`));
	
	// Show additional info for deep search
	if (data.module === 'deepSearch') {
		process.stdout.write(` visited ${data.visitedUrls} pages`);
	}
	// Add newline before JSON output
	process.stdout.write(`\n`);

	// Output the feeds in a formatted JSON
	process.stdout.write(`${JSON.stringify(data.feeds, null, 2)}\n`);

	// Exit successfully
	process.exit(0);
}
/**
 * Handles error events and displays error messages
 * @param {object} data - The error data object containing module and error information
 */
function error(data) {
	// Show cursor if hidden due to blindsearch and anchors
	if (data.module === 'blindsearch' || data.module === 'anchors' || data.module === 'checkAllAnchors') {
		process.stdout.write('\x1B?25h'); // Show cursor
	}

	if (data.error) {
		console.error(chalk.red(`Error: ${data.error}`));
	} else if (data.module) {
		console.error(chalk.red(`Error in ${data.module}: ${data.message || 'An error occurred'}`));
	} else {
		console.error(chalk.red(`Error: ${JSON.stringify(data)}`));
	}
}

// Show deepsearch suggestion at the very end if needed
function showDeepSearchSuggestionIfNeeded() {
	// If no feeds were found and deepsearch wasn't used, show suggestion
	const wasDeepSearchUsed = currentOptions && (currentOptions.deepsearch || currentOptions.all);
	if (!wasDeepSearchUsed && !hasShownDeepSearchSuggestion) {
		hasShownDeepSearchSuggestion = true;
		process.stdout.write(`\n${chalk.yellow('Note: Deep search is disabled by default.')}\n`);
		process.stdout.write(`${chalk.yellow('Try using the -d or --deepsearch flag to enable it:')}\n`);
		process.stdout.write(`${chalk.yellow('  feed-scout -d <site>')}\n`);
	}
}

// --------------------------------------------------------------------------------------

/**
 * Initializes the FeedScout instance with event handlers
 * @param {string} site - The website URL to search for feeds
 * @param {object} options - Options for the search
 * @returns {FeedScout} Initialized FeedScout instance
 */
function initializeFeedFinder(site, options) {
	// Check for undocumented flag manually to allow error display in blind search
	const showErrors = process.argv.includes('--show-errors');
	if (showErrors) {
		options.showErrors = true;
	}

	const feedFinder = new FeedScout(site, options);
	feedFinder.on('start', start);
	feedFinder.on('initialized', () => process.stdout.write(chalk.blue('\nInitialized\n\n')));
	feedFinder.on('log', log);
	feedFinder.on('error', error);

	// Temporarily disable the default end handler for individual strategies when accumulating results
	if (options.maxFeeds && options.maxFeeds > 0) {
		// Don't use default end handler when accumulating across strategies
		const tempEndHandler = data => {
			// Just store the data but don't exit yet
			return data;
		};
		feedFinder.on('end', tempEndHandler);
	} else {
		// Use default end handler for normal operation
		feedFinder.on('end', end);
	}

	return feedFinder;
}

/**
 * Handles exclusive search options (when only one search type is specified)
 * @param {FeedScout} feedFinder - The initialized FeedScout instance
 * @param {object} options - Search options
 * @returns {Promise<boolean>} True if an exclusive search was performed, false otherwise
 */
async function handleExclusiveSearch(feedFinder, options) {
	const { metasearch, blindsearch, anchorsonly } = options;

	if (metasearch) {
		await feedFinder.metaLinks();
		showDeepSearchSuggestionIfNeeded();
		return true;
	}

	if (blindsearch) {
		await feedFinder.blindSearch();
		showDeepSearchSuggestionIfNeeded();
		return true;
	}

	if (anchorsonly) {
		await feedFinder.checkAllAnchors();
		showDeepSearchSuggestionIfNeeded();
		return true;
	}

	return false;
}

/**
 * Executes standard search strategies
 * @param {FeedScout} feedFinder - The FeedScout instance
 * @param {object} options - Search options
 * @returns {Promise<object>} Result with found feeds and status
 */
async function executeStandardSearch(feedFinder, options) {
	const { all, anchorsonly } = options;
	
	// If anchorsonly is specified, only use the checkAllAnchors strategy
	let searchStrategies;
	if (anchorsonly) {
		searchStrategies = [feedFinder.checkAllAnchors];
	} else {
		searchStrategies = [feedFinder.metaLinks, feedFinder.checkAllAnchors, feedFinder.blindSearch];
	}

	let foundFeeds = false;
	let totalFeeds = [];

	// When using maxFeeds, we need to accumulate results across strategies
	if (options.maxFeeds && options.maxFeeds > 0) {
		return await executeMaxFeedsSearch(feedFinder, searchStrategies, options);
	} else {
		// For normal operation without maxFeeds, use the original behavior
		for (const strategy of searchStrategies) {
			const feeds = await strategy.call(feedFinder);
			// If not in 'all' mode, and feeds are found, we can stop.
			if (!all && feeds?.length > 0) {
				foundFeeds = true;
				break;
			}
		}
	}

	return { foundFeeds, totalFeeds };
}

/**
 * Executes search with maxFeeds handling
 * @param {FeedScout} feedFinder - The FeedScout instance
 * @param {Array} searchStrategies - Array of search strategy functions
 * @param {object} options - Search options
 * @returns {Promise<object>} Result with found feeds and status
 */
async function executeMaxFeedsSearch(feedFinder, searchStrategies, options) {
	const { all, anchorsonly } = options;

	// If anchorsonly is specified, only use the checkAllAnchors strategy
	let effectiveStrategies;
	if (anchorsonly) {
		effectiveStrategies = [feedFinder.checkAllAnchors];
	} else {
		effectiveStrategies = searchStrategies;
	}

	let foundFeeds = false;
	let totalFeeds = [];

	for (const strategy of effectiveStrategies) {
		const feeds = await strategy.call(feedFinder);
		if (feeds && feeds.length > 0) {
			totalFeeds = totalFeeds.concat(feeds);
			foundFeeds = true;

			// Check if we've reached the maximum number of feeds
			if (!all && options.maxFeeds > 0 && totalFeeds.length >= options.maxFeeds) {
				// Trim the feeds to the maxFeeds limit
				totalFeeds = totalFeeds.slice(0, options.maxFeeds);
				break;
			}
		}
		// If not in 'all' mode and we've reached maxFeeds, stop
		if (!all && options.maxFeeds > 0 && totalFeeds.length >= options.maxFeeds) {
			break;
		}
	}

	return { foundFeeds, totalFeeds };
}

/**
 * Handles deep search execution
 * @param {FeedScout} feedFinder - The FeedScout instance
 * @param {object} options - Search options
 * @param {Array} totalFeeds - Accumulated feeds from previous searches
 * @param {boolean} foundFeeds - Whether feeds were found in previous searches
 * @returns {Promise<void>}
 */
async function handleDeepSearch(feedFinder, options, totalFeeds, foundFeeds) {
	const { deepsearch } = options;

	if (deepsearch) {
		await handleDeepSearchExecution(feedFinder, options, totalFeeds);
	} else {
		handleNoDeepSearch(totalFeeds, foundFeeds);
	}
}

/**
 * Executes deep search with maxFeeds handling
 * @param {FeedScout} feedFinder - The FeedScout instance
 * @param {object} options - Search options
 * @returns {Promise<Array>} Deep search results
 */
async function executeDeepSearch(feedFinder) {
	const deepFeeds = await feedFinder.deepSearch();
	return deepFeeds || [];
}

/**
 * Applies maxFeeds limit to combined feeds
 * @param {Array} totalFeeds - Accumulated feeds
 * @param {Array} deepFeeds - New deep search feeds
 * @param {object} options - Search options
 * @returns {Array} Combined feeds with maxFeeds limit applied
 */
function applyMaxFeedsLimit(totalFeeds, deepFeeds, options) {
	let combinedFeeds = totalFeeds.concat(deepFeeds);

	// Check if we've exceeded maxFeeds
	if (options.maxFeeds > 0 && combinedFeeds.length > options.maxFeeds) {
		combinedFeeds = combinedFeeds.slice(0, options.maxFeeds);
	}

	return combinedFeeds;
}

/**
 * Handles case when deep search should be executed
 * @param {FeedScout} feedFinder - The FeedScout instance
 * @param {object} options - Search options
 * @param {Array} totalFeeds - Accumulated feeds from previous searches
 * @returns {Promise<void>}
 */
async function handleDeepSearchExecution(feedFinder, options, totalFeeds) {
	// Check if we should proceed with deep search based on maxFeeds
	if (options.maxFeeds <= 0 || totalFeeds.length < options.maxFeeds) {
		const deepFeeds = await executeDeepSearch(feedFinder);

		if (deepFeeds.length > 0) {
			const updatedFeeds = applyMaxFeedsLimit(totalFeeds, deepFeeds, options);
			end({ feeds: updatedFeeds, module: 'all' });
			return;
		}
	}

	// If no new feeds were found or maxFeeds already reached
	end({ feeds: totalFeeds, module: 'all' });
}

/**
 * Handles case when no deep search is needed
 * @param {Array} totalFeeds - Accumulated feeds from previous searches
 * @param {boolean} foundFeeds - Whether feeds were found in previous searches
 * @returns {void}
 */
function handleNoDeepSearch(totalFeeds, foundFeeds) {
	// If we collected any feeds during the non-deepsearch phases, return them
	if (totalFeeds.length > 0) {
		end({ feeds: totalFeeds, module: 'all' });
		// If we're at the end of all searches and no feeds were found, show suggestion
		if (!foundFeeds) {
			showDeepSearchSuggestionIfNeeded();
		}
	}
}

/**
 * Main function to get feeds from a site using various search strategies
 * @param {string} site - The website URL to search for feeds
 * @param {object} options - Options for the search (e.g., metasearch, blindsearch, deepsearch)
 */
async function getFeeds(site, options) {
	// Store the options globally so we can access them in the end function
	currentOptions = options;

	// Add https:// if no protocol is specified
	if (!site.includes('://')) {
		site = `https://${site}`;
	}

	const feedFinder = initializeFeedFinder(site, options);

	// Handle exclusive search options
	const isExclusiveSearch = await handleExclusiveSearch(feedFinder, options);
	if (isExclusiveSearch) {
		return;
	}

	// Execute standard search
	const { foundFeeds, totalFeeds } = await executeStandardSearch(feedFinder, options);

	// Handle deep search if enabled
	// Skip deep search if anchorsonly is specified
	if (!options.anchorsonly) {
		await handleDeepSearch(feedFinder, options, totalFeeds, foundFeeds);
	} else {
		// If only anchor search is specified, we end after anchor search
		end({ feeds: totalFeeds, module: 'anchors' });
	}
}
