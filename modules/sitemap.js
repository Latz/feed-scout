import { parseHTML } from 'linkedom';
import checkFeed from './checkFeed.js';
import fetchWithTimeout from './fetchWithTimeout.js';

/**
 * Sitemap module that fetches and parses sitemap.xml to find feeds
 * @param {Object} instance - The FeedScout instance
 * @returns {Array} Array of found feeds
 */
export default async function sitemap(instance) {
  instance.emit('start', { module: 'sitemap', niceName: 'Sitemap' });
  
  const feeds = [];
  const sitemapUrl = new URL('sitemap.xml', instance.site).href;
  
  try {
    const response = await fetchWithTimeout(sitemapUrl);
    if (!response) {
      instance.emit('log', { 
        module: 'sitemap', 
        message: `Failed to fetch sitemap: ${sitemapUrl}` 
      });
      instance.emit('end', { module: 'sitemap', feeds });
      return feeds;
    }
    
    if (!response.ok) {
      instance.emit('log', { module: 'sitemap', message: `Failed to fetch sitemap: ${response.status}` });
      instance.emit('end', { module: 'sitemap', feeds });
      return feeds;
    }
    
    const content = await response.text();
    const { document } = parseHTML(content);
    
    // Find all loc elements in the sitemap
    const locElements = document.querySelectorAll('loc');
    
    // Check each URL in the sitemap for feeds
    for (const loc of locElements) {
      const url = loc.textContent.trim();
      
      try {
        // Skip non-http URLs
        if (!url.startsWith('http')) continue;
        
        // Check if this URL is a feed
        const feedType = await checkFeed(url, '');
        
        if (feedType) {
          feeds.push({
            url: url,
            type: feedType
          });
          
          instance.emit('log', { 
            module: 'sitemap', 
            message: `Found feed: ${url} (${feedType})` 
          });
        }
      } catch (error) {
        // Emit error event with the specified pattern when an error occurs
        instance.emit('error', { module: 'sitemap', error: error.message });
      }
    }
  } catch (error) {
    // Emit error event with the specified pattern when an error occurs
    instance.emit('error', { module: 'sitemap', error: error.message });
  }
  
  instance.emit('end', { module: 'sitemap', feeds });
  return feeds;
}