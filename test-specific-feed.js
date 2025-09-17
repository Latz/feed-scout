#!/usr/bin/env node

import FeedScout from './feed-scout.js';

async function testDeepSearch() {
  console.log('Testing deep search for https://geminiprotocol.net/');
  
  const scout = new FeedScout('https://geminiprotocol.net/', {
    depth: 3,
    timeout: 10
  });
  
  try {
    const feeds = await scout.deepSearch();
    console.log('Found feeds:', feeds);
    
    // Check if our specific feed was found
    const targetFeed = 'https://geminiprotocol.net/news/atom.xml';
    const found = feeds.some(feed => feed.url === targetFeed);
    
    if (found) {
      console.log('✅ SUCCESS: Found the target feed!');
      const feed = feeds.find(feed => feed.url === targetFeed);
      console.log('Feed details:', feed);
    } else {
      console.log('❌ FAILURE: Target feed not found');
    }
  } catch (error) {
    console.error('Error during deep search:', error);
  }
}

testDeepSearch();