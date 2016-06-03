import most from 'most';
import {run} from '../src';
import assert from 'assert';

describe('most-test', () => {
  describe('run()', () => {
    describe('run()', () => {
      it('returns a test environment', () => {
        const stream = most.empty();
        const env = run(stream);

        assert.ok('tick' in env);
        assert.ok('results' in env);
        assert.equal(typeof env.tick, 'function');
        assert.ok(Array.isArray(env.results));
      });

      it('is easy to use', () => {
        const stream = most
          .periodic(1000, 0)
          .scan(x => x + 1, 0)
          .skip(1)
          .take(2);

        const env = run(stream);

        return env.tick(/* advance by 1ms */)
          .then(result => {
            // Make sure the stream didn't terminate
            assert.ok(!('end' in result));
            assert.ok(!('error' in result));

            // Ensure that the initial `periodic` value was emitted
            assert.equal(result.events.length, 1);
            assert.equal(result.events[0], 1);

            // Advance 1000ms; the stream should emit the second event and complete
            return env.tick(1000);
          })
          .then(result => {
            assert.equal(result.events.length, 1);
            assert.equal(result.events[0], 2);
            assert.ok(result.end);
          });
      });
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
          assert.ok(result)
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
              assert.deepEqual(env.now, 1);
              assert.deepEqual(result, {events: []});
              return env.tick(1);
            })
            .then(result => {
              assert.deepEqual(env.now, 2);
              assert.deepEqual(result, {events: [1]});
              return env.tick(1);
            })
            .then(result => {
              assert.deepEqual(env.now, 3);
              assert.deepEqual(result, {events: []});
              return env.tick(1);
            })
            .then(result => {
              assert.deepEqual(env.now, 4);
              assert.deepEqual(result, {events: [2]});
              return env.tick(2);
            })
            .then(result => {
              assert.deepEqual(env.now, 6);
              assert.deepEqual(result, {events: [3], end: true});
              assert.deepEqual(env.results, [
                {events: []},
                {events: [1]},
                {events: []},
                {events: [2]},
                {events: [3], end: true}
              ])
            });
        });

        it('should default to 1ms ticks when no interval argument is specified', () => {
          const stream = most.periodic()
        });
      });
    });
  });
});
