#!/usr/bin/env node

/**
 * @fileoverview FeedScout - A comprehensive RSS, Atom, and JSON feed discovery tool
 *
 * This module provides the main FeedScout class for discovering feeds on websites
 * through multiple search strategies including meta links, anchor analysis,
 * blind search, and deep crawling.
 *
 * @module FeedScout
 * @version 1.0.0
 * @author latz
 * @since 1.0.0
 */

import { parseHTML } from 'linkedom';
import metaLinks from './modules/metaLinks.js';
import checkAllAnchors from './modules/anchors.js';
import blindSearch from './modules/blindsearch.js';
import deepSearch from './modules/deepSearch.js';
import EventEmitter from './modules/eventEmitter.js';
import fetchWithTimeout from './modules/fetchWithTimeout.js';
// TODO: Get version from package.json

// ---------------------------------------------------------------------------------------
/**
 * Checks if any feeds were found in the provided array
 * @param {Array<object>} feeds - Array of feed objects to check
 * @returns {boolean} True if feeds exist and have a length greater than 0, false otherwise
 * @example
 * const feeds = [{ url: 'https://example.com/feed.xml', type: 'rss' }];
 * console.log(foundFeed(feeds)); // true
 */
function foundFeed(feeds) {
	return feeds !== undefined && feeds.length > 0;
}

// ---------------------------------------------------------------------------------------

/**
 * Main FeedScout class for discovering RSS, Atom, and JSON feeds on websites
 *
 * @class FeedScout
 * @extends EventEmitter
 * @example
 * const scout = new FeedScout('https://example.com', { maxFeeds: 10 });
 * scout.on('start', (data) => console.log('Started:', data.niceName));
 * scout.on('end', (data) => console.log('Found feeds:', data.feeds));
 *
 * const feeds = await scout.metaLinks();
 * console.log('Meta link feeds:', feeds);
 */
export default class FeedScout extends EventEmitter {
	/**
	 * Creates a new FeedScout instance
	 * @param {string} site - The website URL to search for feeds (protocol optional, defaults to https://)
	 * @param {object} [options={}] - Configuration options for the search
	 * @param {number} [options.maxFeeds=0] - Maximum number of feeds to find (0 = no limit)
	 * @param {number} [options.timeout=5] - Request timeout in seconds
	 * @param {number} [options.depth=3] - Maximum crawling depth for deep search
	 * @param {number} [options.maxLinks=1000] - Maximum links to process in deep search
	 * @param {boolean} [options.all=false] - Whether to find all feeds or stop after finding one of each type
	 * @param {boolean} [options.keepQueryParams=false] - Whether to preserve query parameters in URLs
	 * @param {boolean} [options.checkForeignFeeds=false] - Whether to check feeds on foreign domains
	 * @param {boolean} [options.showErrors=false] - Whether to emit error events
	 * @throws {TypeError} When site parameter is not provided or invalid
	 * @example
	 * // Basic usage
	 * const scout = new FeedScout('example.com');
	 *
	 * // With options
	 * const scout = new FeedScout('https://blog.example.com', {
	 *   maxFeeds: 5,
	 *   timeout: 10,
	 *   all: true
	 * });
	 */
	constructor(site, options = {}) {
		super();
		// Add https:// if no protocol is specified
		if (!site.includes('://')) {
			site = `https://${site}`;
		}
		const urlObj = new URL(site);
		// Normalize site link but remove trailing slash for root paths to prevent duplicate checks in path traversal
		// For example: https://example.com/ should become https://example.com to avoid checking endpoints twice
		this.site = urlObj.pathname === '/' ? urlObj.origin : urlObj.href;
		this.options = options;
		this.initPromise = null; // Store the initialization promise
	}

	/**
	 * Initializes the FeedScout instance by fetching the site content and parsing the HTML
	 * This method is called automatically by other methods and caches the result
	 * @returns {Promise<void>} A promise that resolves when the initialization is complete
	 * @throws {Error} When the site cannot be fetched or parsed
	 * @private
	 * @example
	 * await scout.initialize(); // Usually called automatically
	 */
	async initialize() {
		if (this.initPromise === null) {
			this.initPromise = (async () => {
				try {
					const response = await fetchWithTimeout(this.site, this.options.timeout * 1000);

					if (!response.ok) {
						this.emit('error', {
							module: 'FeedScout',
							error: `HTTP error while fetching ${this.site}: ${response.status} ${response.statusText}`,
						});
						this.content = '';
						this.document = { querySelectorAll: () => [] };
						this.emit('initialized');
						return;
					}

					this.content = await response.text();
					const { document } = parseHTML(this.content);
					this.document = document;

					this.emit('initialized');
				} catch (error) {
					let errorMessage = `Failed to fetch ${this.site}`;
					if (error.name === 'AbortError') {
						errorMessage += ': Request timed out';
					} else {
						errorMessage += `: ${error.message}`;
						if (error.cause) {
							errorMessage += ` (cause: ${error.cause.code || error.cause.message})`;
						}
					}

					this.emit('error', {
						module: 'FeedScout',
						error: errorMessage,
						cause: error.cause,
					});

					this.content = '';
					this.document = { querySelectorAll: () => [] };
					this.emit('initialized');
				}
			})();
		}

		return this.initPromise;
	} // initialize

	/**
	 * Searches for feeds using meta links in the page (link tags in head)
	 * This method looks for <link> elements with feed-related type attributes
	 * @returns {Promise<Array<object>>} A promise that resolves to an array of found feed objects
	 * @throws {Error} When initialization fails or network errors occur
	 * @example
	 * const feeds = await scout.metaLinks();
	 * console.log(feeds); // [{ url: '...', title: '...', type: 'rss' }]
	 */
	async metaLinks() {
		await this.initialize();
		return metaLinks(this);
	}

	/**
	 * Searches for feeds by checking all anchor links on the page
	 * This method analyzes all <a> elements for potential feed URLs
	 * @returns {Promise<Array<object>>} A promise that resolves to an array of found feed objects
	 * @throws {Error} When initialization fails or network errors occur
	 * @example
	 * const feeds = await scout.checkAllAnchors();
	 * console.log(feeds); // [{ url: '...', title: '...', type: 'atom' }]
	 */
	async checkAllAnchors() {
		await this.initialize();
		return checkAllAnchors(this);
	}

	/**
	 * Performs a blind search for common feed endpoints
	 * This method tries common feed paths like /feed, /rss, /atom.xml, etc.
	 * @returns {Promise<Array<object>>} A promise that resolves to an array of found feed objects
	 * @throws {Error} When network errors occur during endpoint testing
	 * @example
	 * const feeds = await scout.blindSearch();
	 * console.log(feeds); // [{ url: '...', feedType: 'rss', title: '...' }]
	 */
	async blindSearch() {
		await this.initialize();
		return blindSearch(this);
	}

	/**
	 * Performs a deep search by crawling the website
	 * This method recursively crawls pages to find feeds, respecting depth and link limits
	 * @returns {Promise<Array<object>>} A promise that resolves to an array of found feed objects
	 * @throws {Error} When network errors occur during crawling
	 * @example
	 * const feeds = await scout.deepSearch();
	 * console.log(feeds); // [{ url: '...', type: 'json', title: '...' }]
	 */
	async deepSearch() {
		await this.initialize();
		const crawler = deepSearch(this.site, this.options, this);
		return crawler;
	}
} // class
