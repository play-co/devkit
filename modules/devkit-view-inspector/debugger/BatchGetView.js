// devkit's bluebird Promise
var Promise = devkit.Promise;

// batches get view requests:
//  - only sends requests once per tick
//  - dedups requests
//  - enforces only one simultaneous request
module.exports = Class(function () {
  this.init = function (requestFunc) {
    this._inflight = false;
    this._uids = [];
    this._pending = {};
    this._requestFunc = requestFunc;
  };

  // queue up a request for a given uid
  this.request = function (uid) {
    if (!(uid in this._pending)) {
      this._uids.push(uid);
      var pending = this._pending[uid] = {};
      pending.promise = new Promise(function (resolve, reject) {
        pending.resolve = resolve;
        pending.reject = reject;
      });
    }

    return this._pending[uid].promise;
  };

  // dispatch pending requests if not in flight
  this.dispatch = function () {
    if (this._uids.length && !this._inflight) {
      var uids = this._uids;
      this._inflight = true;
      this._uids = [];

      this._requestFunc({uids: uids})
        .bind(this)
        .timeout(10000)
        .then(function (res) {
          uids.forEach(function (uid) {
            var pending = this._pending[uid];
            delete this._pending[uid];
            if (uid in res) {
              pending.resolve(res[uid]);
            } else {
              pending.reject(res[uid]);
            }
          }, this);
        })
        .finally(function () {
          this._inflight = false;
        });
    }
  };
});
