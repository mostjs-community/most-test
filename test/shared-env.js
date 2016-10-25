import * as most from 'most';
import { TestEnvironment } from '../src';
import assert from 'assert';

const lazilyPeriodic = t => most.periodic(t)
                                .concatMap( () => most.just(1).delay(t) )
                                .timestamp()
                                .map( ts => ts.time );

describe( 'class TestEnvironment', () => {

    it( 'should comply to API', () => {
        const env = new TestEnvironment();
        assert.equal( typeof env.now, 'number' );
        assert.equal( typeof env.tick, 'function' );
        assert.equal( typeof env.collect, 'function' );
        assert.equal( typeof env.results, 'function' );
        assert.equal( typeof env.reset, 'function' );
    });

    it( '.tick() increments .now', () => {
        const env = new TestEnvironment();
        assert.strictEqual( env.now, 0 );
        return env.tick( 2 )
                  .collect( most.empty() )
                  .then( () => {
                      assert.strictEqual( env.now, 2 );
                  });
    });

    it( '.reset() restarts the time', () => {
        const env = new TestEnvironment();
        assert.strictEqual( env.now, 0 );
        return env.tick( 2 )
                  .collect( most.empty() )
                  .then( () => {
                      assert.strictEqual( env.now, 2 );
                      return env.reset();
                  }).then( () => {
                      assert.strictEqual( env.now, 0 );
                  });
    });

    it( 'should emit the events expected with the specified time interval', () => {
        const env = new TestEnvironment();
        const stream$ = lazilyPeriodic( 2 );
        return env.tick( 2 )
                  .collect( stream$ )
                  .then( ({ events }) => {
                      assert.deepEqual( events, [2] );
                      return env.tick().collect( stream$ );
                  })
                  .then( ({ events }) => {
                      assert.deepEqual( events, [] );
                      return env.tick( 5 ).collect( stream$ );
                  })
                  .then( ({ events }) => {
                      assert.deepEqual( events, [4, 6, 8] );
                  });
    });

    describe( 'shared stream', () => {

        describe( 'without reset()', () => {

            const env = new TestEnvironment();
            const _ = undefined; // dummy value

            const stream$ = lazilyPeriodic( 2 );
            
            it( 'should emit the events expected with the specified time interval', () => {
                return env.tick( 5 )
                          .collect( stream$ )
                          .then( ({ events }) => {
                              assert.deepEqual( events, [2, 4] );
                          });
            });

            it( 'should conflict with previous test', () => {
                return env.tick( 5 )
                          .collect( stream$ )
                          .then( ({ events }) => {
                              assert.deepEqual( events, [6, 8, 10] );
                          });
            });
        });

        describe( 'with reset()', () => {

            const env = new TestEnvironment();

            afterEach( () => env.reset() );

            const stream$ = lazilyPeriodic( 1 );
            
            it( 'should emit the events expected with the specified time interval', () => {
                return env.tick( 5 )
                          .collect( stream$ )
                          .then( ({ events }) => {
                              assert.deepEqual( events, [1, 2, 3, 4, 5] );
                          });
            });

            it( 'should emit the same events with the same timestamps', () => {
                return env.tick( 5 )
                          .collect( stream$ )
                          .then( ({ events }) => {
                              assert.deepEqual( events, [1, 2, 3, 4, 5] );
                          });
            });
        });  
    })
});

