fetch = require("node-fetch");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

module.exports = async function (feeds) {
  let stupidTitles = [
    "",
    "rss",
    "rss 2.0",
    "blog",
    "atom",
    "atom 1.0",
    "rss 0.91",
    "feed",
    "atom feed",
    "rss feed",
    "default home feed",
    "primary feed",
    "blog feed (atom 1.0)",
    "json feed",
    "full rss feed",
    "feedburner",
  ];

  // TODO: parallize this
  let feedsWithTitles = [];
  for (let feed of feeds) {
    // remove CDATA
    feed.title = feed.title.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1");

    if (stupidTitles.includes(feed.title.toLowerCase())) {
      try {
        response = await fetch(feed.href);
        body = await response.text();
      } catch {
        body = "";
      }
      let dom = new JSDOM(body).window.document;
      feed.title =
        dom.querySelector("feed>title")?.textContent ||
        dom.querySelector("feed>title")?.textContent ||
        dom.querySelector("channel>title")?.textContent ||
        dom
          .querySelector("meta[property='og:site_name']")
          ?.getAttribute("content") ||
        dom.querySelector("title")?.textContent;

      // remove CDATA
      feed.title = feed.title.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1");

      feedsWithTitles.push(feed);
    } else feedsWithTitles.push(feed);
  }
  return feeds;
};
