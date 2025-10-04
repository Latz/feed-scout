/**
 * @fileoverview common - Shared utility functions for URL validation and processing
 *
 * This module provides common utility functions used across the Feed Scout application
 * for URL validation, cleaning, and processing. These functions ensure consistent
 * URL handling throughout the application.
 *
 * @module common
 * @version 1.0.0
 * @author latz
 * @since 1.0.0
 */

import truncateUrl from 'truncate-url';

/**
 * Extracts the main domain from a URL, removing subdomains like 'www'
 * Handles complex domain structures and returns the primary domain
 * @param {string} url - The URL to extract the main domain from (must be valid URL)
 * @returns {string} The main domain (e.g., 'example.com' from 'www.example.com')
 * @throws {TypeError} When URL is invalid or cannot be parsed
 * @example
 * console.log(getMainDomain('https://www.example.com')); // 'example.com'
 * console.log(getMainDomain('https://blog.subdomain.example.co.uk')); // 'example.co.uk'
 * console.log(getMainDomain('https://example.org/path')); // 'example.org'
 */
export function getMainDomain(url) {
	const urlObject = new URL(url);
	const parts = urlObject.hostname.split('.');
	const length = parts.length;

	if (length <= 2) return urlObject.hostname;

	// Handle cases like .co.uk, .com.br
	if (parts[length - 2].length <= 3 && parts[length - 1].length <= 3) {
		return parts.slice(-3).join('.');
	}

	return parts.slice(-2).join('.');
}

/**
 * Intelligently truncates a URL while preserving the domain and important path information
 * Uses smart truncation that prioritizes domain visibility and meaningful path segments
 * @param {string} url - The URL to truncate (must be a valid URL)
 * @param {number} [maxLength=50] - Maximum length of the truncated URL
 * @returns {string} The truncated URL with ellipsis if shortened
 * @throws {Error} When URL is invalid or cannot be parsed
 * @example
 * const long = 'https://example.com/very/long/path/to/resource.html';
 * console.log(smartTruncateUrl(long, 30)); // 'https://example.com/very/lo...'
 *
 * const short = 'https://example.com/feed';
 * console.log(smartTruncateUrl(short, 50)); // 'https://example.com/feed'
 */
export function smartTruncateUrl(url, maxLength = 50) {
	try {
		const urlObj = new URL(url);
		const domain = urlObj.hostname;
		const path = urlObj.pathname;

		if (url.length <= maxLength) return url;

		// Keep domain intact, truncate path
		if (domain.length + 5 > maxLength) {
			return domain.substring(0, maxLength - 3) + '...';
		}

		const remainingLength = maxLength - domain.length - 3;
		const half = Math.floor(remainingLength / 2);
		const beginPath = path.substring(0, half);
		const endPath = path.substring(path.length - half);

		return `${domain}${beginPath}...${endPath}`;
	} catch {
		// Fallback for invalid URLs
		return truncateUrl(url, maxLength);
	}
}
