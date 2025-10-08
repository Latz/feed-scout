# Feed Scout - The Ultimate Feed Discovery Library

**🔍 Discover RSS, Atom, and JSON feeds on any website with ease**

Feed Scout is a powerful, intelligent Node.js library that automatically discovers feeds using multiple advanced strategies. Whether you're building a news aggregator, podcast directory, or content monitoring system, Feed Scout finds feeds that others miss.

## ✨ Why Choose Feed Scout?

### 🚀 **Multiple Discovery Strategies**
- **Meta Tag Analysis** - Lightning-fast HTML `<link>` tag scanning
- **Anchor Link Detection** - Smart analysis of page links with domain filtering
- **Blind Search** - Tests 320+ common feed endpoints with intelligent path traversal
- **Deep Crawling** - Comprehensive website exploration with circuit breaker protection

### 🎯 **Intelligent & Reliable**
- **Feed Validation** - Verifies discovered URLs are actual feeds, not false positives
- **Format Support** - RSS 2.0, Atom 1.0, and JSON Feed detection
- **Error Recovery** - Graceful handling of timeouts, 403 errors, and malformed content

### ⚡ **Performance Optimized**
- **Concurrent Processing** - Async queue management with configurable concurrency
- **Early Termination** - Stops searching when target feeds are found
- **Memory Efficient** - Single-pass processing and optimized data structures
- **Configurable Timeouts** - Prevents hanging on slow or unresponsive sites

### 🔧 **Developer Friendly**
- **Event-Driven API** - Real-time progress updates and error handling
- **TypeScript Support** - Full type definitions included
- **Comprehensive Options** - Fine-tune behavior for your specific use case
- **CLI Tool Included** - Command-line interface for testing and automation

## 📦 Quick Start

```bash
npm install feed-scout
```

```javascript
import FeedScout from 'feed-scout';

const feedScout = new FeedScout('https://techcrunch.com');
const feeds = await feedScout.metaLinks();

console.log(`Found ${feeds.length} feeds:`);
feeds.forEach(feed => {
  console.log(`📡 ${feed.url} (${feed.type})`);
});
```

## 🎪 Real-World Examples

### News Aggregator
```javascript
const feedScout = new FeedScout('https://arstechnica.com', {
  timeout: 10,
  maxFeeds: 5
});

// Try multiple strategies for comprehensive discovery
let feeds = await feedScout.metaLinks();
if (feeds.length === 0) {
  feeds = await feedScout.blindSearch();
}

feeds.forEach(feed => {
  console.log(`📰 ${feed.feedTitle || feed.title}: ${feed.url}`);
});
```

### Podcast Directory
```javascript
const feedScout = new FeedScout('https://gimletmedia.com', {
  deepsearch: true,
  depth: 3,
  maxLinks: 1000
});

// Comprehensive search with progress tracking
feedScout.on('log', (data) => {
  console.log(`🔍 Checking ${data.totalCount} items...`);
});

const podcastFeeds = await feedScout.deepSearch();
```

### Express.js API
```javascript
app.post('/api/discover-feeds', async (req, res) => {
  const { url } = req.body;
  
  try {
    const feedScout = new FeedScout(url, { timeout: 10 });
    const feeds = await feedScout.metaLinks();
    
    res.json({
      success: true,
      feedsFound: feeds.length,
      feeds: feeds.map(f => ({
        url: f.url,
        title: f.feedTitle || f.title,
        type: f.type
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 🛠️ Advanced Configuration

```javascript
const options = {
  timeout: 15,              // Request timeout in seconds
  maxFeeds: 10,            // Maximum feeds to discover
  deepsearch: true,        // Enable website crawling
  depth: 4,                // Crawling depth
  maxLinks: 2000,          // Maximum links to process
  checkForeignFeeds: true, // Check external domains
  keepQueryParams: true,   // Preserve URL parameters
  all: false              // Find all feeds (no early termination)
};

