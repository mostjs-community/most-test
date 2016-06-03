'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TestEnv = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.run = run;

var _observer = require('./observer');

var _observer2 = _interopRequireDefault(_observer);

var _SettableDisposable = require('most/lib/disposable/SettableDisposable');

var _SettableDisposable2 = _interopRequireDefault(_SettableDisposable);

var _Scheduler = require('most/lib/scheduler/Scheduler');

var _Scheduler2 = _interopRequireDefault(_Scheduler);

var _virtualTimer = require('./virtual-timer');

var _virtualTimer2 = _interopRequireDefault(_virtualTimer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var TestEnv = exports.TestEnv = function () {
  function TestEnv(timer, sink) {
    _classCallCheck(this, TestEnv);

    this._timer = timer;
    this._sink = sink;
    this._t = 0;
  }

  _createClass(TestEnv, [{
    key: 'tick',
    value: function tick() {
      var _this = this;

      var t = arguments.length <= 0 || arguments[0] === undefined ? 1 : arguments[0];

      return this._timer.tick(t).then(function () {
        _this._t += t;
        var bucket = _this._sink.next(_this._t);
        return bucket.toObject();
      });
    }
  }, {
    key: 'now',
    get: function get() {
      return this._t;
    }
  }, {
    key: 'results',
    get: function get() {
      return this._sink.buckets.map(function (b) {
        return b.toObject();
      });
    }
  }]);

  return TestEnv;
}();

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

function run(_ref) {
  var source = _ref.source;

  var timer = new _virtualTimer2.default();
  var sink = new Sink();
  var testEnv = new TestEnv(timer, sink);
  var disposable = new _SettableDisposable2.default();
  var observer = new _observer2.default(sink.event.bind(sink), sink.end.bind(sink), sink.error.bind(sink), disposable);
  var scheduler = new _Scheduler2.default(timer);
  disposable.setDisposable(source.run(observer, scheduler));
  return testEnv;
}