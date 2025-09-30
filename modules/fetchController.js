import fetchWithTimeout from './fetchWithTimeout.js';

export default class FetchController {
	constructor(timeout = 5000) {
		this.timeout = timeout;
	}

	async fetch(url, options = {}) {
		try {
			const response = await fetchWithTimeout(url, this.timeout, {
				...options
			});
			if (!response) {
				throw new Error(`Failed to fetch ${url}`);
			}
			return response;
		} catch (error) {
			console.error(`Error fetching ${url}:`, error);
			throw error;
		}
	}
}
