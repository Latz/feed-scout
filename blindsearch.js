const fetch = require('node-fetch');
const cliCursor = require('cli-cursor');
const isFeed = require('./libs/checkFeed.js');

if (!this.isCursorHidden) cliCursor.hide();
let dots = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
function spinner(i) {
  process.stdout.write(dots[i % 5] + '\b');
}

module.exports = async function (path) {
  process.stdout.write('.');

  const endpoints = [
    'rss.xml', // this seems to be to lmost often used file name
    '.rss', //
    '&_rss=1', //ebay
    'atom.xml',
    'blog-feed.xml', //WIX sites
    'extern.php?action=feed&type=atom',
    'external?type=rss2',
    'feed',
    'feed/atom.rss',
    'feed/atom.xml',
    'feed/atom',
    'feed/rdf',
    'feed/rss.xml',
    'feed/rss/',
    'feed/rss2',
    'feeds',
    'index.php?action=.xml;type=rss',
    'index.rss',
    'index.xml',
    'latest.rss',
    'latest/feed',
    'news.xml',
    'posts.rss',
    'rss.php',
    'rss',
    'rss/news/rss.xml',
    'rss/rss.php',
    'rssfeed.rdf',
    'sitenews',
    'spip.php?page=backend-breve',
    'spip.php?page=backend-sites',
    'spip.php?page=backend',
    'syndication.php',
    'xml',
  ];

  // remove trailing slash from path
  if (path.endsWith('/')) path = path.slice(0, -1);

  let feeds = [];

  // create array of paths to check for feed
  const url = new URL(path);
  while (path.length >= url.origin.length) {
    const endpoint_urls = [];
    endpoints.map((endpoint) => endpoint_urls.push(`${path}/${endpoint}`));

    // check each path for a feed
    for (i = 0; i < endpoint_urls.length; i++) {
      spinner(i);
      const url = new URL(endpoint_urls[i]);

      if (await isFeed(url)) {
        feeds.push(endpoint_urls[i]);
      }
    }

    if (feeds.length > 0) {
      path = ''; //;
    }
    // get one directory down
    path = path.slice(0, path.lastIndexOf('/'));
  }
  process.stdout.write('.');

  return feeds;
};
