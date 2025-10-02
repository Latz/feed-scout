const isFeed = require("./libs/checkFeed");
const fetch = require("node-fetch");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const url = require("url");
const util = require("util");
const { compileFunction } = require("vm");

// Beispiele:
// https://taz.de/

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function resolve(from, to) {
  const resolvedUrl = new URL(to, new URL(from, "resolve://"));
  if (resolvedUrl.protocol === "resolve:") {
    // `from` is a relative URL.
    const { pathname, search, hash } = resolvedUrl;
    return pathname + search + hash;
  }
  return resolvedUrl.toString();
}

module.exports = async function collection(doc, debugLevel) {
  // initialize JSDom's VirtualConsole
  console.log("collection");
  // const virtualConsole = new jsdom.VirtualConsole(); // suppress error messages about CSS not parsable
  let content;

  // doc.querySelectorAll('a').forEach(async (anchor) => {
  for (anchor of doc.querySelectorAll("a")) {
    // make links absolute url
    if (anchor.origin && anchor.origin !== "null") {
      if (
        anchor.href?.match(/(feed|rss|.xml)\/?/i) ||
        anchor.text?.match(/(feed|rss|.xml)\/?/i)
      ) {
        href = url.resolve(anchor.origin, anchor.href);

        // load page
        let response = await fetch(href);
        content = await response.text();
        let dom = new JSDOM(content);
        let document = dom.window.document;

        // look for feeds on page
        let feeds = [];
        let links = document.querySelectorAll("a");
        for (let link of links) {
          link.href = url.resolve(link.origin, link.href);
          if (
            link.href.startsWith("http://") ||
            link.href.startsWith("https://")
          ) {
            if (await isFeed(link.href)) {
              feeds.push({ href: link.href, title: link.title });
              process.stdout.write("*");
            } else {
              process.stdout.write(".");
            }
          }
        }
        return feeds;
      }
    }
  }
};
