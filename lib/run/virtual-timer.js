'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* global Promise */

var VirtualTimer = function () {
  function VirtualTimer() {
    _classCallCheck(this, VirtualTimer);

    this._now = 0;
    this._soon = 0;
    this._queue = [];
    this._id = 0;
  }

  _createClass(VirtualTimer, [{
    key: 'now',
    value: function now() {
      return this._now;
    }
  }, {
    key: 'setTimer',
    value: function setTimer(f, dt) {
      this._set();
      return this._insert(f, this._now + dt);
    }
  }, {
    key: 'clearTimer',
    value: function clearTimer(id) {
      this._remove(id);
    }
  }, {
    key: 'tick',
    value: function tick(dt) {
      var _this = this;

      this._soon += this._now + dt;
      if (!this._promise) {
        this._promise = new Promise(function (resolve) {
          _this._resolve = resolve;
        });
      }
      this._set();
      return this._promise;
    }
  }, {
    key: '_set',
    value: function _set() {
      var _this2 = this;

      if (this._timer) {
        clearTimeout(this._timer);
      }
      this._timer = setTimeout(function () {
        return _this2._run();
      }, 0);
    }
  }, {
    key: '_insert',
    value: function _insert(f, t) {
      var id = ++this._id;
      this._queue.push({ id: id, f: f, t: t });
      this._queue.sort(function (a, b) {
        return a.t - b.t;
      });
      return id;
    }
  }, {
    key: '_remove',
    value: function _remove(id) {
      var index = this._queue.findIndex(function (s) {
        return s.id === id;
      });
      if (index > -1) {
        this._queue.splice(index, 1);
      }
    }
  }, {
    key: '_run',
    value: function _run() {
      this._timer = null;
      var ran = false;
      if (this._queue.length > 0 && this._queue[0].t <= this._soon) {
        ran = true;
        var task = this._queue.shift();
        if (typeof task.f === 'function') {
          if (task.t > this._now) {
            this._now = task.t;
          }
          task.f();
        }
      }

      if (this._resolve && !ran) {
        if (!this._canTerminate) {
          // flush any pending events
          this._canTerminate = true;
          this._set();
          return;
        }

        var resolve = this._resolve;
        this._promise = null;
        this._resolve = null;
        resolve();
        return;
      }

      this._canTerminate = false;
      this._set();
    }
  }]);

  return VirtualTimer;
}();

exports.default = VirtualTimer;