const fetch = require('node-fetch');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.sendTo(console, { omitJSDOMErrors: true });
const dom = new JSDOM(``, { virtualConsole });

module.exports = async function (link) {
  let response = await fetch(link);
  if (response.status !== 200) return 0; // file not found
  let data = await response.text();
  let dom = new JSDOM(data, { link });
  return dom.window.document.querySelectorAll('rss, feed').length;
  // TODO: check for json feed
};
