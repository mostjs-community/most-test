// Logic borrowed from Drain: https://github.com/cujojs/most/blob/master/lib/runSource.js

export default class Observer
{
	constructor(event, end, error, disposable) {
		this._event = event;
		this._end = end;
		this._error = error;
		this._disposable = disposable;
		this.active = true;
	}

	event(t, x) {
		if(!this.active) {
			return;
		}
		this._event(t, x);
	}

	end(t, x) {
		if(!this.active) {
			return;
		}
		this.active = false;
		disposeThen(this._end, this._error, this._disposable, x);
	}

	error(t, e) {
		this.active = false;
		disposeThen(this._error, this._error, this._disposable, e);
	}
}

function disposeThen(end, error, disposable, x) {
	Promise.resolve(disposable.dispose()).then(function () {
		end(x);
	}, error);
}
