async function checkAnchors(instance) {
	await handleMetaRefreshRedirect(instance);

	const baseUrl = new URL(instance.site);
	// Get all anchors and filter for same-host or allowed domains
	const allAnchors = Array.from(instance.document.querySelectorAll('a'));
	const filteredAnchors = allAnchors.filter(anchor => {
		const urlToCheck = getUrlFromAnchor(anchor, baseUrl, instance);
		if (!urlToCheck) return false;
		return isAllowedDomain(urlToCheck, baseUrl);
	});

	const maxFeeds = instance.options?.maxFeeds || 0;
	const context = {
		instance,
		baseUrl,
		feedUrls: [],
	};

	// Emit the count of anchors that will actually be processed
	instance.emit('log', {
		module: 'anchors',
		totalCount: allAnchors.length,
		filteredCount: filteredAnchors.length  // Number of anchors that passed the domain filter
	});

	for (const anchor of filteredAnchors) {
		if (maxFeeds > 0 && context.feedUrls.length >= maxFeeds) {
			instance.emit('log', {
				module: 'anchors',
				message: 'Stopped due to reaching maximum feeds limit: ' + context.feedUrls.length + ' feeds found (max ' + maxFeeds + ' allowed).'
			});
			break;
		}
		await processAnchor(anchor, context);
	}

	return context.feedUrls;
}