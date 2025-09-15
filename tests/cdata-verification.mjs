import checkFeed from '../modules/checkFeed.js';

// Test RSS feed with CDATA in channel title (similar to zdnet.com)
const rssFeedWithCDATA = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title><![CDATA[Latest news from ZDNet]]></title>
    <item>
      <title>Item Title</title>
    </item>
  </channel>
</rss>`;

// Test RSS feed without CDATA in channel title
const rssFeedWithoutCDATA = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Regular Channel Title</title>
    <item>
      <title>Item Title</title>
    </item>
  </channel>
</rss>`;

// Test Atom feed with CDATA in feed title
const atomFeedWithCDATA = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title><![CDATA[Latest updates]]></title>
  <entry>
    <title>Entry Title</title>
  </entry>
</feed>`;

console.log('Testing RSS feed with CDATA:');
const rssResultWithCDATA = await checkFeed('', rssFeedWithCDATA);
console.log('Result:', rssResultWithCDATA);
console.log('CDATA successfully removed:', 
  rssResultWithCDATA.title === 'Latest news from ZDNet' && 
  !rssResultWithCDATA.title.includes('<![CDATA[') && 
  !rssResultWithCDATA.title.includes(']]>'));

console.log('\nTesting RSS feed without CDATA:');
const rssResultWithoutCDATA = await checkFeed('', rssFeedWithoutCDATA);
console.log('Result:', rssResultWithoutCDATA);
console.log('Title preserved correctly:', rssResultWithoutCDATA.title === 'Regular Channel Title');

console.log('\nTesting Atom feed with CDATA:');
const atomResultWithCDATA = await checkFeed('', atomFeedWithCDATA);
console.log('Result:', atomResultWithCDATA);
console.log('CDATA successfully removed:', 
  atomResultWithCDATA.title === 'Latest updates' && 
  !atomResultWithCDATA.title.includes('<![CDATA[') && 
  !atomResultWithCDATA.title.includes(']]>'));