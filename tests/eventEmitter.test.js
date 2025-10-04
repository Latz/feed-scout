import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import EventEmitter from '../modules/eventEmitter.js';

describe('EventEmitter Module', () => {
  let emitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  afterEach(() => {
    // Clean up all listeners after each test
    emitter.removeAllListeners();
  });

  describe('on() method', () => {
    it('should register an event listener', (t) => {
      let called = false;
      const listener = () => { called = true; };
      
      emitter.on('test', listener);
      emitter.emit('test');
      
      assert.strictEqual(called, true);
    });

    it('should throw error if listener is not a function', (t) => {
      assert.throws(() => {
        emitter.on('test', 'not a function');
      }, TypeError);
    });

    it('should support method chaining', (t) => {
      const result = emitter.on('test', () => {});
      assert.strictEqual(result, emitter);
    });

    it('should handle multiple listeners for the same event', (t) => {
      let callCount = 0;
      const listener1 = () => { callCount++; };
      const listener2 = () => { callCount++; };
      
      emitter.on('test', listener1);
      emitter.on('test', listener2);
      emitter.emit('test');
      
      assert.strictEqual(callCount, 2);
    });
  });

  describe('emit() method', () => {
    it('should return false if no listeners for event', (t) => {
      const result = emitter.emit('nonexistent');
      assert.strictEqual(result, false);
    });

    it('should return true if event has listeners', (t) => {
      emitter.on('test', () => {});
      const result = emitter.emit('test');
      assert.strictEqual(result, true);
    });

    it('should pass arguments to listeners', (t) => {
      let receivedArgs = [];
      const listener = (...args) => { receivedArgs = args; };
      
      emitter.on('test', listener);
      emitter.emit('test', 'arg1', 'arg2', 42);
      
      assert.deepStrictEqual(receivedArgs, ['arg1', 'arg2', 42]);
    });

    it('should handle errors in listeners gracefully', (t) => {
      let errorCaught = false;
      const listener = () => { throw new Error('Test error'); };
      
      // Capture console.error to verify error handling
      const originalConsoleError = console.error;
      console.error = () => { errorCaught = true; };
      
      emitter.on('test', listener);
      emitter.emit('test');
      
      console.error = originalConsoleError;
      assert.strictEqual(errorCaught, true);
    });
  });

  describe('off() method', () => {
    it('should remove a specific listener', (t) => {
      let callCount = 0;
      const listener = () => { callCount++; };
      
      emitter.on('test', listener);
      emitter.emit('test');
      assert.strictEqual(callCount, 1);
      
      emitter.off('test', listener);
      emitter.emit('test');
      assert.strictEqual(callCount, 1); // Should not increase
    });

    it('should support method chaining', (t) => {
      const listener = () => {};
      emitter.on('test', listener);
      const result = emitter.off('test', listener);
      assert.strictEqual(result, emitter);
    });

    it('should handle removal of non-existent listener gracefully', (t) => {
      const listener = () => {};
      // Should not throw when trying to remove a non-existent listener
      assert.doesNotThrow(() => {
        emitter.off('nonexistent', listener);
      });
    });
  });

  describe('once() method', () => {
    it('should only call the listener once', (t) => {
      let callCount = 0;
      const listener = () => { callCount++; };
      
      emitter.once('test', listener);
      emitter.emit('test'); // Should be called
      emitter.emit('test'); // Should not be called again
      
      assert.strictEqual(callCount, 1);
    });

    it('should support method chaining', (t) => {
      const result = emitter.once('test', () => {});
      assert.strictEqual(result, emitter);
    });

    it('should be removed after being called', (t) => {
      let callCount = 0;
      const listener = () => { callCount++; };
      
      emitter.once('test', listener);
      assert.strictEqual(emitter.listenerCount('test'), 1);
      
      emitter.emit('test');
      assert.strictEqual(emitter.listenerCount('test'), 0);
      assert.strictEqual(callCount, 1);
    });
  });

  describe('removeAllListeners() method', () => {
    it('should remove all listeners for a specific event', (t) => {
      emitter.on('test', () => {});
      emitter.on('test', () => {});
      assert.strictEqual(emitter.listenerCount('test'), 2);
      
      emitter.removeAllListeners('test');
      assert.strictEqual(emitter.listenerCount('test'), 0);
      assert.strictEqual(emitter.emit('test'), false); // Should return false after removal
    });

    it('should remove all listeners for all events when called without arguments', (t) => {
      emitter.on('test1', () => {});
      emitter.on('test2', () => {});
      assert.strictEqual(emitter.eventNames().length, 2);
      
      emitter.removeAllListeners();
      assert.strictEqual(emitter.eventNames().length, 0);
    });

    it('should support method chaining', (t) => {
      const result = emitter.removeAllListeners();
      assert.strictEqual(result, emitter);
    });
  });

  describe('utility methods', () => {
    it('listenerCount() should return the number of listeners for an event', (t) => {
      assert.strictEqual(emitter.listenerCount('test'), 0);
      
      emitter.on('test', () => {});
      assert.strictEqual(emitter.listenerCount('test'), 1);
      
      emitter.on('test', () => {});
      assert.strictEqual(emitter.listenerCount('test'), 2);
      
      emitter.off('test', () => {}); // This won't match since it's a different function
      assert.strictEqual(emitter.listenerCount('test'), 2);
      
      const listener = () => {};
      emitter.on('test', listener);
      assert.strictEqual(emitter.listenerCount('test'), 3);
      
      emitter.off('test', listener);
      assert.strictEqual(emitter.listenerCount('test'), 2);
    });

    it('eventNames() should return an array of event names with listeners', (t) => {
      assert.deepStrictEqual(emitter.eventNames(), []);
      
      emitter.on('event1', () => {});
      assert.deepStrictEqual(emitter.eventNames(), ['event1']);
      
      emitter.on('event2', () => {});
      const eventNames = emitter.eventNames();
      assert.ok(eventNames.includes('event1'));
      assert.ok(eventNames.includes('event2'));
      assert.strictEqual(eventNames.length, 2);
    });
  });
});