import { readFileSync } from 'fs';
import { checkFeed } from './modules/checkFeed.js';

// Test with the executor.dk rss feed
const response = await fetch('https://executor.dk/rssfeed.xml');
const content = await response.text();

console.log('Feed content starts with:', content.substring(0, 100));
const result = await checkFeed('https://executor.dk/rssfeed.xml', content);
console.log('CheckFeed result:', result);