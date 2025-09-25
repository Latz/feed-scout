// Helper function to clean titles by removing excessive whitespace and newlines
function cleanTitle(title) {
  if (!title) return title;
  // Remove leading/trailing whitespace and collapse multiple whitespace characters
  return title.replace(/\s+/g, ' ').trim();
}

// Helper function to determine feed type from link element
function getFeedType(link) {
  // Extract type from type attribute if present
  if (link.type) {
    const typeMatch = link.type.match(/(rss|atom|json)/);
    if (typeMatch) {
      return typeMatch[1];
    }
    
    // Handle other common feed types
    if (link.type.includes('rss') || link.type.includes('xml')) {
      return 'rss';
    }
    if (link.type.includes('atom')) {
      return 'atom';
    }
    if (link.type.includes('json')) {
      return 'json';
    }
  }
  
  // Fallback: try to determine type from href extension
  if (link.href) {
    const href = link.href.toLowerCase();
    if (href.includes('.rss') || href.includes('.xml')) {
      return 'rss';
    }
    if (href.includes('.atom')) {
      return 'atom';
    }
    if (href.includes('.json')) {
      return 'json';
    }
  }
  
  // Default to rss if we can't determine the type
  return 'rss';
}

export default function metaLinks(instance) {
  instance.emit("start", { module: "metalinks", niceName: "Meta links" });
  let feeds = [];
  
  // Expanded list of feed types to check
  const feedTypes = [
    "feed+json",
    "rss+xml",
    "atom+xml",
    "xml",
    "rdf+xml"
  ];
  
  // Check for links with specific feed types
  feedTypes.forEach((feedType) => {
    instance.emit("log", { module: "metalinks", feedType });
    for (let link of instance.document.querySelectorAll(
      `link[type="application/${feedType}"]`,
    )) {
      feeds.push({
        url: new URL(link.href, instance.site).href, // make relative path absolute
        title: cleanTitle(link.title),
        type: getFeedType(link),
      });
    }
  });
  
  // Also check for alternate links that might be feeds based on href patterns
  const alternateLinks = instance.document.querySelectorAll('link[rel="alternate"]');
  for (let link of alternateLinks) {
    // Check if href contains common feed patterns
    const feedPatterns = ['/rss', '/feed', '/atom', '.rss', '.atom', '.xml', '.json'];
    const isLikelyFeed = link.href && feedPatterns.some(pattern => 
      link.href.toLowerCase().includes(pattern));
    
    // If it's likely a feed and we haven't already added it
    if (isLikelyFeed) {
      const fullHref = new URL(link.href, instance.site).href;
      const alreadyAdded = feeds.some(feed => feed.url === fullHref);
      
      if (!alreadyAdded) {
        feeds.push({
          url: fullHref,
          title: cleanTitle(link.title),
          type: getFeedType(link),
        });
      }
    }
  }
  
  instance.emit("end", { module: "metalinks", feeds });
  return feeds;
}
