const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let interval;
let currentFrame = 0;
let text = '';

/**
 * Initializes the spinner by hiding the cursor
 */
function init() {
	process.stdout.write('\x1B[?25l'); // Hide cursor
}

/**
 * Updates the spinner with the current progress
 * @param {number} i - The current index
 * @param {number} total - The total count
 */
function update(i, total) {
	const frame = frames[++currentFrame % frames.length];
	// process.stdout.write(`\r${frame} ${text}`);
	process.stdout.write(`\r(${i}/${total})`);
}

/**
 * Stops the spinner by showing the cursor
 */
function stop() {
	process.stdout.write('\x1B[?25h'); // Show cursor
}

export default { init, stop, update };
