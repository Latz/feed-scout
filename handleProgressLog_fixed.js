/**
 * Handle logging for blind search and anchor modules
 * @param {object} data - The data object containing information about the current event or progress.
 * @param {string} moduleName - The name of the module for display purposes.
 */
function handleProgressLog(data, moduleName) {
	// Handle totalCount parameter
	if (data.totalCount) {
		// For anchors module, prefer filteredCount if available
		if (data.module === 'anchors' && data.filteredCount !== undefined) {
			unvisitedCount = data.filteredCount;
		} else {
			unvisitedCount = data.totalCount;
		}
		blindsearchStartTime = Date.now(); // Record start time
		return;
	}

	// Update counters
	if (data.url || data.anchor || data.link) {
		visitedCount++;
	}

	// Only update display if we have a module from blindsearch
	// Move to beginning of line and clear it
	if (progressLineActive) {
		process.stdout.write('\r' + ' '.repeat(80) + '\r');
	} else {
		progressLineActive = true;
	}

	// Calculate ETA instead of percentage
	const elapsedTime = Date.now() - blindsearchStartTime;
	const avgTimePerUrl = visitedCount > 0 ? elapsedTime / visitedCount : 0;
	const remainingUrls = unvisitedCount - visitedCount;
	const etaMs = avgTimePerUrl * remainingUrls;

	// Format ETA (convert milliseconds to minutes and seconds)
	const etaSeconds = Math.round(etaMs / 1000);
	const etaMinutes = Math.floor(etaSeconds / 60);
	const etaRemainingSeconds = etaSeconds % 60;
	const etaFormatted = `${etaMinutes}m ${etaRemainingSeconds}s remaining`;

	// Create new display showing "Started moduleName (visited urls/total urls) ETA"
	const displayText = `Started ${moduleName} (${visitedCount}/${unvisitedCount}) ${etaFormatted}`;
	process.stdout.write(displayText);
}