## Summary of Changes to CDATA Handling in checkFeed Module

### Problem
The `checkFeed` module in `modules/checkFeed.js` had two issues:
1. The `removeCDATA` function had an incorrect regex pattern that wasn't properly removing CDATA tags
2. The title extraction logic was extracting item/entry titles instead of feed titles

### Solution
1. Fixed the `removeCDATA` function to properly remove CDATA tags using the RegExp constructor approach:
   ```javascript
   function removeCDATA(text) {
     const cdataRegex = new RegExp('<!\\[CDATA\\[(.*?)\\]\\]>', 'g');
     return text.replace(cdataRegex, '$1');
   }
   ```

2. Corrected the title extraction logic in both RSS and Atom feed detection:
   - For RSS feeds: Extract the title from the `<channel>` element instead of the first `<item>`
   - For Atom feeds: Extract the first `<title>` element (which is the feed title)

### Verification
- All existing tests pass
- CDATA tags are properly removed from feed titles
- Regular titles without CDATA are preserved correctly
- Works for both RSS and Atom feeds

### Example
Before: `<![CDATA[ZDNet News]]>`  
After: `ZDNet News`