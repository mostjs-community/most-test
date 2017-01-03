'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BasicTestEnvironment = exports.TestEnvironment = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.run = run;

var _observer = require('./observer');

var _observer2 = _interopRequireDefault(_observer);

var _SettableDisposable = require('most/lib/disposable/SettableDisposable');

var _SettableDisposable2 = _interopRequireDefault(_SettableDisposable);

var _Scheduler = require('most/lib/scheduler/Scheduler');

var _Scheduler2 = _interopRequireDefault(_Scheduler);

var _Timeline = require('most/lib/scheduler/Timeline');

var _Timeline2 = _interopRequireDefault(_Timeline);

var _virtualTimer = require('./virtual-timer');

var _virtualTimer2 = _interopRequireDefault(_virtualTimer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var TestEnvironment = exports.TestEnvironment = function () {
  function TestEnvironment() {
    _classCallCheck(this, TestEnvironment);

    this._timer = new _virtualTimer2.default();
    this._scheduler = new _Scheduler2.default(this._timer, new _Timeline2.default());
    this._t = 0;
    this._cacheMap = new WeakMap();
    this._disposables = [];
    this._tick = Promise.resolve();
  }

  _createClass(TestEnvironment, [{
    key: 'tick',
    value: function tick() {
      var _this = this;

      var t = arguments.length <= 0 || arguments[0] === undefined ? 1 : arguments[0];

      this._tick = this._tick.then(function () {
        return _this._timer.tick(t);
      }).then(function () {
        return _this._t += t;
      });
      return this;
    }
  }, {
    key: 'collect',
    value: function collect(stream) {
      var _this2 = this;

      var _cache2 = this._cache(stream);

      var sink = _cache2.sink;
      var buckets = _cache2.buckets;

      return this._tick.then(function () {
        var bucket = sink.next(_this2._t);
        buckets.push(bucket);
        return bucket.toObject();
      });
    }
  }, {
    key: 'results',
    value: function results(stream) {
      var _cache3 = this._cache(stream);

      var buckets = _cache3.buckets;

      return buckets.map(function (bucket) {
        return bucket.toObject();
      });
    }
  }, {
    key: 'reset',
    value: function reset() {
      var _this3 = this;

      return this._tick.then(function () {
        _this3._t = 0;
        _this3._timer._now = 0;
        _this3._cacheMap = new WeakMap();
        _this3._disposables.forEach(function (disposable) {
          return disposable.dispose();
        });
        _this3._disposables = [];
      });
    }
  }, {
    key: 'track',
    value: function track() {
      var _this4 = this;

      for (var _len = arguments.length, streams = Array(_len), _key = 0; _key < _len; _key++) {
        streams[_key] = arguments[_key];
      }

      streams.forEach(function (s) {
        return _this4._cache(s);
      });
      return this;
    }
  }, {
    key: '_cache',
    value: function _cache(stream) {
      var cache = this._cacheMap.get(stream);
      if (!cache) {
        cache = this._buildCache(stream);
        this._cacheMap.set(stream, cache);
        this._disposables.push(cache.disposable);
      }
      return cache;
    }
  }, {
    key: '_buildCache',
    value: function _buildCache(_ref) {
      var source = _ref.source;

      var sink = new Sink();
      var disposable = new _SettableDisposable2.default();
      var observer = new _observer2.default(sink.event.bind(sink), sink.end.bind(sink), sink.error.bind(sink), disposable);
      disposable.setDisposable(source.run(observer, this._scheduler));
      return { sink: sink, disposable: disposable, observer: observer, buckets: [] };
    }
  }, {
    key: 'now',
    get: function get() {
      return this._t;
    }
  }]);

  return TestEnvironment;
}();

var BasicTestEnvironment = exports.BasicTestEnvironment = function () {
  function BasicTestEnvironment(stream) {
    _classCallCheck(this, BasicTestEnvironment);

    this._env = new TestEnvironment();
    this._stream = stream;
  }

  _createClass(BasicTestEnvironment, [{
    key: 'tick',
    value: function tick() {
      var t = arguments.length <= 0 || arguments[0] === undefined ? 1 : arguments[0];

      return this._env.tick(t).collect(this._stream);
    }
  }, {
    key: 'now',
    get: function get() {
      return this._env.now;
    }
  }, {
    key: 'results',
    get: function get() {
      return this._env.results(this._stream);
    }
  }]);

  return BasicTestEnvironment;
}();

function run(stream) {
  return new BasicTestEnvironment(stream);
}

var Bucket = function () {
  function Bucket() {
    _classCallCheck(this, Bucket);

    this.events = [];
    this.error = null;
    this.end = null;
  }

  _createClass(Bucket, [{
    key: 'toObject',
    value: function toObject() {
      var obj = { events: this.events };
      if (this.error) {
        obj.error = this.error;
      }
      if (this.end) {
        obj.end = this.end;
      }
      return obj;
    }
  }]);

  return Bucket;
}();

var Sink = function () {
  function Sink() {
    _classCallCheck(this, Sink);

    this.buckets = [];
    this.t = 0;
    this.events = [];
    this.index = 0;
  }

  _createClass(Sink, [{
    key: '_collect',
    value: function _collect(t) {
      var bucket = new Bucket(t);
      var i = this.index;

      while (i < this.events.length) {
        var event = this.events[i];
        if (event[1] > t) {
          break;
        }

        i++;
        this.index = i;

        switch (event[0]) {
          case 'event':
            bucket.events.push(event[2]);
            continue;

          case 'end':
            bucket.end = event[2] === void 0 ? true : { value: event[2] };
            return bucket;

          case 'error':
            bucket.error = event[2];
            return bucket;
        }
      }

      return bucket;
    }
  }, {
    key: 'next',
    value: function next(t) {
      var bucket = this._collect(t);
      this.buckets.push(bucket);
      this.t = t;
      return bucket;
    }
  }, {
    key: 'event',
    value: function event(t, x) {
      this.events.push(['event', t, x]);
    }
  }, {
    key: 'end',
    value: function end(t, x) {
      this.events.push(['end', t, x]);
    }
  }, {
    key: 'error',
    value: function error(t, err) {
      this.events.push(['error', t, err]);
    }
  }]);

  return Sink;
}();