export default class EventEmitter {
	#events = new Map(); // Use private field and Map for better performance

	on(event, listener) {
		if (typeof listener !== 'function') {
			throw new TypeError('Listener must be a function');
		}

		const listeners = this.#events.get(event);
		if (!listeners) {
			this.#events.set(event, new Set([listener])); // Use Set for O(1) lookups
		} else {
			listeners.add(listener);
		}

		return this; // Enable method chaining
	}

	once(event, listener) {
		if (typeof listener !== 'function') {
			throw new TypeError('Listener must be a function');
		}

		const onceWrapper = (...args) => {
			this.off(event, onceWrapper);
			listener.apply(this, args);
		};

		// Store reference to original listener for removal
		onceWrapper.originalListener = listener;
		return this.on(event, onceWrapper);
	}

	emit(event, ...args) {
		const listeners = this.#events.get(event);

		if (!listeners) return false; // Return false if no listeners

		// Convert to array to avoid issues if listeners are modified during emission
		[...listeners].forEach(listener => {
			try {
				listener.apply(this, args);
			} catch (error) {
				console.error(`Error in event listener for ${event}:`, error);
			}
		});

		return true; // Return true if event had listeners
	}

	off(event, listener) {
		const listeners = this.#events.get(event);

		if (!listeners) return this;

		// Handle both direct listeners and once() wrappers
		listeners.forEach(l => {
			if (l === listener || l.originalListener === listener) {
				listeners.delete(l);
			}
		});

		// Clean up empty event sets
		if (listeners.size === 0) {
			this.#events.delete(event);
		}

		return this;
	}

	removeAllListeners(event) {
		if (event) {
			this.#events.delete(event);
		} else {
			this.#events.clear();
		}
		return this;
	}

	// New utility methods
	listenerCount(event) {
		const listeners = this.#events.get(event);
		return listeners ? listeners.size : 0;
	}

	eventNames() {
		return Array.from(this.#events.keys());
	}
}

/* Example usage
const emitter = new EventEmitter();

// Regular event
emitter
    .on('log', (msg) => console.log(msg))
    .emit('log', 'Hello');  // Method chaining

// Once event
emitter.once('init', () => console.log('Initialized'));

// Get event info
console.log(emitter.listenerCount('log'));  // 1
console.log(emitter.eventNames());  // ['log', 'init']

// Clean up
emitter.removeAllListeners();



/* ---------------------------------------------------------------------------------
/ old emitter 

export default class EventEmitter {
	constructor() {
		this.events = {};
	}

	on(event, listener) {
		if (!this.events[event]) {
			this.events[event] = [];
		}
		this.events[event].push(listener);
	}

	once(event, listener) {
		const onceListener = (...args) => {
			listener(...args);
			this.off(event, onceListener); // Remove after execution
		};
		this.on(event, onceListener);
	}

	emit(event, ...args) {
		if (this.events[event]) {
			this.events[event].forEach(listener => {
				listener(...args);
			});
		}
	}

	off(event, listener) {
		if (this.events[event]) {
			this.events[event] = this.events[event].filter(l => l !== listener);
		}
	}

	removeAllListeners(event) {
		if (event) {
			delete this.events[event];
		} else {
			this.events = {}; // Clear all events
		}
	}
}

Example usage (works in both Node.js and browser):
const myEmitter = new EventEmitter();

myEmitter.on('myEvent', (arg1, arg2) => {
	console.log('Event emitted with:', arg1, arg2);
});

myEmitter.emit('myEvent', 'hello', 'world');

myEmitter.once('onceEvent', () => {
	console.log('This will only run once.');
});

myEmitter.emit('onceEvent');
myEmitter.emit('onceEvent'); // This second emit will have no effect

myEmitter.off('myEvent', (arg1, arg2) => {
	// Example of how to remove a specific listener
	console.log('This will not be called');
});

myEmitter.emit('myEvent', 'test1', 'test2'); // this emit will not call the removed listener

myEmitter.removeAllListeners('myEvent'); // Remove all listeners for 'myEvent'
myEmitter.emit('myEvent', 'test3', 'test4'); // this emit will not call any listener because all of them were removed

myEmitter.removeAllListeners(); // Remove all listeners for all events
myEmitter.emit('onceEvent'); // this emit will not call any listener because all of them were removed

 In Node.js:
 const EventEmitter = require('./your-event-emitter-file'); // If you save the class in a file

 In the browser:
 <script src="your-event-emitter-file.js"></script>

*/
