module.exports = function (doc, url) {
  // console.log('--- Meta links');
  process.stdout.write('.');
  let feedLinks = [];
  ['feed+json', 'rss+xml', 'atom+xml'].forEach((feedType) => {
    for (let link of doc.querySelectorAll(
      `link[type="application/${feedType}"]`
    )) {
      feedLinks.push({
        href: new URL(link.attributes.href.textContent, url).href, // make relative path absolute
        title: link.attributes.title.textContent,
        type: link.attributes.type.textContent.match(/(rss|atom|json)/)[1],
      });
    }
  });
  return feedLinks;
};
