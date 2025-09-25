const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let interval;
let currentFrame = 0;
let text = '';

function init() {
	process.stdout.write('\x1B[?25l'); // Hide cursor
}

function update(i, total) {
	const frame = frames[++currentFrame % frames.length];
	// process.stdout.write(`\r${frame} ${text}`);
	process.stdout.write(`\r(${i}/${total})`);
}

function stop() {
	process.stdout.write('\x1B[?25h'); // Show cursor
}

export default { init, stop, update };
