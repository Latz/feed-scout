/** 
 * Fetches a URL with a timeout
 * @param {string} url - The URL to fetch
 * @param {number} timeout - Timeout in milliseconds (default: 5000)
 * @returns {Promise<Response|null>} The fetch response or null if timeout/error occurs
 */
export default async function fetchWithTimeout(url, timeout = 5000) {
  const controller = new AbortController();
  const signal = controller.signal;
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  // Add browser-like headers to avoid being blocked by Cloudflare
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'max-age=0'
  };
  
  try {
    const response = await fetch(url, { 
      signal,
      headers
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    // Return null to allow the program to continue, but don't log the error here
    // The calling function should handle logging
    return null;
  }
}