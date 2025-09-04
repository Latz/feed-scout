import { Command } from 'commander';
import chalk from 'chalk';
import { createRequire } from 'module';
import validateUrl from 'isurl-module';
import normalizeUrl from 'normalize-url';
import UltimateFeedFinder from './uff.js';
import banner from './banner.js';

// Display ASCII banner
console.log(chalk.blue.bold(banner));

// Store the options globally so we can access them in the end function
let currentOptions = {};
// Flag to track if we've already shown the deepsearch suggestion
let hasShownDeepSearchSuggestion = false;

const program = new Command();
program.name(`node uff-cli.js`).description('The ultimate way to find any feed of a site.');

// global options
program.option('-v, --verbose <level>', 'Verbose output');

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
	.option('--timeout <seconds>', 'Timeout for fetch requests in seconds', 5)
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
function log(data) {
	// display url if deep searching
	if (data.module == 'deepSearch') {
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
	} 
	// Display progress for blindsearch
	else if (data.module == 'blindsearch') {
		if (data.url) {
			// Show visited site
			if (data.visited) {
				process.stdout.write(chalk.green(`✓ ${data.url}\n`));
			} 
			// Show unvisited site
			else {
				process.stdout.write(chalk.gray(`○ ${data.url}\n`));
			}
		} else {
			// For other blindsearch progress, show dots
			process.stdout.write('.');
		}
	} else {
		// For other modules, show progress dots
		process.stdout.write('.');
	}
}

function start(data) {
	process.stdout.write(`Start ${data.niceName} `);
}

function end(data) {
	process.stdout.write(' ');

	// Handle case when no feeds are found
	if (data.feeds.length === 0) {
		process.stdout.write(chalk.red(`No feeds found\n`));

		// Show additional info for deep search
		if (data.module === 'deepSearch') {
			process.stdout.write(`visited ${data.visitedUrls} pages\n`);
		}
		
		// Show additional info for blindsearch
		if (data.module === 'blindsearch' && data.totalUrls) {
			process.stdout.write(`checked ${data.totalUrls} potential feed URLs\n`);
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
	
	// Show additional info for blindsearch
	if (data.module === 'blindsearch' && data.totalUrls) {
		process.stdout.write(`checked ${data.totalUrls} potential feed URLs\n`);
	}

	// Output the feeds in a formatted JSON
	process.stdout.write(`${JSON.stringify(data.feeds, null, 2)}\n`);

	// Exit successfully
	process.exit(0);
}
function error(data) {
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
		process.stdout.write(`${chalk.yellow('  node uff-cli -d <site>')}\n`);
	}
}

// --------------------------------------------------------------------------------------

async function getFeeds(site, options) {
	// Store the options globally so we can access them in the end function
	currentOptions = options;

	const feedFinder = new UltimateFeedFinder(site, options);
	feedFinder.on('start', start);
	feedFinder.on('initialized', () => process.stdout.write(chalk.blue(' Initialized\n')));
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
		await feedFinder.blindsearch();
		showDeepSearchSuggestionIfNeeded();
		return;
	}

	// If not using exclusive options, run the standard search strategies
	const searchStrategies = [feedFinder.metaLinks, feedFinder.checkAllAnchors, feedFinder.blindsearch];

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
