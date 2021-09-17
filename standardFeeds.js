const is_feed = require('./libs/checkFeed');
module.exports = async function (doc) {
  // console.log('--- Standard Feeds');
  process.stdout.write('.');
  let anchors = doc.querySelectorAll('a');
  let links = [];
  let feedLinks = [];

  for (anchor of anchors) {
    if (
      anchor?.href?.match(/(feed|rss|.xml|atom)\/?/i) &&
      !links.includes(anchor.href)
    )
      links.push(anchor.href);
  }
  for (link of links) if (await is_feed(link)) feedLinks.push(link);

  return feedLinks;
};
