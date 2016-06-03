# Unit Testing Tools for Most.js

This is a library to make unit testing of [Most.js](https://github.com/cujojs/most) streams easier.

Though I expect to include more in the future, the most important (and currently only) tool provided is a stream runner utilizing a **virtual timer** with which you can test your streams on your own terms, rather than being subject to the unpredictability and imprecision of the OS timer. Being able to test with single-millisecond granularity can make your tests clearer and more concise as well.

## Installation

```
npm install --save-dev most-test
```

Most.js is a peer dependency. Obviously you'll need to make sure it's installed too.

## Stream Runner

Testing a stream using the virtual timer is very straightforward. Simply import the `run` function from `most-test` and use it instead of `stream.observe`. Call `tick()` or `tick(interval)` to advance time forward by either 1 millisecond (default) or a custom interval. The function returns a promise containing a summary of the events that occurred during that time interval. To advance time again, simply call `tick(interval?)` again, returning the promise so that it resolves as the next step in the promise chain.

### API

```
type Stream: most.Stream
type Time: Number
type Interval: Number

run: (stream:Stream) => TestEnvironment

type TestEnvironment: {
  tick: (min?:Interval) => Promise<Result>
  now: Time,
  results: [Result]
}

type Result: {
  events: Array,
  end?: true|A,
  error?: Error
}
```

The `tick()` method advances the timer by the specified interval and returns a promise for the events that occurred during that interval.

A `Result` object always contains an `events` property, which is an array of zero or more values that were emitted by the stream during the elapsed interval. If the stream completed, it'll also have an `end` property which will have the completion value emitted with the `end` event, or `true` if no completion value was emitted. If a completion value was provided, the `end` property will be an object with a `value` property; e.g. `{value: 'x'}`

A `TestEnvironment` object also contains a `results` property (getter only), which is an array of all of the `Result` objects created as a result of each `tick()` call.

### Example

This example uses [Mocha](https://mochajs.org/)'s BDD API. You should use whatever you prefer.

```js
import {run} from 'most-test';
import assert from 'assert';

describe('most-test', () => {
  describe('run()' => {
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
});
```
