// Helper function to clean titles by removing excessive whitespace and newlines
function cleanTitle(title) {
  if (!title) return title;
  // Remove leading/trailing whitespace and collapse multiple whitespace characters
  return title.replace(/\s+/g, ' ').trim();
}

export default function metaLinks(instance) {
  instance.emit("start", { module: "metalinks", niceName: "Meta links" });
  let feeds = [];
  ["feed+json", "rss+xml", "atom+xml"].forEach((feedType) => {
    instance.emit("log", { module: "metalinks", feedType });
    for (let link of instance.document.querySelectorAll(
      `link[type="application/${feedType}"]`,
    )) {
      feeds.push({
        href: new URL(link.href, instance.site).href, // make relative path absolute
        title: cleanTitle(link.title),
        type: link.type.match(/(rss|atom|json)/)[1],
      });
    }
  });
  instance.emit("end", { module: "metalinks", feeds });
  return feeds;
}
