import * as most from 'most';
import {run} from '../src';
import assert from 'assert';

describe('most-test', () => {
  describe('run()', () => {
    it('returns a test environment', () => {
      const stream = most.empty();
      const env = run(stream);

      assert.ok('tick' in env);
      assert.ok('results' in env);
      assert.equal(typeof env.tick, 'function');
      assert.ok(Array.isArray(env.results));
    });

    describe('Test Environment', () => {
      describe('new instance', () => {
        it('should have an empty results array', () => {
          const stream = most.empty();
          const env = run(stream);
          assert.equal(env.results.length, 0);
        });
      });

      describe('tick()', () => {
        it('should return a promise', () => {
          const stream = most.empty();
          const env = run(stream);
          const result = env.tick();
          assert.ok(result);
          assert.ok('then' in result);
          assert.equal(typeof result.then, 'function');
        });

        it('should emit the events expected within the specified time interval', () => {
          const stream = most
            .periodic(2, 'x').skip(1)
            .scan(x => x + 1, 0).skip(1)
            .take(3);
          const env = run(stream);
          assert.deepEqual(env.now, 0);

          return env.tick(1)
            .then(result => {
              assert.strictEqual(env.now, 1);
              assert.deepEqual(result, {events: []});
              return env.tick(1);
            })
            .then(result => {
              assert.strictEqual(env.now, 2);
              assert.deepEqual(result, {events: [1]});
              return env.tick(1);
            })
            .then(result => {
              assert.strictEqual(env.now, 3);
              assert.deepEqual(result, {events: []});
              return env.tick(1);
            })
            .then(result => {
              assert.strictEqual(env.now, 4);
              assert.deepEqual(result, {events: [2]});
              return env.tick(2);
            })
            .then(result => {
              assert.strictEqual(env.now, 6);
              assert.deepEqual(result, {events: [3], end: {value: 3}});
              assert.deepEqual(env.results, [
                {events: []},
                {events: [1]},
                {events: []},
                {events: [2]},
                {events: [3], end: {value: 3}}
              ]);
            });
        });
      });
    });
  });
});