const feedScout = new FeedScout('https://example.com', options);
```

## 📊 Event-Driven Progress Tracking

```javascript
const feedScout = new FeedScout('https://news-site.com');

feedScout.on('start', (data) => {
  console.log(`🚀 Starting ${data.niceName}`);
});

feedScout.on('log', (data) => {
  if (data.foundFeedsCount) {
    console.log(`✅ Found ${data.foundFeedsCount} feeds so far`);
  }
});

feedScout.on('error', (data) => {
  console.warn(`⚠️ ${data.error}`);
  if (data.explanation) {
    console.log(`💡 ${data.explanation}`);
  }
});

feedScout.on('end', (data) => {
  console.log(`🎉 Discovery complete: ${data.feeds.length} feeds found`);
});

const feeds = await feedScout.blindSearch();
```

## 🌟 Key Features

### **Smart Feed Detection**
- Validates feed content to prevent false positives
- Handles RSS, Atom, and JSON Feed formats
- Filters out oEmbed and non-feed responses
- Extracts feed titles and metadata

### **Robust Error Handling**
- Detailed error messages with explanations
- Graceful handling of network timeouts
- Circuit breaker pattern for error resilience
- Helpful suggestions for common issues

### **Security & Performance**
- Domain whitelist for external feed checking
- Configurable concurrency limits
- Memory-efficient processing
- Respectful request patterns

### **Comprehensive Endpoint Coverage**
- 320+ common feed endpoint patterns
- Platform-specific paths (WordPress, Ghost, etc.)
- Multi-language support (en/feed, es/feed, etc.)
- Modern static site generators (Jekyll, Hugo, Gatsby)
- Query parameter variations (?feed=rss, ?format=atom)

## 🎯 Perfect For

- **📰 News Aggregators** - Discover feeds from news websites
- **🎧 Podcast Directories** - Find podcast RSS feeds
- **📝 Blog Monitoring** - Track blog feeds for new content
- **🔍 Content Discovery** - Build feed-based applications
- **📊 Analytics Tools** - Monitor website feed availability
- **🤖 Automation Scripts** - Batch feed discovery workflows

## 📋 CLI Tool Included

```bash
# Quick discovery
feed-scout https://example.com

# Meta search only (fastest)
feed-scout -m https://blog.example.com

# Deep search with custom depth
feed-scout -d --depth 4 --max-feeds 10 https://news-site.com

# Comprehensive search with all strategies
feed-scout --all --timeout 15 https://complex-site.com
```

## 🏆 Why Feed Scout Stands Out

### **Comprehensive Coverage**
Most feed discovery tools only check obvious locations. Feed Scout uses four different strategies and tests hundreds of potential endpoints, finding feeds that others miss.

### **Production Ready**
Built with real-world challenges in mind - handles timeouts, errors, malformed content, and anti-bot protection gracefully.

### **Developer Experience**
Event-driven API provides real-time feedback, detailed error messages include explanations and suggestions, and comprehensive documentation gets you started quickly.

### **Battle Tested**
Includes 142+ comprehensive tests covering edge cases, error conditions, and integration scenarios.

## 📚 Documentation

- **[API Reference](./API_REFERENCE.md)** - Quick start guide with practical examples
- **[Technical Documentation](./TECHNICAL_API_DOCUMENTATION.md)** - Comprehensive implementation details
- **TypeScript Definitions** - Full type support included

## 🤝 Contributing

Feed Scout is actively maintained and welcomes contributions. Whether it's bug reports, feature requests, or code contributions, we appreciate your help in making Feed Scout better.

## 📄 License

MIT License - Use Feed Scout in your commercial and open-source projects.

---

**⭐ Star us on GitHub if Feed Scout helps your project!**

**🐛 Found a bug or have a feature request? [Open an issue](https://github.com/user/feed-scout/issues)**

**💬 Questions? Check our [documentation](./API_REFERENCE.md) or start a discussion**
