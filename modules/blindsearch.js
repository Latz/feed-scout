import checkFeed from "./checkFeed.js";

export default async function blindsearch(instance) {
  instance.emit("start", { module: "blindsearch", niceName: "Blind search" });

  const endpoints = [
    "rss.xml", // this seems to be to lmost often used file name
    ".rss", //
    "&_rss=1", //ebay
    "atom.xml",
    "blog-feed.xml", //WIX sites
    "extern.php?action=feed&type=atom",
    "external?type=rss2",
    "feed",
    "feed/atom.rss",
    "feed/atom.xml",
    "feed/atom",
    "feed/rdf",
    "feed/rss.xml",
    "feed/rss/",
    "feed/rss2",
    "feeds",
    "index.php?action=.xml;type=rss",
    "index.rss",
    "index.xml",
    "latest.rss",
    "latest/feed",
    "news.xml",
    "posts.rss",
    "rss.php",
    "rss",
    "rss/news/rss.xml",
    "rss/rss.php",
    "rssfeed.rdf",
    "sitenews",
    "spip.php?page=backend-breve",
    "spip.php?page=backend-sites",
    "spip.php?page=backend",
    "syndication.php",
    "xml",
  ];

  // create an array of Urls with the potential feed paths down to the base url
  const origin = new URL(instance.site).origin;
  let path = instance.site;
  const endpointUrls = [];
  const feeds = [];

  // Use a Set to track found feed URLs and prevent duplicates
  const foundUrls = new Set();

  while (path.length >= origin.length) {
    // Ensure we don't have a double slash by removing a trailing slash from the path.
    const basePath = path.endsWith("/") ? path.slice(0, -1) : path;
    endpoints.forEach((endpoint) =>
      endpointUrls.push(`${basePath}/${endpoint}`),
    );
    path = path.slice(0, path.lastIndexOf("/"));
  }

  // we short stop if an atom and a rss feed is found
  // TODO: option to check in all dirctories dow to origin
  // TODO: parallize
  let rssFound = false;
  let atomFound = false;
  let i = 0;
  while (i < endpointUrls.length && !(rssFound && atomFound)) {
    instance.emit("log", { module: "blindsearch" });

    let url = endpointUrls[i];
    let feedType = await checkFeed(url);

    // Only add feed if it hasn't been found before
    if (feedType && !foundUrls.has(url)) {
      foundUrls.add(url); // Track this URL to prevent duplicates

      if (feedType === "rss") {
        rssFound = true;
        feeds.push({ url, feedType });
      }
      if (feedType === "atom") {
        atomFound = true;
        feeds.push({ url, feedType });
      }
    }
    i++;
  }
  instance.emit("end", { module: "blindsearch", feeds });
  return feeds;
}
