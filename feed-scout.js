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
function foundFeed(feeds) {
	return feeds !== undefined && feeds.length > 0;
}

// ---------------------------------------------------------------------------------------

export default class FeedScout extends EventEmitter {
	constructor(site, options) {
		super();
		// Add https:// if no protocol is specified
		if (!site.match(/^https?:\/\//)) {
			site = `https://${site}`;
		}
		this.site = new URL(site).href; // normalize site link
		this.options = options;
		this.initPromise = null; // Store the initialization promise
	}

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

	async metaLinks() {
		await this.initialize();
		return metaLinks(this);
	}

	async checkAllAnchors() {
		await this.initialize();
		return checkAllAnchors(this);
	}

	async blindSearch() {
		await this.initialize();
		return blindSearch(this);
	}

	async deepSearch() {
		await this.initialize();
		const crawler = deepSearch(this.site, this.options, this);
		return crawler;
	}
} // class
