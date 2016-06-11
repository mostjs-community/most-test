"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// Logic borrowed from Drain: https://github.com/cujojs/most/blob/master/lib/runSource.js

var Observer = function () {
	function Observer(event, end, error, disposable) {
		_classCallCheck(this, Observer);

		this._event = event;
		this._end = end;
		this._error = error;
		this._disposable = disposable;
		this.active = true;
	}

	_createClass(Observer, [{
		key: "event",
		value: function event(t, x) {
			if (!this.active) {
				return;
			}
			this._event(t, x);
		}
	}, {
		key: "end",
		value: function end(t, x) {
			if (!this.active) {
				return;
			}
			this.active = false;
			disposeThen(this._end, this._error, this._disposable, t, x);
		}
	}, {
		key: "error",
		value: function error(t, e) {
			this.active = false;
			disposeThen(this._error, this._error, this._disposable, t, e);
		}
	}]);

	return Observer;
}();

exports.default = Observer;


function disposeThen(end, error, disposable, t, x) {
	Promise.resolve(disposable.dispose()).then(function () {
		end(t, x);
	}, error.bind(null, t));
}