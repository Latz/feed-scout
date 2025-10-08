/**
 * @fileoverview Feed Scout CLI - Command-line interface for the Feed Scout feed discovery tool
 *
 * This module provides a comprehensive command-line interface for discovering RSS, Atom,
 * and JSON feeds on websites. It supports multiple search strategies and provides
 * colorful, interactive output with progress indicators.
 *
 * @module FeedScoutCLI
 * @version 1.0.0
 * @author latz
 * @since 1.0.0
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createRequire } from 'module';
import FeedScout from './feed-scout.js';
import banner from './modules/banner.js';

/**
 * Displays the Feed Scout banner with a gradient color effect
 * Creates a blue-to-red gradient overlay on the existing colored banner
 * @function displayGradientBanner
 * @returns {void}
 * @example
 * displayGradientBanner(); // Shows colorful banner in terminal
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
		// Preserve empty lines without color processing
		if (line.trim() === '') {
			coloredText += line + '\n';
			return;
		}

		// Calculate color interpolation ratio for this line
		// Uses (nonEmptyLines - 1) as denominator to ensure the last line gets ratio = 1.0
		// This creates a smooth gradient from first line (ratio = 0) to last line (ratio = 1)
		// Example: with 3 lines, ratios will be 0, 0.5, 1.0
		const ratio = nonEmptyLines > 1 ? nonEmptyIndex / (nonEmptyLines - 1) : 0;

		// Linear interpolation formula: start + ratio * (end - start)
		// This creates a smooth transition between startColor and endColor
		// Math.round() ensures we get integer RGB values (0-255)
		const r = Math.round(startColor.r + ratio * (endColor.r - startColor.r));
		const g = Math.round(startColor.g + ratio * (endColor.g - startColor.g));
		const b = Math.round(startColor.b + ratio * (endColor.b - startColor.b));

		// Apply the calculated RGB color to the entire line using chalk's 24-bit color support
		coloredText += chalk.rgb(r, g, b)(line) + '\n';
		nonEmptyIndex++; // Increment counter for next non-empty line
	});

	console.log(coloredText);
}

let currentOptions = {};
// Flag to track if we've already shown the deepsearch suggestion
let hasShownDeepSearchSuggestion = false;

// Trackers for visited and unvisited sites
let visitedCount = 0;
let unvisitedCount = 0;
let progressLineActive = false;
let blindsearchStartTime = 0;

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
const logHandlers = {
	deepSearch: handleDeepSearchLog,
	blindsearch: handleBlindSearchLog,
	anchors: handleAnchorsLog,
	default: () => process.stdout.write('.'),
};

function log(data) {
	const handler = logHandlers[data.module] || logHandlers.default;
	handler(data);
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
		// For anchors module, prefer filteredCount if available
		if (data.module === 'anchors' && data.filteredCount !== undefined) {
			unvisitedCount = data.filteredCount;
		} else {
			unvisitedCount = data.totalCount;
		}
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
	// When not in deepsearch-only mode, ignore intermediate end events from individual modules
	if (!currentOptions.deepsearchOnly && data.module !== 'all') {
		return;
	}

	// Add newline after progress display
	if (progressLineActive) {
		process.stdout.write('\n');
		progressLineActive = false;
	}

	// Show cursor again after blindsearch and anchors
	if (data.module === 'blindsearch' || data.module === 'anchors' || data.module === 'checkAllAnchors') {
		process.stdout.write('\x1B[?25h'); // Show cursor
	}

	// Add a newline after meta links search is done
	if (data.module === 'metalinks') {
		process.stdout.write('\n');
	}

	// Determine the module name for the finished message
	let moduleName = '';
	if (data.module === 'blindsearch') {
		moduleName = 'Blind search';
	} else if (data.module === 'anchors' || data.module === 'checkAllAnchors') {
		moduleName = 'Check all anchors';
	} else if (data.module === 'deepSearch') {
		moduleName = 'Deep search';
	} else if (data.module === 'metalinks') {
		moduleName = 'Meta links';
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
 * Handles error events and displays error messages with detailed explanations
 * @param {object} data - The error data object containing module, error, explanation, and suggestion
 */
