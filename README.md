# Unit Testing Tools for Most.js

[![Build Status](https://travis-ci.org/axefrog/most-test.svg?branch=master)](https://travis-ci.org/axefrog/most-test)
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/cujojs/most)

This is a library to make unit testing of [Most.js](https://github.com/cujojs/most) streams easier.

Though I expect to include more in the future, the most important (and currently only) tool provided is a stream runner utilizing a **virtual timer** with which you can test your streams on your own terms, rather than being subject to the unpredictability and imprecision of the OS timer. Being able to test with single-millisecond granularity can make your tests clearer and more concise as well.

## Installation

```
npm install --save-dev most-test
```

## Stream Runner

Testing a stream using the virtual timer is very straightforward. Simply import the `run` function from `most-test` and use it instead of `stream.observe`. Call `tick()` or `tick(interval)` to advance time forward by either 1 millisecond (default) or a custom interval. The function returns a promise containing a summary of the events that occurred during that time interval. To advance time again, simply call `tick(interval?)` again, returning the promise so that it resolves as the next step in the promise chain.

### API

```
type Stream: most.Stream
type Time: Number
type Interval: Number

run: (stream:Stream) => BasicTestEnvironment

type BasicTestEnvironment: {
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

A `BasicTestEnvironment` object also contains a `results` property (getter only), which is an array of all of the `Result` objects created as a result of each `tick()` call.

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

### As of version 1.2.0:

As of version 1.2.0, `run(stream)` returns a `BasicTestEnvironment` which is a wrapper around `TestEnvironment`.

`run(stream)` works best when instantiating the stream under test within the test itself.

If you are testing a stream instantiated externally of your tests (eg. an imported module), the environment created when running this stream can remain associated with it and, therefore, future tests on the same stream can have unpredictable results.

In this situation, you should create a `TestEnvironment` and share it amongst your tests. Remembering to `.reset()` the environment after each test.

```js
import { TestEnvironment } from 'most-test'
import { stream1, stream2 } from './streams'

const env = new TestEnvironment();

// returns a promise - either return it to `afterEach` or `await` it
afterEach( () => env.reset() );

it( 'test stream1 after 1ms', async () => {
  const { events } = await env.tick().collect( stream1 );
  assert.equal( events.length, ... );
});

it( 'test stream1 after 10ms', async () => {
  const { events } = await env.tick(10).collect( stream1 );
  assert.equal( events.length, ... );
});
```

`tick()` initiates a promise chain but returns the `TestEnvironment` instance. Subsequent calls to `collect()` wait for this promise and then return a `Result`.

`collect(stream)` implicitly calls `track(stream)` - this helps avoid repetition. If `collect()` isn't being called within the same frame as `tick()`, you'll need to call `track()` explicitly, upfront.

```js
it( 'test stream1 then test stream2', async () => {
  env.track( stream1, stream2 ); // could also chain calls: env.track( stream1 ).track( stream2 );
  
  const results1 = await env.tick().collect( stream1 );
  assert.equal( results1.events.length, ... );
  
  const results2 = await env.tick().collect( stream2 );
  assert.equal( results2.events.length, ... );
});
```
