import { Command } from 'commander';
import chalk from 'chalk';
import { createRequire } from 'module';
import FeedScout from './feed-scout.js';
import banner from './modules/banner.js';

// Display ASCII banner with character-level rainbow colors
function displayCharacterRainbowBanner() {
  const lines = banner.split('\n');
  const colors = ['red', 'yellow', 'green', 'blue', 'magenta', 'cyan', 'white', 'gray'];
  let colorIndex = 0;
  
  for (const line of lines) {
    let coloredLine = '';
    for (const char of line) {
      const color = colors[colorIndex % colors.length];
      coloredLine += chalk[color](char);
      colorIndex++;
    }
    process.stdout.write(coloredLine + '\n');
  }
}

displayCharacterRainbowBanner();
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
	.option('-d, --deepsearch', 'Enable deep search')
	.option('--depth <number>', 'Depth of deep search', 3)
	.option('--max-links <number>', 'Maximum number of links to process during deep search', 1000)
	.option('--timeout <seconds>', 'Timeout for fetch requests in seconds', 5)
	.option('--keep-query-params', 'Keep query parameters from the original URL when searching')
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
		// Handle max links message
		if (data.message) {
			process.stdout.write(chalk.yellow(`\n${data.message}\n`));
			return;
		}

		if (data.error) {
			process.stdout.write(chalk.red(`Error: ${data.url} ${data.error}\n`));
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
	} else {
		// For other modules, show progress as visited/total count
		if (data.module === 'blindsearch') {
			// Handle totalCount parameter
			if (data.totalCount) {
				unvisitedCount = data.totalCount;
				blindsearchStartTime = Date.now(); // Record start time
				return;
			}

			// Update counters
			if (data.url) {
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

			// Create new display showing "Started Blindsearch (visited urls/total urls) ETA"
			const displayText = `Started Blindsearch (${visitedCount}/${unvisitedCount}) ${etaFormatted}`;
			process.stdout.write(displayText);
		}
	}
}

function start(data) {
	// Reset counters when starting a new search
	visitedCount = 0;
	unvisitedCount = 0;
	progressLineActive = false;
	blindsearchStartTime = 0;

	// Hide cursor for blindsearch
	if (data.niceName === 'Blind search') {
		process.stdout.write('\x1B[?25l'); // Hide cursor
	}

	process.stdout.write(`Start ${data.niceName} `);
}

function end(data) {
	// Add newline after progress display
	if (progressLineActive) {
		process.stdout.write('\n');
		progressLineActive = false;
	}

	// Show cursor again after blindsearch
	if (data.module === 'blindsearch') {
		process.stdout.write('\x1B[?25h'); // Show cursor
	}

	// Handle case when no feeds are found
	if (data.feeds.length === 0) {
		process.stdout.write(chalk.red(`No feeds found\n`));

		// Show additional info for deep search
		if (data.module === 'deepSearch') {
			process.stdout.write(`visited ${data.visitedUrls} pages\n`);
		}

		return;
	}

	// Handle case when feeds are found
	const feedCount = data.feeds.length;
	const feedWord = feedCount === 1 ? 'feed' : 'feeds';
	process.stdout.write(chalk.green(`${feedCount} ${feedWord} found\n`));

	// Show additional info for deep search
	if (data.module === 'deepSearch') {
		process.stdout.write(`visited ${data.visitedUrls} pages\n`);
	}

	// Output the feeds in a formatted JSON
	process.stdout.write(`${JSON.stringify(data.feeds, null, 2)}\n`);

	// Exit successfully
	process.exit(0);
}
function error(data) {
	// Show cursor if hidden due to blindsearch
	if (data.module === 'blindsearch') {
		process.stdout.write('\x1B[?25h'); // Show cursor
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

async function getFeeds(site, options) {
	// Store the options globally so we can access them in the end function
	currentOptions = options;

	const feedFinder = new FeedScout(site, options);
	feedFinder.on('start', start);
	feedFinder.on('initialized', () => process.stdout.write(chalk.blue('\nInitialized\n\n')));
	feedFinder.on('log', log);
	feedFinder.on('end', end);
	feedFinder.on('error', error);

	const { metasearch, blindsearch, deepsearch, all } = options;

	// Handle exclusive search options
	if (metasearch) {
		await feedFinder.metaLinks();
		showDeepSearchSuggestionIfNeeded();
		return;
	}
	if (blindsearch) {
		await feedFinder.blindSearch();
		showDeepSearchSuggestionIfNeeded();
		return;
	}

	// If not using exclusive options, run the standard search strategies
	const searchStrategies = [feedFinder.metaLinks, feedFinder.checkAllAnchors, feedFinder.blindSearch];

	// For `--all`, we want to run all strategies.
	// For the default case, we stop after the first success.
	let foundFeeds = false;
	for (const strategy of searchStrategies) {
		const feeds = await strategy.call(feedFinder);
		// If not in 'all' mode, and feeds are found, we can stop.
		if (!all && feeds?.length > 0) {
			foundFeeds = true;
			break;
		}
	}

	// If deepsearch is enabled, run it after the other strategies
	if (deepsearch) {
		await feedFinder.deepSearch();
		return;
	}

	// If we're at the end of all searches and no feeds were found, show suggestion
	if (!foundFeeds) {
		showDeepSearchSuggestionIfNeeded();
	}
}
