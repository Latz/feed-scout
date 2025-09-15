import checkFeed from '../modules/checkFeed.js';

// Simulated ZDNet feed with CDATA in the title (similar to real-world scenario)
const zdnetFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title><![CDATA[ZDNet News]]></title>
    <link>https://www.zdnet.com/</link>
    <description>Latest technology news and analysis</description>
    <item>
      <title>New tech release</title>
      <link>https://www.zdnet.com/article/new-tech-release/</link>
      <description>Details about the latest tech release</description>
    </item>
  </channel>
</rss>`;

console.log('Testing ZDNet-like feed with CDATA:');
const result = await checkFeed('', zdnetFeed);
console.log('Result:', result);
console.log('CDATA successfully removed:', 
  result.title === 'ZDNet News' && 
  !result.title.includes('<![CDATA[') && 
  !result.title.includes(']]>'));