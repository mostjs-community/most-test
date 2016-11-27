import Observer from './observer';
import SettableDisposable from 'most/lib/disposable/SettableDisposable';
import Scheduler from 'most/lib/scheduler/Scheduler';
import Timeline from 'most/lib/scheduler/Timeline';
import VirtualTimer from './virtual-timer';

export class TestEnvironment {

  constructor() {
    this._timer = new VirtualTimer();
    this._scheduler = new Scheduler( this._timer, new Timeline() );
    this._t = 0;
    this._cacheMap = new WeakMap();
    this._disposables = [];
    this._tick = Promise.resolve();
  }

  get now() {
    return this._t;
  }

  tick( t = 1 ) {
    this._tick = this._tick.then( () => this._timer.tick(t) )
                           .then( () => this._t += t );
    return this;
  }

  collect( stream ) {
    const { sink, buckets } = this._cache( stream );
    return this._tick.then( () => {
      const bucket = sink.next( this._t );
      buckets.push( bucket );
      return bucket.toObject();
    });
  }

  results( stream ) {
    const { buckets } = this._cache( stream );
    return buckets.map( bucket => bucket.toObject() );
  }

  reset() {
    return this._tick.then( () => {
      this._t = 0;
      this._timer._now = 0;
      this._cacheMap = new WeakMap();
      this._disposables.forEach( disposable => disposable.dispose() );
      this._disposables = [];
    });
  }

  track( ...streams ) {
    streams.forEach( s => this._cache(s) );
    return this;
  }

  _cache( stream ) {
    let cache = this._cacheMap.get( stream );
    if( !cache ) {
        cache = this._buildCache( stream );
        this._cacheMap.set( stream, cache );
        this._disposables.push( cache.disposable );
    }
    return cache;
  }

  _buildCache({ source }) {
    const sink = new Sink();
    const disposable = new SettableDisposable();
    const observer = new Observer(
        sink.event.bind(sink),
        sink.end.bind(sink),
        sink.error.bind(sink),
        disposable );
    disposable.setDisposable( source.run(observer, this._scheduler) );
    return { sink, disposable, observer, buckets: [] };
  }
}

export class BasicTestEnvironment {

  constructor( stream ) {
    this._env = new TestEnvironment();
    this._stream = stream;
  }

  get now() {
    return this._env.now;
  }

  tick( t = 1 ) {
    return this._env.tick( t ).collect( this._stream );
  }

  get results() {
    return this._env.results( this._stream );
  }
}

export function run( stream ) {
  return new BasicTestEnvironment( stream );
}

class Bucket
{
  constructor() {
    this.events = [];
    this.error = null;
    this.end = null;
  }

  toObject() {
    const obj = {events: this.events};
    if(this.error) {
      obj.error = this.error;
    }
    if(this.end) {
      obj.end = this.end;
    }
    return obj;
  }
}

class Sink
{
  constructor() {
    this.buckets = [];
    this.t = 0;
    this.events = [];
    this.index = 0;
  }

  _collect(t) {
    const bucket = new Bucket(t);
    let i = this.index;

    while(i < this.events.length) {
      const event = this.events[i];
      if(event[1] > t) {
        break;
      }

      i++;
      this.index = i;

      switch(event[0]) {
        case 'event':
          bucket.events.push(event[2]);
          continue;

        case 'end':
          bucket.end = event[2] === void 0 ? true : {value: event[2]};
          return bucket;

        case 'error':
          bucket.error = event[2];
          return bucket;
      }
    }

    return bucket;
  }

  next(t) {
    const bucket = this._collect(t);
    this.buckets.push(bucket);
    this.t = t;
    return bucket;
  }

  event(t, x) {
    this.events.push(['event', t, x]);
  }

  end(t, x) {
    this.events.push(['end', t, x]);
  }

  error(t, err) {
    this.events.push(['error', t, err]);
  }
}
