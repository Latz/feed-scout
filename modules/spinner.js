/**
 * @fileoverview Spinner - Progress indicator utility for CLI applications
 *
 * This module provides a simple progress spinner with animated frames for indicating
 * ongoing operations in command-line interfaces. It manages cursor visibility and
 * displays progress counters.
 *
 * @module Spinner
 * @version 1.0.0
 * @author latz
 * @since 1.0.0
 */

/**
 * Animation frames for the spinner using Braille patterns
 * @type {string[]}
 * @private
 */
const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * Interval reference for animation timing
 * @type {NodeJS.Timeout|null}
 * @private
 */
let interval;

/**
 * Current frame index in the animation sequence
 * @type {number}
 * @private
 */
let currentFrame = 0;

/**
 * Text to display with the spinner
 * @type {string}
 * @private
 */
let text = '';

/**
 * Initializes the spinner by hiding the terminal cursor
 * This prevents cursor blinking during spinner animation
 * @function init
 * @returns {void}
 * @example
 * spinner.init(); // Hides cursor for clean animation
 */
function init() {
	process.stdout.write('\x1B[?25l'); // Hide cursor
}

/**
 * Updates the spinner display with current progress information
 * Shows progress as (current/total) format in the terminal
 * @param {number} i - The current progress index (0-based)
 * @param {number} total - The total number of items to process
 * @returns {void}
 * @example
 * spinner.update(5, 10); // Displays "(5/10)"
 * spinner.update(0, 100); // Displays "(0/100)"
 */
function update(i, total) {
	const frame = frames[++currentFrame % frames.length];
	// process.stdout.write(`\r${frame} ${text}`);
	process.stdout.write(`\r(${i}/${total})`);
}

/**
 * Stops the spinner and restores the terminal cursor
 * Should be called when the operation is complete to restore normal cursor behavior
 * @function stop
 * @returns {void}
 * @example
 * spinner.stop(); // Shows cursor and ends spinner animation
 */
function stop() {
	process.stdout.write('\x1B[?25h'); // Show cursor
}

export default { init, stop, update };
