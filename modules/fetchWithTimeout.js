/**
 * @fileoverview fetchWithTimeout - HTTP fetch utility with timeout support
 *
 * This module provides a fetch wrapper that adds timeout functionality to prevent
 * hanging requests. It uses AbortController for clean cancellation and provides
 * detailed error messages for different failure scenarios.
 *
 * @module fetchWithTimeout
 * @version 1.0.0
 * @author latz
 * @since 1.0.0
 */

/**
 * Fetches a URL with a configurable timeout
 * Uses AbortController to cleanly cancel requests that exceed the timeout
 * @param {string} url - The URL to fetch (must be a valid HTTP/HTTPS URL)
 * @param {number} [timeout=5000] - Timeout in milliseconds (default: 5000)
 * @returns {Promise<Response|null>} The fetch response or null if timeout/error occurs
 * @throws {Error} When the request times out or network errors occur
 * @example
 * // Basic usage with default timeout
 * const response = await fetchWithTimeout('https://example.com');
 *
 * // Custom timeout (10 seconds)
 * const response = await fetchWithTimeout('https://slow-site.com', 10000);
 *
 * // Handle timeout gracefully
 * const response = await fetchWithTimeout('https://example.com', 1000);
 * if (response) {
 *   const data = await response.text();
 * } else {
 *   console.log('Request failed or timed out');
 * }
 */
export default async function fetchWithTimeout(url, timeout = 5000) {
	const controller = new AbortController();
	const signal = controller.signal;
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	// Add browser-like headers to avoid being blocked by Cloudflare
	const headers = {
		'User-Agent':
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
		Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
		'Accept-Language': 'en-US,en;q=0.5',
		'Accept-Encoding': 'gzip, deflate, br',
		Connection: 'keep-alive',
		'Upgrade-Insecure-Requests': '1',
		'Sec-Fetch-Dest': 'document',
		'Sec-Fetch-Mode': 'navigate',
		'Sec-Fetch-Site': 'none',
		'Cache-Control': 'max-age=0',
	};

	try {
		const response = await fetch(url, {
			signal,
			headers,
		});
		clearTimeout(timeoutId);
		return response;
	} catch (error) {
		clearTimeout(timeoutId);
		// Re-throw the error to allow the caller to handle it and get more details
		throw error;
	}
}
