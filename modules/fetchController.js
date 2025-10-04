import fetchWithTimeout from './fetchWithTimeout.js';

/**
 * A controller class for making fetch requests with timeout
 */
export default class FetchController {
	/**
	 * Creates a new FetchController instance
	 * @param {number} timeout - Timeout in milliseconds for requests (default: 5000)
	 */
	constructor(timeout = 5000) {
		this.timeout = timeout;
	}

	/**
	 * Fetches a URL with the specified timeout
	 * @param {string} url - The URL to fetch
	 * @param {object} options - Additional fetch options (optional)
	 * @returns {Promise<Response>} A promise that resolves to the fetch response
	 * @throws {Error} If the fetch fails
	 */
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
