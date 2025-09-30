import truncateUrl from 'truncate-url';

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
