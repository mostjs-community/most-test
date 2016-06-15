/* global Promise */
export default class VirtualTimer
{
  constructor() {
    this._now = 0;
    this._soon = 0;
    this._queue = [];
    this._id = 0;
  }

  now() {
    return this._now;
  }

  setTimer(f, dt) {
    this._set();
    return this._insert(f, this._now + dt);
  }

  clearTimer(id) {
    this._remove(id);
  }

  tick(dt) {
    this._soon += this._now + dt;
    if(!this._promise) {
      this._promise = new Promise(resolve => {
        this._resolve = resolve;
      });
    }
    this._set();
    return this._promise;
  }

  _set() {
    if(this._timer) {
      clearTimeout(this._timer);
    }
    this._timer = setTimeout(() => this._run(), 0);
  }

  _insert(f, t) {
    const id = ++this._id;
    this._queue.push({id, f, t});
    this._queue.sort((a, b) => a.t - b.t);
    return id;
  }

  _remove(id) {
    const index = this._queue.findIndex(s => s.id === id);
    if(index > -1) {
      this._queue.splice(index, 1);
    }
  }

  _run() {
    this._timer = null;
    let ran = false;
    if(this._queue.length > 0 && this._queue[0].t <= this._soon) {
      ran = true;
      const task = this._queue.shift();
      if(typeof task.f === 'function') {
        if(task.t > this._now) {
          this._now = task.t;
        }
        task.f();
      }
    }

    if(this._resolve && !ran) {
      if(!this._canTerminate) { // flush any pending events
        this._canTerminate = true;
        this._set();
        return;
      }

      const resolve = this._resolve;
      this._promise = null;
      this._resolve = null;
      resolve();
      return;
    }

    this._canTerminate = false;
    this._set();
  }
}