function error(data) {
	// Show cursor if hidden due to blindsearch and anchors
	if (data.module === 'blindsearch' || data.module === 'anchors' || data.module === 'checkAllAnchors') {
		process.stdout.write('\x1B?25h'); // Show cursor
	}

	// Display the main error message
	if (data.error) {
		// If the error is the specific fetch error, stop the search
		if (data.error.includes('Failed to fetch https://www.icelandreview.com')) {
			console.error(chalk.red(`\n❌ ${data.error}`));
			if (data.cause) {
				console.error(chalk.yellow(`   Error Code: ${data.cause.code}`));
				console.error(chalk.yellow(`   Details: ${data.cause.message}`));
			}
			console.error(chalk.yellow('Stopping search due to fetch error.'));
			process.exit(1);
		}

		console.error(chalk.red(`\n❌ Error: ${data.error}`));

		// Add CLI-specific explanations for common HTTP errors
		if (data.error.includes('HTTP 403 Forbidden')) {
			console.error(
				chalk.yellow(
					`💡 Explanation: The server is refusing access to the requested resource. This typically occurs when:`
				)
			);
			console.error(chalk.yellow(`   • The website blocks automated requests or crawlers`));
			console.error(chalk.yellow(`   • Rate limiting is in effect due to too many requests`));
			console.error(chalk.yellow(`   • The server requires authentication or special headers`));
			console.error(chalk.yellow(`   • The website has anti-bot protection (Cloudflare, etc.)`));
			console.error(
				chalk.cyan(
					`🔧 Suggestion: Try accessing the URL in a browser to verify it works. Some websites block automated tools like Feed Scout to prevent scraping.`
				)
			);
		} else {
			// Display explanation if provided by modules
			if (data.explanation) {
				console.error(chalk.yellow(`💡 Explanation: ${data.explanation}`));
			}

			// Display suggestion if provided by modules
			if (data.suggestion) {
				console.error(chalk.cyan(`🔧 Suggestion: ${data.suggestion}`));
			}
		}

		// Add spacing after error details
		console.error('');
	} else if (data.module) {
		console.error(chalk.red(`\n❌ Error in ${data.module}: ${data.message || 'An error occurred'}`));
		console.error('');
	} else {
		console.error(chalk.red(`\n❌ Error: ${JSON.stringify(data)}`));
		console.error('');
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

	// Use the same end handler for all searches
	feedFinder.on('end', end);

	return feedFinder;
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
	await feedFinder.startSearch();
}

/**
 * Main function to set up and run the CLI.
 * @param {Array<string>} argv - The command-line arguments.
 */
export async function run(argv) {
	displayGradientBanner();
	const program = new Command();
	program.name(`feed-scout`).description('Find RSS, Atom, and JSON feeds on any website with Feed Scout.');

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
		.option('--deepsearch-only', 'Deep search only')
		.option('--depth <number>', 'Depth of deep search', 3)
		.option('--max-links <number>', 'Maximum number of links to process during deep search', 1000)
		.option('--timeout <seconds>', 'Timeout for fetch requests in seconds', 5)
		.option('--keep-query-params', 'Keep query parameters from the original URL when searching')
		.option('--check-foreign-feeds', "Check if foreign domain URLs are feeds (but don't crawl them)")
		.option('--max-errors <number>', 'Stop after a certain number of errors', 5)
		.option('--max-feeds <number>', 'Stop search after finding a certain number of feeds', 0)
		.description('Find feeds for site')
		.action(async (site, options) => {
			if (!site) {
				program.help();
			} else {
				await getFeeds(site, options);
			}
		});

	await program.parseAsync(argv);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
	run(process.argv);
}
