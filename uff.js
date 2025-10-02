// utility modules
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const fetch = require('node-fetch');
const { Command } = require('commander');
const AbortController = require('abort-controller');

const getMetaLinks = require('./MetaLinks');
const getStandardFeeds = require('./standardFeeds');
const stupidTitles = require('./libs/stupidTitle');
const blindsearch = require('./blindsearch');
const collection = require('./collection');

// -------------------------------------------------------------------

let timeout;
let debugLevel; //forward declaration
var self = (module.exports = async function uff(url) {
  console.log('*');
  try {
    const controller = new AbortController();
    let timer = setTimeout(() => controller.abort(), 30000);

    let response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    let content = await response.text();
    // const virtualConsole = new jsdom.VirtualConsole(); // suppress error messages about CSS not parsable
    // let dom = new JSDOM(content, { virtualConsole });
    let dom = new JSDOM(content);
    let doc = dom.window.document;

    // check if URL is already a feed
    const pathIsFeed = dom.window.document.querySelectorAll('rss, feed').length;
    if (pathIsFeed) {
      return { result: 0, links: [url] };
    }

    console.log('doc.length :>> ', doc.length);
    // let links = getMetaLinks(doc, url);
    let links = [];
    // if (links.length === 0) links = await getStandardFeeds(doc);
    // if (links.length === 0) links = await blindsearch(url);
    if (links.length === 0) links = await collection(doc, debugLevel);

    links = await stupidTitles(links);

    console.log('links :>> ', links);

    return { result: 0, links };
  } catch (err) {
    console.log('err :>> ', err);
    return { result: 1, error: err };
  }
});

// -------------------------------------------------------------------------

const program = new Command();
// set up command line options

program
  .option('-d, --debug <number>', 'output debugging messages')
  .option('-f, --full', 'perform full search')
  .name('node uff.js')
  .usage('[options] site');

function myParseInt(value) {
  console.log('value :>> ', value);
  const parsedValue = parseInt(value);
  return parsedValue;
}

program.arguments('<site>', 'URL of site to scan').action((site) => {
  self(site);
});
program.parse();

debugLevel = program.opts().debug;
