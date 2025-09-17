#!/usr/bin/env node

import FeedScout from './feed-scout.js';

async function testDeepSearch() {
  console.log('Testing deep search for https://fly.io/');
  
  const scout = new FeedScout('https://fly.io/', {
    depth: 3,
    timeout: 10
  });
  
  try {
    const feeds = await scout.deepSearch();
    console.log('Found feeds:', feeds);
    
    // Check if our specific feed was found
    const targetFeed = 'https://fly.io/blog/feed.xml';
    const found = feeds.some(feed => feed.url === targetFeed);
    
    if (found) {
      console.log('✅ SUCCESS: Found the target feed!');
    } else {
      console.log('❌ FAILURE: Target feed not found');
    }
  } catch (error) {
    console.error('Error during deep search:', error);
  }
}

testDeepSearch();