import { Command } from 'commander';
import chalk from 'chalk';
import { createRequire } from 'module';
import validateUrl from 'isurl-module';
import normalizeUrl from 'normalize-url';
import UltimateFeedFinder from './uff.js';

const program = new Command();
program.name(`uff`).description('The ultimate way to find any feed of a site.');

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
	.argument('<site>')
	.option('-m, --metasearch', 'Meta search only')
	.option('-b, --blindsearch', 'Blind search only')
	.option('-d, --deepsearch', 'enable deep search')
	.option('--depth <number>', 'Depth of deep search, default 3 ', 3)
	.option('-a, --all', 'Use all search methods')
	.description('Find feeds for site')
	.action((site, options) => {
		getFeeds(site, options);
	});

program.parse();

// ---------------------------------------------------------------------------------------
function log(data) {
	// display url if deep searching
	if (data.module == 'deepSearch') {
		if (!data.error) {
			process.stdout.write(`[${data.depth}] ${data.url}`);
			if (data.feedCheck.isFeed) process.stdout.write(chalk.green(` [feed]\n`));
			process.stdout.write(` ❌\n`);
		} else {
			process.stdout.write(chalk.red(`Error: ${data.url} ${data.error}\n`));
		}
	} else process.stdout.write('.');
}

function start(data) {
	process.stdout.write(`Start ${data.niceName} `);
}

function end(data) {
	process.stdout.write(' ');
	if (data.feeds.length == 0) {
		process.stdout.write(chalk.red(`No feeds found\n`));
		if (data.module == 'deepSearch') process.stdout.write(`visited ${data.visitedUrls} pages\n`);
	} else {
		process.stdout.write(chalk.green(`${data.feeds.length} ${data.feeds.length > 1 ? 'feeds' : 'feed'} found\n`));
		if (data.module == 'deepSearch') process.stdout.write(`visited ${data.visitedUrls} pages\n`);
		process.stdout.write(`${JSON.stringify(data.feeds, null, 2)}\n`);
		process.exit(0);
	}
}
function error(data) {
	console.error(chalk.red(`Error: ${data.error}\n`));
	process.exit(1);
}
// --------------------------------------------------------------------------------------

async function getFeeds(site, options) {
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
		return;
	}
	if (blindsearch) {
		await feedFinder.blindsearch();
		return;
	}
	if (deepsearch) {
		await feedFinder.deepSearch();
		return;
	}

	const searchStrategies = [
		feedFinder.metaLinks,
		feedFinder.checkAllAnchors,
		feedFinder.blindsearch,
		feedFinder.deepSearch,
	];

	// For `--all`, we want to run all strategies.
	// For the default case, we stop after the first success.
	for (const strategy of searchStrategies) {
		const feeds = await strategy.call(feedFinder);
		// If not in 'all' mode, and feeds are found, we can stop.
		// The `end` event handler will exit the process. This return is for flow control.
		if (!all && feeds?.length > 0) {
			return;
		}
	}

	// feedFinder.dispose(); // remove all listeners
	// The final console.log is not needed as the `end` event handles output.
}
