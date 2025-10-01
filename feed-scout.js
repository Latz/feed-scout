#!/usr/bin/env node

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
 * Checks if any feeds were found
 * @param {Array} feeds - Array of feeds to check
 * @returns {boolean} True if feeds exist and have a length greater than 0, false otherwise
 */
function foundFeed(feeds) {
	return feeds !== undefined && feeds.length > 0;
}

// ---------------------------------------------------------------------------------------

export default class FeedScout extends EventEmitter {
	/**
	 * Creates a new FeedScout instance
	 * @param {string} site - The website URL to search for feeds
	 * @param {object} options - Options for the search (optional)
	 */
	constructor(site, options) {
		super();
		// Add https:// if no protocol is specified
		if (!site.includes('://')) {
			site = `https://${site}`;
		}
		this.site = new URL(site).href; // normalize site link
		this.options = options;
		this.initPromise = null; // Store the initialization promise
	}

	/**
	 * Initializes the FeedScout instance by fetching the site content
	 * @returns {Promise} A promise that resolves when the initialization is complete
	 */
	async initialize() {
		if (this.initPromise === null) {
			this.initPromise = (async () => {
				try {
					const response = await fetchWithTimeout(this.site);
					if (!response) {
						this.emit('error', `Failed to fetch ${this.site}`);
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
					this.emit(`Error fetching ${this.site}:`, error);
					this.content = '';
					this.document = { querySelectorAll: () => [] };
					this.emit('initialized');
				}
			})();
		}

		return this.initPromise;
	} // initialize

	/**
	 * Searches for feeds using meta links in the page
	 * @returns {Promise<Array>} A promise that resolves to an array of found feeds
	 */
	async metaLinks() {
		await this.initialize();
		return metaLinks(this);
	}

	/**
	 * Searches for feeds by checking all anchor links on the page
	 * @returns {Promise<Array>} A promise that resolves to an array of found feeds
	 */
	async checkAllAnchors() {
		await this.initialize();
		return checkAllAnchors(this);
	}

	/**
	 * Performs a blind search for common feed endpoints
	 * @returns {Promise<Array>} A promise that resolves to an array of found feeds
	 */
	async blindSearch() {
		await this.initialize();
		return blindSearch(this);
	}

	/**
	 * Performs a deep search by crawling the website
	 * @returns {Promise<Array>} A promise that resolves to an array of found feeds
	 */
	async deepSearch() {
		await this.initialize();
		const crawler = deepSearch(this.site, this, this.options);
		return crawler;
	}
} // class
