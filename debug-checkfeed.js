#!/usr/bin/env node

import checkFeed from './modules/checkFeed.js';

async function testCheckFeed() {
  console.log('Testing checkFeed for https://geminiprotocol.net/news/atom.xml');
  
  try {
    // First try with fetching the content
    const result1 = await checkFeed('https://geminiprotocol.net/news/atom.xml');
    console.log('Result with fetch:', result1);
    
    // Then try with providing the content directly
    const response = await fetch('https://geminiprotocol.net/news/atom.xml');
    const content = await response.text();
    const result2 = await checkFeed('https://geminiprotocol.net/news/atom.xml', content);
    console.log('Result with content provided:', result2);
    
    // Let's also check what the content looks like
    console.log('Content preview:', content.substring(0, 200));
  } catch (error) {
    console.error('Error during checkFeed test:', error);
  }
}

testCheckFeed();