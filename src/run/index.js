import Observer from './observer';
import SettableDisposable from 'most/lib/disposable/SettableDisposable';
import Scheduler from 'most/lib/scheduler/Scheduler';
import VirtualTimer from './virtual-timer';

export class TestEnv
{
  constructor(timer, sink) {
    this._timer = timer;
    this._sink = sink;
    this._t = 0;
  }

  tick(t = 1) {
    return this._timer.tick(t)
      .then(() => {
        this._t += t;
        const bucket = this._sink.next(this._t);
        return bucket.toObject();
      });
  }

  get now() {
    return this._t;
  }

  get results() {
    return this._sink.buckets.map(b => b.toObject());
  }
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

export function run({source}) {
  const timer = new VirtualTimer();
  const sink = new Sink();
  const testEnv = new TestEnv(timer, sink);
  const disposable = new SettableDisposable();
  const observer = new Observer(
    sink.event.bind(sink),
    sink.end.bind(sink),
    sink.error.bind(sink),
    disposable);
  const scheduler = new Scheduler(timer);
  disposable.setDisposable(source.run(observer, scheduler));
  return testEnv;
}
